// Content Script for Email Collector & Privacy Blur Extension

(function() {
    'use strict';
    
    // Email extraction functionality
    class EmailExtractor {
        constructor() {
            this.emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
            this.extractedEmails = new Set();
            this.isExtracting = false;
        }
        
        // Extract emails from the current page
        extractEmails() {
            if (this.isExtracting) return;
            this.isExtracting = true;
            
            try {
                const emails = this.findEmailsInPage();
                
                if (emails.length > 0) {
                    // Send emails to background script
                    chrome.runtime.sendMessage({
                        action: 'extractEmails',
                        emails: emails
                    });
                    
                    // Highlight emails on page
                    this.highlightEmails();
                    
                    // Show notification
                    this.showNotification(`Found ${emails.length} email${emails.length > 1 ? 's' : ''}`);
                } else {
                    this.showNotification('No emails found on this page');
                }
            } catch (error) {
                console.error('Error extracting emails:', error);
                this.showNotification('Error extracting emails');
            } finally {
                this.isExtracting = false;
            }
        }
        
        // Find all emails in the page content
        findEmailsInPage() {
            const emails = [];
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => {
                        // Skip script and style elements
                        const parent = node.parentElement;
                        if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );
            
            let node;
            while (node = walker.nextNode()) {
                const text = node.textContent;
                const matches = text.match(this.emailRegex);
                
                if (matches) {
                    matches.forEach(email => {
                        const cleanEmail = email.toLowerCase().trim();
                        if (!this.extractedEmails.has(cleanEmail)) {
                            this.extractedEmails.add(cleanEmail);
                            emails.push(cleanEmail);
                        }
                    });
                }
            }
            
            // Also check for emails in href attributes
            const links = document.querySelectorAll('a[href^="mailto:"]');
            links.forEach(link => {
                const email = link.href.replace('mailto:', '').split('?')[0].toLowerCase().trim();
                if (email && !this.extractedEmails.has(email)) {
                    this.extractedEmails.add(email);
                    emails.push(email);
                }
            });
            
            return emails;
        }
        
        // Highlight emails on the page
        highlightEmails() {
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => {
                        const parent = node.parentElement;
                        if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );
            
            const nodesToReplace = [];
            let node;
            
            while (node = walker.nextNode()) {
                const text = node.textContent;
                if (this.emailRegex.test(text)) {
                    nodesToReplace.push(node);
                }
            }
            
            nodesToReplace.forEach(textNode => {
                const parent = textNode.parentElement;
                if (parent && !parent.classList.contains('email-highlight')) {
                    const highlightedHTML = textNode.textContent.replace(
                        this.emailRegex,
                        '<span class="email-highlight">$&</span>'
                    );
                    
                    const wrapper = document.createElement('span');
                    wrapper.innerHTML = highlightedHTML;
                    parent.replaceChild(wrapper, textNode);
                }
            });
        }
        
        // Show notification to user
        showNotification(message) {
            // Remove existing notification
            const existing = document.querySelector('.extension-notification');
            if (existing) {
                existing.remove();
            }
            
            const notification = document.createElement('div');
            notification.className = 'extension-notification';
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        }
    }
    
    // Privacy blur functionality
    class PrivacyBlurController {
        constructor() {
            this.isBlurring = false;
            this.blurIntensity = 5;
            this.processedImages = new WeakSet();
            this.processedVideos = new WeakSet();
            this.observer = null;
            this.faceDetectionModel = null;
            this.isModelLoaded = false;
        }
        
        // Initialize face detection model
        async initializeModel() {
            if (this.isModelLoaded) return;
            
            try {
                // Load face-api.js from CDN
                if (!window.faceapi) {
                    await this.loadScript('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js');
                }
                
                // Load models
                await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights');
                await faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights');
                await faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights');
                await faceapi.nets.ageGenderNet.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights');
                
                this.isModelLoaded = true;
                console.log('Face detection model loaded successfully');
            } catch (error) {
                console.error('Error loading face detection model:', error);
                // Fallback to simple blur without gender detection
                this.isModelLoaded = false;
            }
        }
        
        // Load external script
        loadScript(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        
        // Toggle blur functionality
        async toggleBlur(enabled) {
            this.isBlurring = enabled;
            
            if (enabled) {
                await this.initializeModel();
                this.startBlurring();
            } else {
                this.stopBlurring();
            }
        }
        
        // Start blurring process
        startBlurring() {
            if (!this.isBlurring) return;
            
            // Process existing images and videos
            this.processExistingMedia();
            
            // Set up observer for new media
            this.setupMediaObserver();
        }
        
        // Stop blurring process
        stopBlurring() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            
            // Remove blur effects
            this.removeAllBlurEffects();
        }
        
        // Process existing media on the page
        processExistingMedia() {
            const images = document.querySelectorAll('img');
            const videos = document.querySelectorAll('video');
            
            images.forEach(img => this.processImage(img));
            videos.forEach(video => this.processVideo(video));
        }
        
        // Set up mutation observer for new media
        setupMediaObserver() {
            this.observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if the node itself is media
                            if (node.tagName === 'IMG') {
                                this.processImage(node);
                            } else if (node.tagName === 'VIDEO') {
                                this.processVideo(node);
                            }
                            
                            // Check for media within the node
                            const images = node.querySelectorAll && node.querySelectorAll('img');
                            const videos = node.querySelectorAll && node.querySelectorAll('video');
                            
                            if (images) images.forEach(img => this.processImage(img));
                            if (videos) videos.forEach(video => this.processVideo(video));
                        }
                    });
                });
            });
            
            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        // Process individual image
        async processImage(img) {
            if (this.processedImages.has(img) || !this.isBlurring) return;
            
            this.processedImages.add(img);
            
            try {
                // Wait for image to load
                if (!img.complete) {
                    await new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = resolve;
                    });
                }
                
                if (this.isModelLoaded) {
                    await this.detectAndBlurFaces(img);
                } else {
                    // Fallback: blur all images (simple approach)
                    this.applySimpleBlur(img);
                }
            } catch (error) {
                console.error('Error processing image:', error);
            }
        }
        
        // Process individual video
        async processVideo(video) {
            if (this.processedVideos.has(video) || !this.isBlurring) return;
            
            this.processedVideos.add(video);
            
            try {
                if (this.isModelLoaded) {
                    this.setupVideoBlurring(video);
                } else {
                    // Fallback: blur entire video
                    this.applySimpleBlur(video);
                }
            } catch (error) {
                console.error('Error processing video:', error);
            }
        }
        
        // Detect and blur faces in image
        async detectAndBlurFaces(img) {
            try {
                const detections = await faceapi
                    .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withAgeAndGender();
                
                if (detections.length > 0) {
                    // Filter for female faces
                    const femaleFaces = detections.filter(detection => 
                        detection.gender === 'female' && detection.genderProbability > 0.6
                    );
                    
                    if (femaleFaces.length > 0) {
                        this.blurFacesInImage(img, femaleFaces);
                    }
                }
            } catch (error) {
                console.error('Error in face detection:', error);
                // Fallback to simple blur
                this.applySimpleBlur(img);
            }
        }
        
        // Blur specific faces in image
        blurFacesInImage(img, faces) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            
            // Draw original image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Apply blur to face regions
            faces.forEach(face => {
                const box = face.detection.box;
                const scaleX = canvas.width / img.width;
                const scaleY = canvas.height / img.height;
                
                const x = box.x * scaleX;
                const y = box.y * scaleY;
                const width = box.width * scaleX;
                const height = box.height * scaleY;
                
                // Create blurred region
                ctx.filter = `blur(${this.blurIntensity}px)`;
                ctx.drawImage(img, x, y, width, height, x, y, width, height);
                ctx.filter = 'none';
            });
            
            // Replace image source
            img.src = canvas.toDataURL();
        }
        
        // Setup video blurring with real-time processing
        setupVideoBlurring(video) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.className = 'privacy-blur-canvas';
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '10';
            
            // Position canvas over video
            const videoContainer = video.parentElement;
            if (videoContainer) {
                videoContainer.style.position = 'relative';
                videoContainer.appendChild(canvas);
            }
            
            // Process video frames
            const processFrame = async () => {
                if (!this.isBlurring || video.paused || video.ended) return;
                
                try {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    const detections = await faceapi
                        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                        .withAgeAndGender();
                    
                    // Clear canvas
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    // Draw blur overlays for female faces
                    detections.forEach(detection => {
                        if (detection.gender === 'female' && detection.genderProbability > 0.6) {
                            const box = detection.detection.box;
                            
                            ctx.filter = `blur(${this.blurIntensity}px)`;
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                            ctx.fillRect(box.x, box.y, box.width, box.height);
                            ctx.filter = 'none';
                        }
                    });
                    
                    requestAnimationFrame(processFrame);
                } catch (error) {
                    console.error('Error processing video frame:', error);
                }
            };
            
            video.addEventListener('play', () => {
                if (this.isBlurring) {
                    processFrame();
                }
            });
        }
        
        // Apply simple blur (fallback)
        applySimpleBlur(element) {
            element.classList.add('privacy-blur-female');
            element.style.filter = `blur(${this.blurIntensity}px)`;
        }
        
        // Remove all blur effects
        removeAllBlurEffects() {
            const blurredElements = document.querySelectorAll('.privacy-blur-female');
            blurredElements.forEach(element => {
                element.classList.remove('privacy-blur-female');
                element.style.filter = '';
            });
            
            const canvases = document.querySelectorAll('.privacy-blur-canvas');
            canvases.forEach(canvas => canvas.remove());
        }
        
        // Update blur intensity
        updateBlurIntensity(intensity) {
            this.blurIntensity = intensity;
            
            // Update existing blurred elements
            const blurredElements = document.querySelectorAll('.privacy-blur-female');
            blurredElements.forEach(element => {
                element.style.filter = `blur(${intensity}px)`;
            });
        }
    }
    
    // Initialize components
    window.emailExtractor = new EmailExtractor();
    window.privacyBlurController = new PrivacyBlurController();
    
    // Listen for messages from popup and background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
            case 'extractEmails':
                window.emailExtractor.extractEmails();
                break;
                
            case 'toggleBlur':
                window.privacyBlurController.toggleBlur(request.enabled);
                break;
                
            case 'updateBlurIntensity':
                window.privacyBlurController.updateBlurIntensity(request.intensity);
                break;
        }
    });
    
    // Auto-initialize based on settings
    chrome.storage.sync.get(['autoExtract', 'autoBlur', 'privacyBlurEnabled'], (result) => {
        if (result.autoExtract) {
            setTimeout(() => {
                window.emailExtractor.extractEmails();
            }, 2000); // Wait for page to fully load
        }
        
        if (result.autoBlur || result.privacyBlurEnabled) {
            window.privacyBlurController.toggleBlur(true);
        }
    });
    
})();

