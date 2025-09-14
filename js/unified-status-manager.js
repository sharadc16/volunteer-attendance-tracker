/**
 * Unified Status Manager
 * Manages all status indicators across the application with consistent styling and tooltips
 */

class UnifiedStatusManager {
    constructor() {
        this.statusElements = new Map();
        this.init();
    }

    init() {
        this.setupStatusElements();
        this.setupTooltips();
        this.setupMobileOptimizations();
        this.observeStatusChanges();
        
        // Listen for screen size changes
        window.addEventListener('resize', () => this.handleResize());
        
        // Make globally available
        window.unifiedStatusManager = this;
    }

    setupStatusElements() {
        // Register only the essential status elements (simplified setup)
        this.registerStatusElement('syncStatus', 'sync', {
            online: '☁️ Sync: Connected to Google Sheets',
            offline: '☁️ Sync: Not connected to Google Sheets',
            syncing: '☁️ Sync: Syncing data to Google Sheets',
            error: '☁️ Sync: Error - check connection'
        });

        // Register details button if it exists
        const detailsBtn = document.getElementById('statusDetailsBtn');
        if (detailsBtn) {
            this.registerStatusElement('statusDetailsBtn', 'details', {
                default: '📋 Details: Click for system status information'
            });
        }

        // Look for any other status elements that might be added dynamically
        this.findAdditionalStatusElements();
        
        console.log('🎯 Simplified status manager setup - sync status and details button only');
    }

    registerStatusElement(id, type, tooltips) {
        const element = document.getElementById(id);
        if (element) {
            this.statusElements.set(id, {
                element,
                type,
                tooltips,
                currentStatus: this.getCurrentStatus(element)
            });
            
            // Ensure proper tooltip attribute
            this.updateTooltip(id);
        }
    }

