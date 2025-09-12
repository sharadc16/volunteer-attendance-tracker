/**
 * Mobile Status Enhancement
 * Improves status icon functionality and user experience on mobile devices
 */

class MobileStatusEnhancer {
    constructor() {
        this.init();
    }

    init() {
        this.setupStatusTooltips();
        this.setupStatusUpdates();
        this.setupMobileInteractions();
        this.optimizeForScreenSize();
        
        // Listen for screen size changes
        window.addEventListener('resize', () => this.optimizeForScreenSize());
    }

    setupStatusTooltips() {
        const scannerStatus = document.getElementById('scannerStatus');
        const syncStatus = document.getElementById('syncStatus');

        if (scannerStatus) {
            scannerStatus.addEventListener('click', () => {
                this.showStatusDetails('scanner');
            });
        }

        if (syncStatus) {
            syncStatus.addEventListener('click', () => {
                this.showStatusDetails('sync');
            });
        }
    }

    setupStatusUpdates() {
        // Enhanced status update methods with mobile-friendly messaging
        this.updateScannerStatus = (status, message) => {
            const scannerStatus = document.getElementById('scannerStatus');
            const indicator = scannerStatus?.querySelector('.scanner-indicator');
            const text = scannerStatus?.querySelector('.scanner-text');

            if (!scannerStatus) return;

            // Remove existing status classes
            scannerStatus.classList.remove('error', 'warning', 'ready');
            indicator?.classList.remove('error', 'warning', 'ready');

            // Add new status
            scannerStatus.classList.add(status);
            indicator?.classList.add(status);

            if (text) {
                text.textContent = message;
            }

            // Update tooltip
            const tooltips = {
                ready: 'Scanner is ready to scan badges',
                error: 'Scanner error - check connection',
                warning: 'Scanner initializing - please wait'
            };
            scannerStatus.setAttribute('data-tooltip', tooltips[status] || message);

            // Mobile-specific feedback
            if (window.innerWidth <= 768) {
                this.showMobileStatusFeedback(status, message);
            }
        };

        this.updateSyncStatus = (status, message) => {
            const syncStatus = document.getElementById('syncStatus');
            const indicator = syncStatus?.querySelector('.sync-status-indicator');
            const text = syncStatus?.querySelector('.sync-status-text');

            if (!syncStatus) return;

            // Remove existing status classes
            syncStatus.classList.remove('online', 'offline', 'syncing', 'error');
            indicator?.classList.remove('online', 'offline', 'syncing', 'error');

            // Add new status
            syncStatus.classList.add(status);
            indicator?.classList.add(status);

            if (text) {
                text.textContent = message;
            }

            // Update tooltip
            const tooltips = {
                online: 'Connected to Google Sheets',
                offline: 'Not connected to Google Sheets',
                syncing: 'Syncing data to Google Sheets',
                error: 'Sync error - check connection'
            };
            syncStatus.setAttribute('data-tooltip', tooltips[status] || message);
        };

        // Make these methods globally available
        window.updateScannerStatus = this.updateScannerStatus;
        window.updateSyncStatus = this.updateSyncStatus;
    }

    setupMobileInteractions() {
        // Add haptic feedback for mobile devices
        if ('vibrate' in navigator) {
            const statusElements = document.querySelectorAll('.scanner-status, .sync-status-compact');
            statusElements.forEach(element => {
                element.addEventListener('touchstart', () => {
                    navigator.vibrate(50); // Short vibration for feedback
                });
            });
        }

        // Add swipe gesture to refresh status
        let touchStartY = 0;
        const statusContainer = document.querySelector('.scanner-status-container');
        
        if (statusContainer) {
            statusContainer.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
            });

