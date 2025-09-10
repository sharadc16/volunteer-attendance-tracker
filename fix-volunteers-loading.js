/**
 * Fix for Volunteers Directory Loading Issue
 * This script addresses the "Loading volunteers..." stuck state
 */

(function () {
    'use strict';

    console.log('🔧 Loading volunteers directory fix...');

    // Wait for app to be ready
    function waitForApp() {
        return new Promise((resolve) => {
            if (window.app && window.app.isInitialized) {
                resolve();
                return;
            }

            const checkInterval = setInterval(() => {
                if (window.app && window.app.isInitialized) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 10000);
        });
    }

    // Enhanced updateVolunteersView with better error handling
    async function fixedUpdateVolunteersView() {
        console.log('🔄 Running fixed updateVolunteersView...');

        const volunteersGrid = document.getElementById('volunteersGrid');
        if (!volunteersGrid) {
            console.error('❌ volunteersGrid element not found');
            return;
        }

        try {
            // Show loading state
            volunteersGrid.innerHTML = '<div class="card"><p>🔄 Loading volunteers...</p></div>';

            // Check if StorageManager is available
            if (!window.StorageManager) {
                throw new Error('StorageManager not available');
            }

            if (!window.StorageManager.db) {
                throw new Error('StorageManager database not initialized');
            }

            // Get volunteers with timeout
            const volunteers = await Promise.race([
                window.StorageManager.getAllVolunteers(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout getting volunteers')), 5000)
                )
            ]);

            console.log(`📊 Retrieved ${volunteers ? volunteers.length : 0} volunteers`);

            // Use the app's renderVolunteersGrid if available, otherwise create our own
            if (window.app && typeof window.app.renderVolunteersGrid === 'function') {
                window.app.renderVolunteersGrid(volunteers);
            } else {
                renderVolunteersGridFallback(volunteers);
            }

        } catch (error) {
            console.error('❌ Error updating volunteers view:', error);

            // Show error state with retry option
            volunteersGrid.innerHTML = `
                <div class="card">
                    <div class="error-state">
                        <div class="error-icon">⚠️</div>
                        <h3>Error Loading Volunteers</h3>
                        <p>Error: ${error.message}</p>
                        <div style="margin-top: 1rem;">
                            <button class="btn btn-primary" onclick="fixVolunteersLoading()">🔄 Retry</button>
                            <button class="btn btn-secondary" onclick="window.location.reload()">🔄 Refresh Page</button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Fallback volunteer grid renderer
    function renderVolunteersGridFallback(volunteers) {
        const volunteersGrid = document.getElementById('volunteersGrid');
        if (!volunteersGrid) return;

        if (!volunteers || volunteers.length === 0) {
            volunteersGrid.innerHTML = `
                <div class="card">
                    <div class="empty-state">
                        <div class="empty-icon">👥</div>
                        <h3>No Volunteers Found</h3>
                        <p>Add your first volunteer to get started.</p>
                        <button class="btn btn-primary" onclick="window.app && window.app.showAddVolunteerModal ? window.app.showAddVolunteerModal() : alert('Add volunteer function not available')">Add Volunteer</button>
                    </div>
                </div>
            `;
            return;
        }

        // Sort volunteers by name
        volunteers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        const volunteersHTML = volunteers.map(volunteer => `
            <div class="card volunteer-card" data-volunteer-id="${volunteer.id || ''}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 0.5rem 0;">${volunteer.name || 'Unknown'}</h3>
                        <p style="margin: 0.25rem 0;"><strong>ID:</strong> ${volunteer.id || 'N/A'}</p>
                        <p style="margin: 0.25rem 0;"><strong>Committee:</strong> ${volunteer.committee || 'N/A'}</p>
                        ${volunteer.email ? `<p style="margin: 0.25rem 0;"><strong>Email:</strong> ${volunteer.email}</p>` : ''}
                    </div>
                    <div style="margin-left: 1rem;">
                        <span class="status ${(volunteer.status || 'active').toLowerCase()}" style="padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.8rem; font-weight: 500; white-space: nowrap;
                            ${volunteer.status === 'Active' ? 'background: #d4edda; color: #155724;' :
                volunteer.status === 'Inactive' ? 'background: #f8d7da; color: #721c24;' :
                    'background: #fff3cd; color: #856404;'}">${volunteer.status || 'Active'}</span>
                    </div>
                </div>
                <div class="volunteer-actions" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn-secondary btn-sm" onclick="editVolunteer('${volunteer.id || ''}')" style="padding: 0.5rem 1rem; font-size: 0.8rem;">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="viewVolunteerHistory('${volunteer.id || ''}')" style="padding: 0.5rem 1rem; font-size: 0.8rem;">
                        📊 History
                    </button>
                </div>
            </div>
        `).join('');

        volunteersGrid.innerHTML = volunteersHTML;

        console.log(`✅ Rendered ${volunteers.length} volunteers`);
    }

    // Override the app's switchView to ensure volunteers view is properly updated
    function enhanceSwitchView() {
        if (!window.app || typeof window.app.switchView !== 'function') {
            console.log('⚠️ App switchView not available, will retry...');
            return false;
        }

        const originalSwitchView = window.app.switchView.bind(window.app);

        window.app.switchView = function (viewName) {
            console.log(`🔄 Enhanced switchView called with: ${viewName}`);

            // Call original switchView
            originalSwitchView(viewName);

            // Additional handling for volunteers view
            if (viewName === 'volunteers') {
                console.log('👥 Volunteers view selected, ensuring proper update...');

                // Multiple attempts to ensure it works
                setTimeout(() => fixedUpdateVolunteersView(), 50);
                setTimeout(() => fixedUpdateVolunteersView(), 200);
                setTimeout(() => fixedUpdateVolunteersView(), 500);
            }
        };

        console.log('✅ Enhanced switchView installed');
        return true;
    }

    // Also monitor for view changes via DOM mutations
    function setupViewChangeMonitor() {
        const volunteersView = document.getElementById('volunteersView');
        if (!volunteersView) return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList.contains('active') && target.id === 'volunteersView') {
                        console.log('👥 Volunteers view became active via DOM change');
                        setTimeout(() => {
                            const volunteersGrid = document.getElementById('volunteersGrid');
                            if (volunteersGrid && volunteersGrid.innerHTML.includes('Loading volunteers...')) {
                                console.log('🔧 Auto-fixing stuck volunteers loading...');
                                fixedUpdateVolunteersView();
                            }
                        }, 100);
                    }
                }
            });
        });

        observer.observe(volunteersView, { attributes: true });
        console.log('👁️ View change monitor installed');
    }

    // Global function to manually fix volunteers loading
    window.fixVolunteersLoading = function () {
        console.log('🔧 Manual volunteers loading fix triggered');
        fixedUpdateVolunteersView();
    };

    // Global functions for volunteer actions (fallback)
    window.editVolunteer = function (volunteerId) {
        if (window.app && typeof window.app.editVolunteer === 'function') {
            window.app.editVolunteer(volunteerId);
        } else {
            alert(`Edit volunteer: ${volunteerId}\n(Function not available)`);
        }
    };

    window.viewVolunteerHistory = function (volunteerId) {
        if (window.app && typeof window.app.viewVolunteerHistory === 'function') {
            window.app.viewVolunteerHistory(volunteerId);
        } else {
            alert(`View history for: ${volunteerId}\n(Function not available)`);
        }
    };

    // Initialize the fix
    async function initializeFix() {
        console.log('🚀 Initializing volunteers loading fix...');

        // Wait for app to be ready
        await waitForApp();

        // Setup view change monitor
        setupViewChangeMonitor();

        // Enhance switchView
        let retries = 0;
        const maxRetries = 10;

        const enhanceInterval = setInterval(() => {
            if (enhanceSwitchView() || retries >= maxRetries) {
                clearInterval(enhanceInterval);

                if (retries >= maxRetries) {
                    console.log('⚠️ Could not enhance switchView, but fix is still available');
                }

                // If we're currently on volunteers view, fix it immediately
                if (window.app && window.app.currentView === 'volunteers') {
                    console.log('👥 Currently on volunteers view, applying fix...');
                    setTimeout(() => fixedUpdateVolunteersView(), 500);
                }

                console.log('✅ Volunteers loading fix initialized');
            }
            retries++;
        }, 500);

        // Also add a periodic check for stuck loading state
        setInterval(() => {
            const volunteersView = document.getElementById('volunteersView');
            const volunteersGrid = document.getElementById('volunteersGrid');

            if (volunteersView && volunteersView.classList.contains('active') &&
                volunteersGrid && volunteersGrid.innerHTML.includes('Loading volunteers...')) {
                console.log('🔧 Periodic check: fixing stuck volunteers loading...');
                fixedUpdateVolunteersView();
            }
        }, 3000); // Check every 3 seconds
    }

    // Hook into navigation clicks directly
    function setupNavigationHook() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-view="volunteers"]');
            if (target) {
                console.log('👥 Volunteers navigation clicked, preparing fix...');

                // Apply fix after a short delay to let the view switch
                setTimeout(() => {
                    const volunteersGrid = document.getElementById('volunteersGrid');
                    if (volunteersGrid && volunteersGrid.innerHTML.includes('Loading volunteers...')) {
                        console.log('🔧 Navigation hook: fixing volunteers loading...');
                        fixedUpdateVolunteersView();
                    }
                }, 200);

                // Backup fix after longer delay
                setTimeout(() => {
                    const volunteersGrid = document.getElementById('volunteersGrid');
                    if (volunteersGrid && volunteersGrid.innerHTML.includes('Loading volunteers...')) {
                        console.log('🔧 Navigation hook backup: fixing volunteers loading...');
                        fixedUpdateVolunteersView();
                    }
                }, 1000);
            }
        });

        console.log('🎯 Navigation hook installed');
    }

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupNavigationHook();
            initializeFix();
        });
    } else {
        setupNavigationHook();
        initializeFix();
    }

    // Also add keyboard shortcut for manual fix
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'V') {
            console.log('🔧 Keyboard shortcut triggered: Ctrl+Shift+V');
            fixedUpdateVolunteersView();
        }
    });

    console.log('🔧 Volunteers loading fix script loaded');

})();