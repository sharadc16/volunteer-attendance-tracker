/**
 * Add a fix button directly to the volunteers view for easy access
 */

(function() {
    'use strict';
    
    function addFixButtonToVolunteersView() {
        const volunteersView = document.getElementById('volunteersView');
        const viewHeader = volunteersView?.querySelector('.view-header');
        
        if (!viewHeader) {
            console.log('⚠️ Could not find volunteers view header');
            return;
        }
        
        // Check if button already exists
        if (document.getElementById('fixVolunteersBtn')) {
            return;
        }
        
        // Create fix button
        const fixButton = document.createElement('button');
        fixButton.id = 'fixVolunteersBtn';
        fixButton.className = 'btn btn-warning btn-sm';
        fixButton.innerHTML = '🔧 Fix Loading';
        fixButton.title = 'Click if volunteers are stuck loading';
        fixButton.style.marginLeft = '10px';
        
        fixButton.addEventListener('click', () => {
            console.log('🔧 Fix button clicked');
            if (window.fixVolunteersLoading) {
                window.fixVolunteersLoading();
            } else {
                alert('Fix function not available. Try refreshing the page.');
            }
        });
        
        // Add to view controls
        const viewControls = viewHeader.querySelector('.view-controls');
        if (viewControls) {
            viewControls.appendChild(fixButton);
            console.log('✅ Fix button added to volunteers view');
        }
    }
    
    // Add button when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addFixButtonToVolunteersView);
    } else {
        addFixButtonToVolunteersView();
    }
    
    // Also add when volunteers view becomes active
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-view="volunteers"]')) {
            setTimeout(addFixButtonToVolunteersView, 100);
        }
    });
    
})();