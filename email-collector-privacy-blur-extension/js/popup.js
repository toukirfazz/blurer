// Popup JavaScript for Email Collector & Privacy Blur Extension

document.addEventListener('DOMContentLoaded', function() {
    // Initialize popup
    initializePopup();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial data
    loadEmailData();
});

// Initialize popup components
function initializePopup() {
    // Set up tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update active tab content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            // Load tab-specific data
            if (tabName === 'analytics') {
                loadAnalytics();
            }
        });
    });
}

// Set up all event listeners
function setupEventListeners() {
    // Extract emails button
    document.getElementById('extractBtn').addEventListener('click', extractEmails);
    
    // Export CSV button
    document.getElementById('exportBtn').addEventListener('click', exportEmails);
    
    // Privacy blur toggle
    document.getElementById('blurToggle').addEventListener('change', togglePrivacyBlur);
    
    // Settings checkboxes
    document.getElementById('autoBlur').addEventListener('change', updateSettings);
    document.getElementById('autoExtract').addEventListener('change', updateSettings);
    document.getElementById('duplicateFilter').addEventListener('change', updateSettings);
    
    // Blur intensity slider
    const blurSlider = document.getElementById('blurIntensity');
    const blurValue = document.getElementById('blurValue');
    
    blurSlider.addEventListener('input', (e) => {
        const intensity = e.target.value;
        blurValue.textContent = intensity;
        updateBlurIntensity(intensity);
    });
    
    // Clear data button
    document.getElementById('clearDataBtn').addEventListener('click', clearAllData);
}

// Extract emails from current page
function extractEmails() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'extractEmails' }, (response) => {
            if (chrome.runtime.lastError) {
                showNotification('Error: Unable to extract emails from this page', 'error');
            } else {
                // Reload data after extraction
                setTimeout(loadEmailData, 1000);
            }
        });
    });
}

// Toggle privacy blur
function togglePrivacyBlur() {
    const enabled = document.getElementById('blurToggle').checked;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.runtime.sendMessage({
            action: 'toggleBlur',
            enabled: enabled
        });
        
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'toggleBlur',
            enabled: enabled
        });
    });
    
    // Update storage
    chrome.storage.sync.set({ privacyBlurEnabled: enabled });
}

// Update settings
function updateSettings(event) {
    const setting = event.target.id;
    const value = event.target.checked;
    
    chrome.storage.sync.set({ [setting]: value }, () => {
        showNotification(`${setting} ${value ? 'enabled' : 'disabled'}`, 'success');
    });
}

// Update blur intensity
function updateBlurIntensity(intensity) {
    chrome.storage.sync.set({ blurIntensity: parseInt(intensity) });
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateBlurIntensity',
            intensity: parseInt(intensity)
        });
    });
}

// Export emails to CSV
function exportEmails() {
    chrome.runtime.sendMessage({ action: 'exportEmails' }, (response) => {
        if (response.error) {
            showNotification(`Export failed: ${response.error}`, 'error');
        } else {
            showNotification(`Exported ${response.count} emails successfully`, 'success');
        }
    });
}

// Clear all data
function clearAllData() {
    if (confirm('Are you sure you want to clear all collected emails and data? This action cannot be undone.')) {
        chrome.runtime.sendMessage({ action: 'clearAllData' }, (response) => {
            if (response.error) {
                showNotification(`Clear failed: ${response.error}`, 'error');
            } else {
                showNotification('All data cleared successfully', 'success');
                loadEmailData(); // Reload to show empty state
            }
        });
    }
}

// Load email data from storage
function loadEmailData() {
    chrome.runtime.sendMessage({ action: 'getEmailData' }, (response) => {
        if (response.error) {
            console.error('Error loading email data:', response.error);
            return;
        }
        
        const { emails, emailStats, domainStats, settings } = response;
        
        // Update stats
        document.getElementById('totalEmails').textContent = emailStats.totalEmails || 0;
        document.getElementById('todayEmails').textContent = emailStats.todayEmails || 0;
        
        // Update email list
        updateEmailList(emails || []);
        
        // Update domain stats
        updateDomainStats(domainStats || {});
        
        // Update settings UI
        updateSettingsUI(settings || {});
    });
}

// Update email list display
function updateEmailList(emails) {
    const emailList = document.getElementById('emailList');
    
    if (emails.length === 0) {
        emailList.innerHTML = '<div class="email-item">No emails collected yet</div>';
        return;
    }
    
    // Show recent emails (last 10)
    const recentEmails = emails.slice(-10).reverse();
    
    emailList.innerHTML = recentEmails.map(emailObj => `
        <div class="email-item">
            <div style="font-weight: 500;">${emailObj.email}</div>
            <div style="font-size: 11px; color: #666; margin-top: 2px;">
                ${emailObj.domain} • ${new Date(emailObj.timestamp).toLocaleDateString()}
            </div>
        </div>
    `).join('');
}

// Update domain statistics
function updateDomainStats(domainStats) {
    const domainList = document.getElementById('domainList');
    
    if (Object.keys(domainStats).length === 0) {
        domainList.innerHTML = '<div class="domain-item"><span class="domain-name">No domains yet</span></div>';
        return;
    }
    
    // Sort domains by count
    const sortedDomains = Object.entries(domainStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5); // Top 5 domains
    
    domainList.innerHTML = sortedDomains.map(([domain, count]) => `
        <div class="domain-item">
            <span class="domain-name">${domain}</span>
            <span class="domain-count">${count}</span>
        </div>
    `).join('');
}

// Update settings UI
function updateSettingsUI(settings) {
    // Update checkboxes
    document.getElementById('blurToggle').checked = settings.privacyBlurEnabled || false;
    document.getElementById('autoBlur').checked = settings.autoBlur || false;
    document.getElementById('autoExtract').checked = settings.autoExtract || false;
    document.getElementById('duplicateFilter').checked = settings.duplicateFilter !== false; // Default true
    
    // Update blur intensity
    const intensity = settings.blurIntensity || 5;
    document.getElementById('blurIntensity').value = intensity;
    document.getElementById('blurValue').textContent = intensity;
}

// Load analytics data and create charts
function loadAnalytics() {
    chrome.runtime.sendMessage({ action: 'getEmailData' }, (response) => {
        if (response.error) {
            console.error('Error loading analytics data:', response.error);
            return;
        }
        
        const { emails } = response;
        createEmailChart(emails || []);
    });
}

// Create email collection chart
function createEmailChart(emails) {
    const ctx = document.getElementById('emailChart').getContext('2d');
    
    // Prepare data for last 7 days
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        last7Days.push(date.toDateString());
    }
    
    // Count emails per day
    const emailCounts = last7Days.map(date => {
        return emails.filter(email => email.date === date).length;
    });
    
    // Create chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days.map(date => {
                const d = new Date(date);
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }),
            datasets: [{
                label: 'Emails Collected',
                data: emailCounts,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: ${type === 'error' ? '#ff6b6b' : type === 'success' ? '#51cf66' : '#667eea'};
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
        to { opacity: 0; transform: translateX(100%); }
    }
`;
document.head.appendChild(style);

