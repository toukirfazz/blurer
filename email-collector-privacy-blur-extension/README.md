# Email Collector & Privacy Blur Chrome Extension

A premium Chrome extension that collects email addresses from webpages with analytics visualization and blurs female persons in images/videos for privacy protection.

## Features

### 📧 Email Collection
- **Smart Email Extraction**: Automatically finds and extracts email addresses from any webpage
- **Duplicate Filtering**: Intelligent filtering to avoid collecting duplicate emails
- **Domain Analytics**: Track email collection statistics by domain
- **CSV Export**: Export collected emails to CSV format for external use
- **Real-time Highlighting**: Visual highlighting of detected emails on pages

### 🔒 Privacy Blur
- **AI-Powered Detection**: Uses face-api.js for accurate person detection
- **Gender-Specific Blurring**: Specifically blurs female persons in images and videos
- **Real-time Processing**: Works on both static images and video streams
- **Adjustable Intensity**: Customizable blur intensity (1-10 levels)
- **Auto-blur Option**: Automatically blur content on page load

### 📊 Analytics Dashboard
- **Visual Charts**: Interactive charts showing email collection trends over time
- **Domain Statistics**: Top domains with email collection counts
- **Daily Tracking**: Track emails collected per day with 7-day history
- **Collection Metrics**: Total emails and daily collection counters

### ⚙️ Premium Interface
- **Modern Design**: Gradient backgrounds with glassmorphism effects
- **Responsive Layout**: Works perfectly on all screen sizes
- **Smooth Animations**: Polished transitions and micro-interactions
- **Intuitive Navigation**: Tab-based interface for easy access to features

## Installation

### Method 1: Developer Mode (Recommended for Testing)

1. **Download the Extension**
   - Download and extract the extension files to a folder on your computer

2. **Enable Developer Mode**
   - Open Chrome and go to `chrome://extensions/`
   - Toggle "Developer mode" in the top-right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the folder containing the extension files
   - The extension should now appear in your extensions list

4. **Pin the Extension**
   - Click the puzzle piece icon in Chrome's toolbar
   - Find "Email Collector & Privacy Blur" and click the pin icon

### Method 2: Chrome Web Store (Future Release)
- The extension will be available on the Chrome Web Store after review and approval

## Usage Guide

### Getting Started

1. **Open the Extension**
   - Click the extension icon in your Chrome toolbar
   - The popup interface will open with three main tabs

2. **Email Collection**
   - Navigate to any webpage with email addresses
   - Click "Extract Emails" in the extension popup
   - View collected emails in the "Emails" tab
   - Export data using the "Export CSV" button

3. **Privacy Blur**
   - Toggle the "Privacy Blur" switch in the header
   - The extension will automatically detect and blur female persons
   - Adjust blur intensity in the Settings tab
   - Enable auto-blur for automatic processing

### Interface Overview

#### Emails Tab
- **Stats Cards**: Shows total emails and today's collection count
- **Action Buttons**: Extract emails and export CSV functionality
- **Recent Emails**: List of recently collected email addresses with metadata

#### Analytics Tab
- **Collection Chart**: 7-day trend chart of email collection activity
- **Top Domains**: Most frequent domains with collection counts

#### Settings Tab
- **Privacy Settings**: Auto-blur toggle and blur intensity slider
- **Email Settings**: Auto-extraction and duplicate filtering options
- **Data Management**: Clear all collected data option

### Advanced Features

#### Auto-Extraction
- Enable in Settings to automatically extract emails when pages load
- Useful for bulk email collection across multiple sites

#### Auto-Blur
- Enable in Settings to automatically blur content on page load
- Provides consistent privacy protection while browsing

#### Blur Intensity Control
- Adjust the blur strength from 1 (light) to 10 (heavy)
- Changes apply immediately to currently blurred content

## Technical Details

### Architecture
- **Manifest V3**: Uses the latest Chrome extension architecture
- **Content Scripts**: Inject functionality into webpages
- **Background Service Worker**: Handles data storage and cross-tab communication
- **Popup Interface**: Premium-styled user interface with Chart.js integration

### AI Models
- **Face Detection**: face-api.js with TinyFaceDetector
- **Gender Classification**: Age and gender recognition models
- **Performance Optimized**: Efficient processing with minimal impact on browsing

### Data Storage
- **Local Storage**: Emails and settings stored locally in Chrome
- **Privacy First**: No data sent to external servers
- **Sync Settings**: Extension settings sync across Chrome instances

### Browser Compatibility
- **Chrome**: Fully supported (Manifest V3)
- **Edge**: Compatible with Chromium-based Edge
- **Other Browsers**: May require adaptation for different extension APIs

## Privacy & Security

### Data Handling
- All email data is stored locally on your device
- No data is transmitted to external servers
- Face detection processing happens entirely in your browser

### Permissions
- **activeTab**: Access current tab for email extraction and blurring
- **storage**: Store collected emails and user settings
- **scripting**: Inject content scripts for functionality
- **tabs**: Manage tab-specific features

### Security Features
- Content Security Policy (CSP) compliant
- No external script execution
- Secure data storage using Chrome's storage APIs

## Troubleshooting

### Common Issues

**Extension not working on some sites**
- Some websites may block content scripts
- Try refreshing the page after installing the extension
- Check if the site has strict Content Security Policies

**Face detection not working**
- Ensure you have a stable internet connection (for loading AI models)
- Some images may not be suitable for face detection
- Try adjusting the blur intensity if detection seems inaccurate

**Emails not being extracted**
- Make sure the page has finished loading completely
- Some emails may be dynamically loaded and require scrolling
- Check if emails are in images (not supported by text extraction)

**Performance issues**
- Disable auto-blur on resource-intensive pages
- Lower the blur intensity for better performance
- Clear collected data if storage becomes large

### Support
For technical support or feature requests, please check the extension's support channels or documentation.

## Development

### Project Structure
```
chrome-extension-project/
├── manifest.json          # Extension manifest
├── popup.html            # Popup interface
├── background.js         # Service worker
├── content.js           # Content script
├── content.css          # Content styles
├── css/
│   └── popup.css        # Popup styles
├── js/
│   └── popup.js         # Popup functionality
├── icons/               # Extension icons
└── README.md           # Documentation
```

### Building from Source
1. Clone or download the source code
2. No build process required - pure HTML/CSS/JavaScript
3. Load directly in Chrome developer mode

### Contributing
- Follow the existing code style and structure
- Test thoroughly on multiple websites
- Ensure privacy and security best practices
- Document any new features or changes

## License

This extension is provided as-is for educational and personal use. Please respect privacy and legal requirements when collecting email addresses.

## Changelog

### Version 1.0.0
- Initial release
- Email extraction with regex patterns
- Face detection and gender-specific blurring
- Premium UI with analytics dashboard
- Local data storage and CSV export
- Comprehensive settings and customization options
