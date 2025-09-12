/**
 * Status Unification Fix
 * Ensures all status elements appear in a single unified row
 * Fixes the issue where scanner-status-container and connectivityStatus appear separately
 */

class StatusUnificationFix {
    constructor() {
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.applyFix());
        } else {
            this.applyFix();
        }

        // Also apply fix after a delay to catch dynamically added elements
        setTimeout(() => this.applyFix(), 1000);
        setTimeout(() => this.applyFix(), 3000);
    }

    applyFix() {
        console.log('🔧 Applying status unification fix...');
        
        try {
            this.unifyStatusContainers();
            this.ensureSingleRowLayout();
            this.cleanupSeparateContainers();
            this.applyUnifiedStyling();
            
            console.log('✅ Status unification fix applied successfully');
        } catch (error) {
            console.error('❌ Error applying status unification fix:', error);
        }
    }

    unifyStatusContainers() {
        const mainContainer = document.querySelector('.scanner-status-container');
        if (!mainContainer) {
            console.warn('⚠️ Main scanner status container not found');
            return;
        }

        // Find all separate status containers
        const separateContainers = document.querySelectorAll('#connectivityStatus, .connectivity-status');
        
        separateContainers.forEach(container => {
            console.log(`🔄 Moving elements from ${container.id || container.className} to main container`);
            
            // Move all children to main container
            while (container.firstChild) {
                const child = container.firstChild;
                
                // Ensure proper styling for moved elements
                if (child.nodeType === Node.ELEMENT_NODE) {
                    this.applyUnifiedElementStyling(child);
                }
                
                mainContainer.appendChild(child);
            }
            
            // Remove the now-empty container
            container.remove();
        });

        // Find any orphaned status elements and move them
        const orphanedElements = document.querySelectorAll('.status-indicator, .status-details-btn');
        orphanedElements.forEach(element => {
            if (!element.closest('.scanner-status-container')) {
                console.log(`🔄 Moving orphaned element ${element.className} to main container`);
                this.applyUnifiedElementStyling(element);
                mainContainer.appendChild(element);
            }
        });
    }

    ensureSingleRowLayout() {
        const mainContainer = document.querySelector('.scanner-status-container');
        if (!mainContainer) return;

        // Force horizontal layout
        mainContainer.style.display = 'flex';
        mainContainer.style.flexDirection = 'row';
        mainContainer.style.alignItems = 'center';
        mainContainer.style.gap = '0.375rem';
        mainContainer.style.flexWrap = 'nowrap';
        mainContainer.style.justifyContent = 'flex-end';

        // Ensure all children are inline
        Array.from(mainContainer.children).forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE) {
                child.style.display = 'inline-flex';
                child.style.margin = '0';
                child.style.float = 'none';
                child.style.position = 'static';
            }
        });
    }

    cleanupSeparateContainers() {
        // Remove any remaining separate containers
        const containersToRemove = document.querySelectorAll('#connectivityStatus, .connectivity-status, .status-indicator-container');
        containersToRemove.forEach(container => {
            // Only remove if it's not the main container and is empty or redundant
            if (!container.closest('.scanner-status-container') && container.children.length === 0) {
                container.remove();
            }
        });
    }

    applyUnifiedElementStyling(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return;

        // Apply unified styling to status elements
        if (element.classList.contains('status-indicator') || 
            element.classList.contains('status-details-btn') ||
            element.classList.contains('scanner-status') ||
            element.classList.contains('sync-status-compact')) {
            
            // Ensure consistent styling
            element.style.display = 'inline-flex';
            element.style.alignItems = 'center';
            element.style.gap = '0.25rem';
            element.style.padding = '0.25rem 0.5rem';
            element.style.borderRadius = '12px';
            element.style.fontSize = '0.7rem';
            element.style.fontWeight = '500';
            element.style.whiteSpace = 'nowrap';
            element.style.margin = '0';
            element.style.minWidth = 'auto';
            element.style.flexShrink = '0';
            element.style.cursor = 'pointer';
            element.style.transition = 'all 0.2s ease';
            element.style.position = 'relative';
            element.style.border = '1px solid transparent';

            // Apply status-specific colors
            this.applyStatusColors(element);
        }
    }

    applyStatusColors(element) {
        // Determine status from classes
        let status = 'unknown';
        if (element.classList.contains('ready') || element.classList.contains('online') || element.classList.contains('success')) {
            status = 'ready';
        } else if (element.classList.contains('warning') || element.classList.contains('syncing')) {
            status = 'warning';
        } else if (element.classList.contains('error') || element.classList.contains('offline')) {
            status = 'error';
        }

        // Apply colors based on status
        switch (status) {
            case 'ready':
                element.style.background = '#d4edda';
                element.style.color = '#155724';
                element.style.borderColor = '#c3e6cb';
                break;
            case 'warning':
                element.style.background = '#fff3cd';
                element.style.color = '#856404';
                element.style.borderColor = '#ffeaa7';
                break;
            case 'error':
                element.style.background = '#f8d7da';
                element.style.color = '#721c24';
                element.style.borderColor = '#f5c6cb';
                break;
            default:
                element.style.background = '#e2e3e5';
                element.style.color = '#495057';
                element.style.borderColor = '#d1ecf1';
                break;
        }

        // Special styling for details button
        if (element.classList.contains('status-details-btn')) {
            element.style.background = '#e9ecef';
            element.style.color = '#495057';
            element.style.borderColor = '#ced4da';
            element.style.padding = '0.2rem 0.4rem';
        }

        // Fix status text color specifically (override white color from main CSS)
        const statusText = element.querySelector('.status-text, .scanner-text, .sync-status-text');
        if (statusText) {
            switch (status) {
                case 'ready':
                    statusText.style.color = '#155724';
                    break;
                case 'warning':
                    statusText.style.color = '#856404';
                    break;
                case 'error':
                    statusText.style.color = '#721c24';
                    break;
                default:
                    statusText.style.color = '#495057';
                    break;
            }
        }
    }

    // Public method to manually trigger fix
    static applyFix() {
        new StatusUnificationFix();
    }

    // Method to verify the fix worked
    verifyFix() {
        const mainContainer = document.querySelector('.scanner-status-container');
        const separateContainers = document.querySelectorAll('#connectivityStatus, .connectivity-status');
        const allStatusElements = document.querySelectorAll('.scanner-status, .sync-status-compact, .status-indicator, .status-details-btn');
        
        let elementsInMain = 0;
        allStatusElements.forEach(element => {
            if (element.closest('.scanner-status-container')) {
                elementsInMain++;
            }
        });

        const result = {
            success: separateContainers.length === 0 && elementsInMain === allStatusElements.length,
            separateContainers: separateContainers.length,
            totalElements: allStatusElements.length,
            elementsInMain: elementsInMain,
            message: separateContainers.length === 0 && elementsInMain === allStatusElements.length 
                ? '✅ All status elements unified in single row' 
                : '❌ Status elements still separated'
        };

        console.log('🔍 Status unification verification:', result);
        return result;
    }
}

// Auto-initialize
const statusUnificationFix = new StatusUnificationFix();

// Make globally available
window.StatusUnificationFix = StatusUnificationFix;
window.statusUnificationFix = statusUnificationFix;

// Override connectivity validator setup to prevent separate container creation
if (window.connectivityValidator) {
    const originalSetup = window.connectivityValidator.setupStatusIndicators;
    window.connectivityValidator.setupStatusIndicators = function() {
        console.log('🔧 Intercepting connectivity validator setup for unification');
        
        // Call original setup first
        if (originalSetup) {
            originalSetup.call(this);
        }
        
        // Then apply unification fix
        setTimeout(() => statusUnificationFix.applyFix(), 100);
    };
}

console.log('✅ Status unification fix loaded and ready');