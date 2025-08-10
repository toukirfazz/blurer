// Background Service Worker for Email Collector & Privacy Blur Extension

// Extension installation and update handling
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed/updated:', details.reason);
    
    // Initialize default settings
    const defaultSettings = {
        autoBlur: false,
        blurIntensity: 5,
        autoExtract: false,
        duplicateFilter: true,
        privacyBlurEnabled: false
    };
    
    chrome.storage.sync.set(defaultSettings, () => {
        console.log('Default settings initialized');
    });
    
    // Initialize email storage
    chrome.storage.local.set({
        emails: [],
        emailStats: {
            totalEmails: 0,
            todayEmails: 0,
            lastResetDate: new Date().toDateString()
        },
        domainStats: {}
    });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'extractEmails':
            handleEmailExtraction(request.emails, sender.tab);
            break;
            
        case 'toggleBlur':
            handleBlurToggle(request.enabled, sender.tab);
            break;
            
        case 'getEmailData':
            getEmailData(sendResponse);
            return true; // Keep message channel open for async response
            
        case 'exportEmails':
            exportEmailsToCSV(sendResponse);
            return true;
            
        case 'clearAllData':
            clearAllData(sendResponse);
            return true;
            
        default:
            console.log('Unknown action:', request.action);
    }
});

// Handle email extraction from content script
async function handleEmailExtraction(emails, tab) {
    if (!emails || emails.length === 0) {
        return;
    }
    
    try {
        // Get current settings
        const settings = await chrome.storage.sync.get(['duplicateFilter']);
        
        // Get existing emails
        const result = await chrome.storage.local.get(['emails', 'emailStats', 'domainStats']);
        const existingEmails = result.emails || [];
        const emailStats = result.emailStats || { totalEmails: 0, todayEmails: 0, lastResetDate: new Date().toDateString() };
        const domainStats = result.domainStats || {};
        
        // Filter duplicates if enabled
        let newEmails = emails;
        if (settings.duplicateFilter) {
            const existingEmailSet = new Set(existingEmails.map(e => e.email));
            newEmails = emails.filter(email => !existingEmailSet.has(email));
        }
        
        if (newEmails.length === 0) {
            return;
        }
        
        // Add metadata to new emails
        const emailsWithMetadata = newEmails.map(email => ({
            email: email,
            domain: email.split('@')[1] || 'unknown',
            url: tab.url,
            title: tab.title,
            timestamp: new Date().toISOString(),
            date: new Date().toDateString()
        }));
        
        // Update email list
        const updatedEmails = [...existingEmails, ...emailsWithMetadata];
        
        // Update stats
        const today = new Date().toDateString();
        if (emailStats.lastResetDate !== today) {
            emailStats.todayEmails = 0;
            emailStats.lastResetDate = today;
        }
        
        emailStats.totalEmails += newEmails.length;
        emailStats.todayEmails += newEmails.length;
        
        // Update domain stats
        emailsWithMetadata.forEach(emailObj => {
            const domain = emailObj.domain;
            domainStats[domain] = (domainStats[domain] || 0) + 1;
        });
        
        // Save to storage
        await chrome.storage.local.set({
            emails: updatedEmails,
            emailStats: emailStats,
            domainStats: domainStats
        });
        
        // Show notification
        chrome.action.setBadgeText({
            text: emailStats.totalEmails.toString(),
            tabId: tab.id
        });
        
        chrome.action.setBadgeBackgroundColor({
            color: '#667eea',
            tabId: tab.id
        });
        
        console.log(`Extracted ${newEmails.length} new emails from ${tab.url}`);
        
    } catch (error) {
        console.error('Error handling email extraction:', error);
    }
}

// Handle blur toggle
async function handleBlurToggle(enabled, tab) {
    try {
        await chrome.storage.sync.set({ privacyBlurEnabled: enabled });
        
        // Inject content script if needed and send toggle message
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (blurEnabled) => {
                if (window.privacyBlurController) {
                    window.privacyBlurController.toggleBlur(blurEnabled);
                }
            },
            args: [enabled]
        });
        
        console.log(`Privacy blur ${enabled ? 'enabled' : 'disabled'} for tab ${tab.id}`);
        
    } catch (error) {
        console.error('Error handling blur toggle:', error);
    }
}

// Get email data for popup
async function getEmailData(sendResponse) {
    try {
        const result = await chrome.storage.local.get(['emails', 'emailStats', 'domainStats']);
        const settings = await chrome.storage.sync.get(['privacyBlurEnabled', 'autoBlur', 'blurIntensity', 'autoExtract', 'duplicateFilter']);
        
        sendResponse({
            emails: result.emails || [],
            emailStats: result.emailStats || { totalEmails: 0, todayEmails: 0 },
            domainStats: result.domainStats || {},
            settings: settings
        });
    } catch (error) {
        console.error('Error getting email data:', error);
        sendResponse({ error: error.message });
    }
}

// Export emails to CSV
async function exportEmailsToCSV(sendResponse) {
    try {
        const result = await chrome.storage.local.get(['emails']);
        const emails = result.emails || [];
        
        if (emails.length === 0) {
            sendResponse({ error: 'No emails to export' });
            return;
        }
        
        // Create CSV content
        const headers = ['Email', 'Domain', 'Source URL', 'Page Title', 'Date Collected'];
        const csvContent = [
            headers.join(','),
            ...emails.map(email => [
                email.email,
                email.domain,
                `"${email.url}"`,
                `"${email.title}"`,
                new Date(email.timestamp).toLocaleDateString()
            ].join(','))
        ].join('\n');
        
        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        chrome.downloads.download({
            url: url,
            filename: `emails_export_${new Date().toISOString().split('T')[0]}.csv`,
            saveAs: true
        });
        
        sendResponse({ success: true, count: emails.length });
        
    } catch (error) {
        console.error('Error exporting emails:', error);
        sendResponse({ error: error.message });
    }
}

// Clear all data
async function clearAllData(sendResponse) {
    try {
        await chrome.storage.local.clear();
        
        // Reset to default values
        await chrome.storage.local.set({
            emails: [],
            emailStats: {
                totalEmails: 0,
                todayEmails: 0,
                lastResetDate: new Date().toDateString()
            },
            domainStats: {}
        });
        
        // Clear badge
        chrome.action.setBadgeText({ text: '' });
        
        sendResponse({ success: true });
        
    } catch (error) {
        console.error('Error clearing data:', error);
        sendResponse({ error: error.message });
    }
}

// Tab update listener for auto-extraction
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        try {
            const settings = await chrome.storage.sync.get(['autoExtract', 'autoBlur']);
            
            // Auto-extract emails if enabled
            if (settings.autoExtract) {
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        if (window.emailExtractor) {
                            window.emailExtractor.extractEmails();
                        }
                    }
                });
            }
            
            // Auto-blur if enabled
            if (settings.autoBlur) {
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        if (window.privacyBlurController) {
                            window.privacyBlurController.startBlurring();
                        }
                    }
                });
            }
            
        } catch (error) {
            console.error('Error in tab update handler:', error);
        }
    }
});