            statusContainer.addEventListener('touchend', (e) => {
                const touchEndY = e.changedTouches[0].clientY;
                const diff = touchStartY - touchEndY;

                // Swipe up to refresh
                if (diff > 50) {
                    this.refreshAllStatus();
                }
            });
        }
    }

    showStatusDetails(type) {
        if (window.innerWidth > 768) return; // Only for mobile

        const details = {
            scanner: {
                title: '📱 Scanner Status',
                content: this.getScannerStatusDetails()
            },
            sync: {
                title: '☁️ Sync Status', 
                content: this.getSyncStatusDetails()
            }
        };

        const detail = details[type];
        if (detail) {
            this.showMobileModal(detail.title, detail.content);
        }
    }

    getScannerStatusDetails() {
        const scannerStatus = document.getElementById('scannerStatus');
        const currentStatus = this.getCurrentStatus(scannerStatus);
        
        const statusInfo = {
            ready: {
                icon: '✅',
                message: 'Scanner is ready to scan volunteer badges',
                action: 'You can now scan badges or enter volunteer IDs manually'
            },
            error: {
                icon: '❌',
                message: 'Scanner is not working properly',
                action: 'Try refreshing the page or check your scanner connection'
            },
            warning: {
                icon: '⚠️',
                message: 'Scanner is initializing',
                action: 'Please wait a moment for the scanner to be ready'
            }
        };

        const info = statusInfo[currentStatus] || statusInfo.error;
        return `
            <div style="text-align: center; padding: 1rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">${info.icon}</div>
                <h4 style="margin-bottom: 0.5rem; color: #2c3e50;">${info.message}</h4>
                <p style="color: #666; margin-bottom: 1rem;">${info.action}</p>
                <button onclick="window.mobileStatusEnhancer.refreshAllStatus()" 
                        style="background: #3498db; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer;">
                    🔄 Refresh Status
                </button>
            </div>
        `;
    }

    getSyncStatusDetails() {
        const syncStatus = document.getElementById('syncStatus');
        const currentStatus = this.getCurrentStatus(syncStatus);
        
        const statusInfo = {
            online: {
                icon: '✅',
                message: 'Connected to Google Sheets',
                action: 'Data is being automatically synced to your spreadsheet'
            },
            offline: {
                icon: '❌',
                message: 'Not connected to Google Sheets',
                action: 'Data is stored locally. Connect to sync with your spreadsheet'
            },
            syncing: {
                icon: '🔄',
                message: 'Syncing data to Google Sheets',
                action: 'Please wait while data is being uploaded'
            },
            error: {
                icon: '⚠️',
                message: 'Sync error occurred',
                action: 'Check your internet connection and try again'
            }
        };

        const info = statusInfo[currentStatus] || statusInfo.offline;
        return `
            <div style="text-align: center; padding: 1rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">${info.icon}</div>
                <h4 style="margin-bottom: 0.5rem; color: #2c3e50;">${info.message}</h4>
                <p style="color: #666; margin-bottom: 1rem;">${info.action}</p>
                <div style="display: flex; gap: 0.5rem; justify-content: center;">
                    <button onclick="window.mobileStatusEnhancer.testSync()" 
                            style="background: #27ae60; color: white; border: none; padding: 0.75rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                        🔄 Test Sync
                    </button>
                    <button onclick="window.mobileStatusEnhancer.openSyncSettings()" 
                            style="background: #95a5a6; color: white; border: none; padding: 0.75rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                        ⚙️ Settings
                    </button>
                </div>
            </div>
        `;
    }

    getCurrentStatus(element) {
        if (!element) return 'error';
        
        const classList = element.classList;
        if (classList.contains('ready') || classList.contains('online')) return 'ready';
        if (classList.contains('syncing')) return 'syncing';
        if (classList.contains('warning')) return 'warning';
        if (classList.contains('error') || classList.contains('offline')) return 'error';
        
        return 'error';
    }

    showMobileModal(title, content) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('mobileStatusModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'mobileStatusModal';
            modal.innerHTML = `
                <div class="mobile-modal-overlay" onclick="window.mobileStatusEnhancer.closeMobileModal()">
                    <div class="mobile-modal-content" onclick="event.stopPropagation()">
                        <div class="mobile-modal-header">
                            <h3 id="mobileModalTitle"></h3>
                            <button onclick="window.mobileStatusEnhancer.closeMobileModal()" 
                                    style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">×</button>
                        </div>
                        <div class="mobile-modal-body" id="mobileModalBody"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                #mobileStatusModal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 10000;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }
                #mobileStatusModal.active {
                    opacity: 1;
                    visibility: visible;
                }
                .mobile-modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                }
                .mobile-modal-content {
                    background: white;
                    border-radius: 12px;
                    max-width: 400px;
                    width: 100%;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                }
                .mobile-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid #eee;
                }
                .mobile-modal-header h3 {
                    margin: 0;
                    color: #2c3e50;
                }
                .mobile-modal-body {
                    padding: 0;
                }
            `;
            document.head.appendChild(style);
        }

        // Update content
        document.getElementById('mobileModalTitle').textContent = title;
        document.getElementById('mobileModalBody').innerHTML = content;
        
        // Show modal
        modal.classList.add('active');
    }

    closeMobileModal() {
        const modal = document.getElementById('mobileStatusModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    showMobileStatusFeedback(status, message) {
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${status === 'ready' ? '#27ae60' : status === 'error' ? '#e74c3c' : '#f39c12'};
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: 500;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            animation: slideInDown 0.3s ease;
        `;
        feedback.textContent = message;
        
        document.body.appendChild(feedback);
        
        // Remove after 3 seconds
        setTimeout(() => {
            feedback.style.animation = 'slideOutUp 0.3s ease';
            setTimeout(() => feedback.remove(), 300);
        }, 3000);
    }

    optimizeForScreenSize() {
        const isSmallScreen = window.innerWidth <= 480;
        const isMobile = window.innerWidth <= 768;
        
        // Adjust status container layout
        const statusContainer = document.querySelector('.scanner-status-container');
        if (statusContainer) {
            if (isSmallScreen) {
                statusContainer.style.justifyContent = 'center';
            } else if (isMobile) {
                statusContainer.style.justifyContent = 'flex-end';
            }
        }
    }

    refreshAllStatus() {
        // Show loading feedback
        this.showMobileStatusFeedback('syncing', 'Refreshing status...');
        
        // Trigger status refresh (integrate with existing app logic)
        if (window.app && typeof window.app.refreshStatus === 'function') {
            window.app.refreshStatus();
        }
        
        // Fallback: simulate refresh
        setTimeout(() => {
            this.showMobileStatusFeedback('ready', 'Status refreshed');
        }, 1500);
    }

    testSync() {
        this.closeMobileModal();
        this.showMobileStatusFeedback('syncing', 'Testing sync connection...');
        
        // Trigger sync test (integrate with existing sync logic)
        if (window.syncManager && typeof window.syncManager.testConnection === 'function') {
            window.syncManager.testConnection();
        }
    }

    openSyncSettings() {
        this.closeMobileModal();
        // Navigate to settings or open sync configuration
        if (window.location.pathname.includes('settings.html')) {
            // Already on settings page, scroll to sync section
            const syncSection = document.querySelector('[data-section="sync"]');
            if (syncSection) {
                syncSection.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            // Navigate to settings page
            window.location.href = 'settings.html#sync';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mobileStatusEnhancer = new MobileStatusEnhancer();
});

// Add CSS animations
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes slideInDown {
        from {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutUp {
        from {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        to {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(animationStyles);