    findAdditionalStatusElements() {
        // Find status indicators that might be added by other scripts
        const additionalSelectors = [
            '.status-indicator',
            '.status-details-btn',
            '.status-light',
            '[class*="status-"]'
        ];

        additionalSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                if (!element.id) {
                    element.id = `status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                }
                
                if (!this.statusElements.has(element.id)) {
                    // Determine type based on element
                    let type = 'generic';
                    if (element.id === 'overallStatusIndicator') type = 'system';
                    if (element.id === 'statusDetailsBtn') type = 'details';
                    
                    this.registerStatusElement(element.id, type, {
                        success: type === 'system' ? 'ℹ️ System: All systems operational' : 'ℹ️ Status: System operational',
                        warning: type === 'system' ? 'ℹ️ System: Warning condition detected' : 'ℹ️ Status: Warning condition detected',
                        error: type === 'system' ? 'ℹ️ System: Error condition detected' : 'ℹ️ Status: Error condition detected',
                        unknown: type === 'system' ? 'ℹ️ System: Checking system status' : 'ℹ️ Status: Status unknown',
                        disabled: type === 'system' ? 'ℹ️ System: System disabled' : 'ℹ️ Status: System disabled'
                    });
                }
            });
        });
    }

    getCurrentStatus(element) {
        const classList = Array.from(element.classList);
        
        // Check for status classes
        if (classList.includes('ready') || classList.includes('online') || classList.includes('success')) return 'ready';
        if (classList.includes('syncing') || classList.includes('warning')) return 'warning';
        if (classList.includes('error') || classList.includes('offline')) return 'error';
        if (classList.includes('unknown')) return 'unknown';
        if (classList.includes('disabled')) return 'disabled';
        
        // Check child elements for status
        const indicator = element.querySelector('.scanner-indicator, .sync-status-indicator, .status-light');
        if (indicator) {
            const indicatorClasses = Array.from(indicator.classList);
            if (indicatorClasses.includes('ready') || indicatorClasses.includes('online') || indicatorClasses.includes('success')) return 'ready';
            if (indicatorClasses.includes('syncing') || indicatorClasses.includes('warning')) return 'warning';
            if (indicatorClasses.includes('error') || indicatorClasses.includes('offline')) return 'error';
            if (indicatorClasses.includes('unknown')) return 'unknown';
            if (indicatorClasses.includes('disabled')) return 'disabled';
        }
        
        return 'unknown';
    }

    updateTooltip(id) {
        const statusInfo = this.statusElements.get(id);
        if (!statusInfo) return;

        const { element, tooltips, currentStatus } = statusInfo;
        const tooltip = tooltips[currentStatus] || tooltips.unknown || 'Status information';
        
        element.setAttribute('title', tooltip);
        element.setAttribute('aria-label', tooltip);
    }

    updateStatus(id, newStatus, customMessage = null) {
        const statusInfo = this.statusElements.get(id);
        if (!statusInfo) return;

        const { element, type, tooltips } = statusInfo;
        
        // Update element classes
        this.clearStatusClasses(element);
        element.classList.add(newStatus);
        
        // Update indicator classes
        const indicator = element.querySelector('.scanner-indicator, .sync-status-indicator, .status-light');
        if (indicator) {
            this.clearStatusClasses(indicator);
            indicator.classList.add(newStatus);
        }

        // Update text content
        const textElement = element.querySelector('.scanner-text, .sync-status-text, .status-text');
        if (textElement) {
            const statusTexts = {
                scanner: {
                    ready: 'Scanner',
                    warning: 'Init...',
                    error: 'Error'
                },
                sync: {
                    online: 'Sync',
                    offline: 'Sync',
                    syncing: 'Sync',
                    error: 'Sync'
                },
                generic: {
                    success: 'OK',
                    warning: 'Warn',
                    error: 'Error',
                    unknown: '?',
                    disabled: 'Off'
                }
            };
            
            const typeTexts = statusTexts[type] || statusTexts.generic;
            textElement.textContent = customMessage || typeTexts[newStatus] || typeTexts.unknown;
        }

        // Update stored status
        statusInfo.currentStatus = newStatus;
        
        // Update tooltip
        if (customMessage) {
            const statusIcons = {
                scanner: '📱',
                sync: '☁️',
                generic: 'ℹ️'
            };
            const icon = statusIcons[type] || statusIcons.generic;
            element.setAttribute('title', `${icon} ${customMessage}`);
        } else {
            this.updateTooltip(id);
        }

        // Only show mobile feedback for errors or important changes, not routine status updates
        if (window.innerWidth <= 768 && (newStatus === 'error' || customMessage)) {
            this.showMobileStatusFeedback(newStatus, customMessage || tooltips[newStatus]);
        }
    }

    clearStatusClasses(element) {
        const statusClasses = ['ready', 'warning', 'error', 'online', 'offline', 'syncing', 'success', 'unknown', 'disabled'];
        statusClasses.forEach(cls => element.classList.remove(cls));
    }

    setupTooltips() {
        // Enhanced tooltip system for mobile
        document.addEventListener('touchstart', (e) => {
            const statusElement = e.target.closest('.scanner-status, .sync-status-compact, .status-indicator, .status-details-btn');
            if (statusElement && window.innerWidth <= 768) {
                this.showMobileTooltip(statusElement);
            }
        });

        // Hide tooltips on touch outside
        document.addEventListener('touchstart', (e) => {
            if (!e.target.closest('.mobile-tooltip')) {
                this.hideMobileTooltips();
            }
        });
    }

    showMobileTooltip(element) {
        this.hideMobileTooltips();
        
        const tooltip = element.getAttribute('title') || element.getAttribute('aria-label');
        if (!tooltip) return;

        const tooltipEl = document.createElement('div');
        tooltipEl.className = 'mobile-tooltip';
        tooltipEl.textContent = tooltip;
        tooltipEl.style.cssText = `
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 0.5rem;
            border-radius: 6px;
            font-size: 0.75rem;
            white-space: nowrap;
            z-index: 1000;
            pointer-events: none;
            animation: fadeIn 0.2s ease;
        `;

        element.style.position = 'relative';
        element.appendChild(tooltipEl);

        // Auto-hide after 3 seconds
        setTimeout(() => this.hideMobileTooltips(), 3000);
    }

    hideMobileTooltips() {
        document.querySelectorAll('.mobile-tooltip').forEach(tooltip => {
            tooltip.remove();
        });
    }

    setupMobileOptimizations() {
        // Ensure all status containers are properly aligned
        this.alignStatusContainers();
        
        // Add mobile-specific event handlers
        this.setupMobileInteractions();
    }

    alignStatusContainers() {
        // Find all status containers and ensure they're in the main container
        const mainContainer = document.querySelector('.scanner-status-container');
        if (!mainContainer) return;

        // Remove any separate connectivity status containers
        const separateContainers = document.querySelectorAll('#connectivityStatus, .connectivity-status');
        separateContainers.forEach(container => {
            // Move children to main container before removing
            while (container.firstChild) {
                mainContainer.appendChild(container.firstChild);
            }
            container.remove();
        });

        // Look for orphaned status elements and move them to main container
        const orphanedElements = document.querySelectorAll('.status-indicator, .status-details-btn');
        orphanedElements.forEach(element => {
            if (!element.closest('.scanner-status-container')) {
                mainContainer.appendChild(element);
            }
        });

        // Ensure main container has proper styling
        mainContainer.style.display = 'flex';
        mainContainer.style.flexDirection = 'row';
        mainContainer.style.alignItems = 'center';
        mainContainer.style.gap = '0.375rem';
        mainContainer.style.flexWrap = 'nowrap';
    }

    setupMobileInteractions() {
        // Add haptic feedback for mobile devices
        if ('vibrate' in navigator) {
            this.statusElements.forEach(({ element }) => {
                element.addEventListener('touchstart', () => {
                    navigator.vibrate(50);
                });
            });
        }

        // Add tap-to-refresh functionality
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

    observeStatusChanges() {
        // Watch for dynamic status changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const element = mutation.target;
                    const id = element.id;
                    
                    if (this.statusElements.has(id)) {
                        const newStatus = this.getCurrentStatus(element);
                        const statusInfo = this.statusElements.get(id);
                        
                        if (newStatus !== statusInfo.currentStatus) {
                            statusInfo.currentStatus = newStatus;
                            this.updateTooltip(id);
                        }
                    }
                }
            });
        });

        // Observe all status elements
        this.statusElements.forEach(({ element }) => {
            observer.observe(element, { attributes: true, attributeFilter: ['class'] });
        });
    }

    showMobileStatusFeedback(status, message) {
        if (window.innerWidth > 768) return;

        const colors = {
            ready: '#28a745',
            warning: '#ffc107',
            error: '#dc3545',
            unknown: '#6c757d'
        };

        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[status] || colors.unknown};
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: 500;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            animation: slideInDown 0.3s ease;
            max-width: 90vw;
            text-align: center;
        `;
        feedback.textContent = message;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.style.animation = 'slideOutUp 0.3s ease';
            setTimeout(() => feedback.remove(), 300);
        }, 3000);
    }

    refreshAllStatus() {
        this.showMobileStatusFeedback('warning', 'Refreshing all status...');
        
        // Trigger refresh for all registered status elements
        this.statusElements.forEach((statusInfo, id) => {
            // Simulate refresh - in real app, this would call actual status check functions
            setTimeout(() => {
                const currentStatus = this.getCurrentStatus(statusInfo.element);
                this.updateTooltip(id);
            }, 500);
        });

        setTimeout(() => {
            this.showMobileStatusFeedback('ready', 'Status refreshed');
        }, 1500);
    }

    handleResize() {
        // Realign status containers on resize
        this.alignStatusContainers();
        
        // Update mobile optimizations
        if (window.innerWidth <= 768) {
            this.hideMobileTooltips();
        }
    }

    // Public API methods
    getStatus(id) {
        const statusInfo = this.statusElements.get(id);
        return statusInfo ? statusInfo.currentStatus : null;
    }

    getAllStatuses() {
        const statuses = {};
        this.statusElements.forEach((statusInfo, id) => {
            statuses[id] = statusInfo.currentStatus;
        });
        return statuses;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new UnifiedStatusManager();
});

// Add required CSS animations
const unifiedAnimationStyles = document.createElement('style');
unifiedAnimationStyles.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    
    @keyframes slideInDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    @keyframes slideOutUp {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
    }
`;
document.head.appendChild(unifiedAnimationStyles);