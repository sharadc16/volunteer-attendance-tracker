/**
 * Add Event Accessibility Fix
 * Makes the Add Event functionality accessible from any view
 */

(function() {
    'use strict';
    
    console.log('🔧 Loading Add Event Accessibility Fix...');
    
    // Wait for app to be ready
    function waitForApp() {
        return new Promise((resolve) => {
            const checkApp = () => {
                if (window.app && window.app.isInitialized) {
                    resolve(window.app);
                } else {
                    setTimeout(checkApp, 100);
                }
            };
            checkApp();
        });
    }
    
    // Add global Add Event function
    function addGlobalAddEventFunction() {
        window.addEventFromAnyView = function() {
            console.log('🚀 Adding event from any view...');
            
            if (!window.app) {
                console.error('❌ App not available');
                alert('App not ready. Please wait and try again.');
                return;
            }
            
            // Switch to events view first
            console.log('📅 Switching to events view...');
            window.app.switchView('events');
            
            // Wait a moment for view to switch, then show modal
            setTimeout(() => {
                console.log('➕ Opening Add Event modal...');
                if (typeof window.app.showAddEventModal === 'function') {
                    window.app.showAddEventModal();
                } else {
                    console.error('❌ showAddEventModal method not available');
                    alert('Add Event function not available. Please refresh the page.');
                }
            }, 200);
        };
        
        console.log('✅ Global addEventFromAnyView function created');
    }
    
    // Add floating Add Event button
    function addFloatingAddEventButton() {
        // Check if button already exists
        if (document.getElementById('floatingAddEventBtn')) {
            return;
        }
        
        const floatingBtn = document.createElement('button');
        floatingBtn.id = 'floatingAddEventBtn';
        floatingBtn.innerHTML = '➕';
        floatingBtn.title = 'Add Event (works from any view)';
        floatingBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: #007bff;
            color: white;
            border: none;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,123,255,0.3);
            z-index: 1000;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Hover effects
        floatingBtn.addEventListener('mouseenter', () => {
            floatingBtn.style.transform = 'scale(1.1)';
            floatingBtn.style.boxShadow = '0 6px 16px rgba(0,123,255,0.4)';
        });
        
        floatingBtn.addEventListener('mouseleave', () => {
            floatingBtn.style.transform = 'scale(1)';
            floatingBtn.style.boxShadow = '0 4px 12px rgba(0,123,255,0.3)';
        });
        
        // Click handler
        floatingBtn.addEventListener('click', () => {
            window.addEventFromAnyView();
        });
        
        document.body.appendChild(floatingBtn);
        console.log('✅ Floating Add Event button added');
    }
    
    // Add keyboard shortcut
    function addKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+E or Cmd+E to add event
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                window.addEventFromAnyView();
            }
        });
        
        console.log('✅ Keyboard shortcut added (Ctrl+E or Cmd+E)');
    }
    
    // Add to dashboard as a quick action
    function addDashboardQuickAction() {
        // Wait for dashboard to be ready
        setTimeout(() => {
            const dashboardView = document.getElementById('dashboardView');
            if (dashboardView) {
                // Look for a good place to add the button
                let targetContainer = dashboardView.querySelector('.view-header .view-controls');
                
                if (!targetContainer) {
                    // Create a quick actions section
                    const quickActions = document.createElement('div');
                    quickActions.className = 'quick-actions';
                    quickActions.style.cssText = `
                        margin: 20px 0;
                        padding: 15px;
                        background: #f8f9fa;
                        border-radius: 8px;
                        border-left: 4px solid #007bff;
                    `;
                    
                    quickActions.innerHTML = `
                        <h3 style="margin: 0 0 10px 0; color: #495057;">Quick Actions</h3>
                        <button id="dashboardAddEventBtn" class="btn btn-primary" style="margin-right: 10px;">
                            ➕ Add Event
                        </button>
                        <small style="color: #6c757d;">Add events from anywhere in the app</small>
                    `;
                    
                    // Insert after the first element in dashboard
                    const firstChild = dashboardView.firstElementChild;
                    if (firstChild && firstChild.nextSibling) {
                        dashboardView.insertBefore(quickActions, firstChild.nextSibling);
                    } else {
                        dashboardView.appendChild(quickActions);
                    }
                    
                    // Add click handler
                    const dashboardBtn = document.getElementById('dashboardAddEventBtn');
                    if (dashboardBtn) {
                        dashboardBtn.addEventListener('click', window.addEventFromAnyView);
                    }
                    
                    console.log('✅ Dashboard quick action added');
                }
            }
        }, 1000);
    }
    
    // Initialize the fix
    async function init() {
        try {
            console.log('⏳ Waiting for app to be ready...');
            await waitForApp();
            console.log('✅ App is ready');
            
            addGlobalAddEventFunction();
            addFloatingAddEventButton();
            addKeyboardShortcut();
            addDashboardQuickAction();
            
            console.log('🎉 Add Event Accessibility Fix loaded successfully!');
            console.log('💡 You can now:');
            console.log('   - Use the floating ➕ button (bottom right)');
            console.log('   - Press Ctrl+E (or Cmd+E) from any view');
            console.log('   - Call window.addEventFromAnyView() in console');
            console.log('   - Use the Quick Actions on Dashboard');
            
        } catch (error) {
            console.error('❌ Failed to load Add Event Accessibility Fix:', error);
        }
    }
    
    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();