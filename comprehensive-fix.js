/**
 * Comprehensive fix for volunteer attendance tracker
 * Fixes hamburger menu, settings, and ensures 7-day scanning window works
 */

// Wait for DOM and storage to be ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔧 Comprehensive fix loaded');
    
    // Wait for storage manager to be ready
    await waitForStorageManager();
    
    // Fix hamburger menu and navigation
    setupHamburgerMenu();
    
    // Fix settings button
    setupSettingsButton();
    
    // Setup navigation
    setupNavigation();
    
    // Create test events if none exist
    await createTestEventsIfNeeded();
    
    // Set up the current event update function
    setupCurrentEventUpdater();
    
    // Update current event display immediately
    updateCurrentEventDisplay();
    
    // Set up periodic updates
    setInterval(updateCurrentEventDisplay, 30000); // Update every 30 seconds
    
    console.log('✅ Comprehensive fix applied successfully');
});

async function waitForStorageManager() {
    let attempts = 0;
    while (!window.StorageManager || !window.StorageManager.db) {
        if (attempts > 100) {
            console.error('Storage manager failed to initialize');
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    console.log('✅ Storage manager ready');
}

function setupHamburgerMenu() {
    console.log('🔧 Setting up hamburger menu...');
    
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navContainer = document.getElementById('navContainer');
    const navOverlay = document.getElementById('navOverlay');
    
    if (hamburgerBtn && navContainer) {
        // Remove existing listeners to avoid duplicates
        hamburgerBtn.replaceWith(hamburgerBtn.cloneNode(true));
        const newHamburgerBtn = document.getElementById('hamburgerBtn');
        
        newHamburgerBtn.addEventListener('click', () => {
            console.log('Hamburger menu clicked');
            toggleMobileNav();
        });
        
        // Close nav when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navContainer.classList.contains('active')) {
                closeMobileNav();
            }
        });
        
        // Close nav when clicking overlay
        if (navOverlay) {
            navOverlay.addEventListener('click', () => {
                closeMobileNav();
            });
        }
        
        console.log('✅ Hamburger menu setup complete');
    } else {
        console.warn('⚠️ Hamburger menu elements not found');
    }
}

function setupSettingsButton() {
    console.log('🔧 Setting up settings button...');
    
    const settingsBtn = document.getElementById('settingsBtn');
    
    if (settingsBtn) {
        // Remove existing listeners to avoid duplicates
        settingsBtn.replaceWith(settingsBtn.cloneNode(true));
        const newSettingsBtn = document.getElementById('settingsBtn');
        
        newSettingsBtn.addEventListener('click', () => {
            console.log('Settings button clicked');
            showSettings();
        });
        
        console.log('✅ Settings button setup complete');
    } else {
        console.warn('⚠️ Settings button not found');
    }
}

function setupNavigation() {
    console.log('🔧 Setting up navigation...');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        // Remove existing listeners by cloning
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            console.log('Navigation clicked:', view);
            switchView(view);
            closeMobileNav();
        });
    });
    
    console.log('✅ Navigation setup complete');
}

function toggleMobileNav() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navContainer = document.getElementById('navContainer');
    const navOverlay = document.getElementById('navOverlay');
    
    if (hamburgerBtn && navContainer) {
        const isActive = navContainer.classList.contains('active');
        
        if (isActive) {
            closeMobileNav();
        } else {
            openMobileNav();
        }
    }
}

function openMobileNav() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navContainer = document.getElementById('navContainer');
    const navOverlay = document.getElementById('navOverlay');
    
    if (hamburgerBtn) {
        hamburgerBtn.classList.add('active');
        hamburgerBtn.setAttribute('aria-expanded', 'true');
    }
    
    if (navContainer) {
        navContainer.classList.add('active');
    }
    
    if (navOverlay) {
        navOverlay.classList.add('active');
    }
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function closeMobileNav() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navContainer = document.getElementById('navContainer');
    const navOverlay = document.getElementById('navOverlay');
    
    if (hamburgerBtn) {
        hamburgerBtn.classList.remove('active');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
    }
    
    if (navContainer) {
        navContainer.classList.remove('active');
    }
    
    if (navOverlay) {
        navOverlay.classList.remove('active');
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
}

function switchView(viewName) {
    console.log('Switching to view:', viewName);
    
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
    });

    const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.setAttribute('aria-current', 'page');
    }

    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    const activeView = document.getElementById(`${viewName}View`);
    if (activeView) {
        activeView.classList.add('active');
    } else {
        console.error(`View element not found: ${viewName}View`);
        return;
    }

    // Refresh view data if needed
    switch (viewName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'volunteers':
            updateVolunteersView();
            break;
        case 'events':
            updateEventsView();
            break;
        case 'reports':
            updateReports();
            break;
    }
}

function showSettings() {
    console.log('🔧 showSettings called from comprehensive-fix.js - redirecting to settings.html');
    
    // Redirect to the comprehensive settings page instead of showing modal
    window.location.href = 'settings.html';
}

function showModal(title, content, confirmText = 'Confirm', cancelText = 'Cancel') {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalConfirm = document.getElementById('modalConfirm');
    const modalCancel = document.getElementById('modalCancel');

    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.innerHTML = content;
    if (modalConfirm) modalConfirm.textContent = confirmText;
    
    // Handle cancel button visibility
    if (modalCancel) {
        if (cancelText && cancelText.trim() !== '') {
            modalCancel.textContent = cancelText;
            modalCancel.style.display = '';
        } else {
            modalCancel.style.display = 'none';
        }
    }

    if (modalOverlay) {
        modalOverlay.classList.add('active');
    }
    
    // Setup close handlers
    const closeModal = () => {
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    };
    
    if (modalConfirm) {
        modalConfirm.onclick = closeModal;
    }
    
    if (modalCancel) {
        modalCancel.onclick = closeModal;
    }
    
    if (modalOverlay) {
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        };
    }
}

async function createTestEventsIfNeeded() {
    try {
        console.log('🔧 Test event creation disabled - using existing events only');
        
        const allEvents = await window.StorageManager.getAllEvents();
        console.log(`Found ${allEvents.length} existing events`);
        
        // Don't create test events anymore - rely on Google Sheets sync or manual creation
        console.log('Test event creation skipped - events should come from Google Sheets');
        
    } catch (error) {
        console.error('Error checking events:', error);
    }
}

// Global function for creating test events
window.createTestEventsForDemo = async function() {
    try {
        console.log('Creating test events for 7-day scanning window demo...');
        
        const today = new Date();
        const events = [
            {
                eventId: `TODAY_${Date.now()}`,
                eventName: 'Today\'s Service',
                date: formatDate(today),
                type: 'Special',
                status: 'Active'
            },
            {
                eventId: `YESTERDAY_${Date.now()}`,
                eventName: 'Yesterday\'s Service',
                date: formatDate(new Date(today.getTime() - 24 * 60 * 60 * 1000)),
                type: 'Recurring',
                status: 'Active'
            },
            {
                eventId: `THREE_DAYS_${Date.now()}`,
                eventName: 'Service 3 Days Ago',
                date: formatDate(new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)),
                type: 'Recurring',
                status: 'Active'
            },
            {
                eventId: `FIVE_DAYS_${Date.now()}`,
                eventName: 'Service 5 Days Ago',
                date: formatDate(new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)),
                type: 'Recurring',
                status: 'Active'
            },
            {
                eventId: `TEN_DAYS_${Date.now()}`,
                eventName: 'Service 10 Days Ago (Expired)',
                date: formatDate(new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)),
                type: 'Special',
                status: 'Active'
            },
            {
                eventId: `FUTURE_${Date.now()}`,
                eventName: 'Future Service',
                date: formatDate(new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)),
                type: 'Special',
                status: 'Active'
            }
        ];
        
        for (const event of events) {
            await window.StorageManager.addEvent(event);
            console.log(`✅ Created: ${event.eventName} (${event.date})`);
        }
        
        console.log(`🎉 Created ${events.length} test events for 7-day scanning window demo`);
        
        // Update the current event display
        setTimeout(updateCurrentEventDisplay, 500);
        
        alert(`Created ${events.length} test events!\n\nNow you can see the 7-day scanning window in action:\n- Today's event will show as current\n- Past events within 7 days will show for backfilling\n- Events older than 7 days will be excluded`);
        
    } catch (error) {
        console.error('Error creating test events:', error);
        alert('Error creating test events: ' + error.message);
    }
};

// Global function for clearing events
window.clearAllEvents = async function() {
    try {
        if (!confirm('Are you sure you want to clear all events? This cannot be undone.')) {
            return;
        }
        
        console.log('Clearing all events...');
        
        const allEvents = await window.StorageManager.getAllEvents();
        for (const event of allEvents) {
            await window.StorageManager.deleteEvent(event.eventId);
        }
        
        console.log(`✅ Cleared ${allEvents.length} events`);
        
        // Update the current event display
        setTimeout(updateCurrentEventDisplay, 500);
        
        alert(`Cleared ${allEvents.length} events`);
        
    } catch (error) {
        console.error('Error clearing events:', error);
        alert('Error clearing events: ' + error.message);
    }
};

function formatDate(date) {
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
}

function setupCurrentEventUpdater() {
    // Add the function to window for global access
    window.updateCurrentEventDisplay = updateCurrentEventDisplay;
    
    // If there's an existing app instance, add the method
    if (window.app && typeof window.app === 'object') {
        window.app.updateCurrentEvent = updateCurrentEventDisplay;
    }
}

/**
 * Update current event display with enhanced 7-day scanning window feedback
 */
async function updateCurrentEventDisplay() {
    const currentEventEl = document.getElementById('currentEvent');
    if (!currentEventEl) {
        console.log('Current event element not found');
        return;
    }

    try {
        console.log('🔄 Updating current event display...');
        
        // Get the current scannable event with enhanced metadata
        const currentScannableEvent = await window.StorageManager.getCurrentScannableEvent();
        
        if (currentScannableEvent) {
            const context = currentScannableEvent.scanningContext;
            
            if (context?.isToday) {
                // Today's event (Requirement 8.1, 8.4)
                currentEventEl.textContent = `📅 Today: ${currentScannableEvent.eventName}`;
                currentEventEl.className = 'current-event active today';
                currentEventEl.title = `Recording attendance for today's event: ${currentScannableEvent.eventName}`;
                console.log('✅ Current event (today):', currentScannableEvent.eventName);
                
            } else if (context?.isPastEvent) {
                // Past event for backfilling (Requirement 8.2, 8.4, 8.6)
                const daysAgo = context.daysFromEventDate;
                currentEventEl.textContent = `🔄 Backfill: ${currentScannableEvent.eventName} (${daysAgo}d ago)`;
                currentEventEl.className = 'current-event active backfill';
                currentEventEl.title = `Manual backfilling for ${currentScannableEvent.eventName} from ${currentScannableEvent.date} (${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago)`;
                console.log('✅ Current event (backfill):', currentScannableEvent.eventName, `${daysAgo} days ago`);
                
            } else {
                // Fallback for events without context
                currentEventEl.textContent = `📋 ${currentScannableEvent.eventName}`;
                currentEventEl.className = 'current-event active';
                currentEventEl.title = `Recording attendance for ${currentScannableEvent.eventName}`;
                console.log('✅ Current event (active):', currentScannableEvent.eventName);
            }
            
        } else {
            // No scannable event - get detailed status for better feedback (Requirement 8.3)
            console.log('❌ No scannable event found, checking for detailed status...');
            
            // Get basic event information for status
            const allEvents = await window.StorageManager.getAllEvents();
            const activeEvents = allEvents.filter(event => event.status === 'Active');
            
            if (activeEvents.length === 0) {
                currentEventEl.textContent = '❌ No events created';
                currentEventEl.className = 'current-event inactive no-events';
                currentEventEl.title = 'No events have been created. Use Settings to create test events.';
                
            } else {
                // Check for future or expired events
                const today = new Date();
                const todayStr = today.getFullYear() + '-' + 
                               String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(today.getDate()).padStart(2, '0');
                
                const upcomingEvents = activeEvents.filter(event => new Date(event.date) > new Date(todayStr));
                const pastEvents = activeEvents.filter(event => new Date(event.date) < new Date(todayStr));
                
                if (upcomingEvents.length > 0) {
                    upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
                    const nextEvent = upcomingEvents[0];
                    const daysUntil = Math.ceil((new Date(nextEvent.date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
                    
                    currentEventEl.textContent = `⏳ Next: ${nextEvent.eventName} (${daysUntil}d)`;
                    currentEventEl.className = 'current-event inactive future';
                    currentEventEl.title = `Next event "${nextEvent.eventName}" is in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
                    
                } else if (pastEvents.length > 0) {
                    pastEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
                    const lastEvent = pastEvents[0];
                    const daysAgo = Math.floor((new Date(todayStr) - new Date(lastEvent.date)) / (1000 * 60 * 60 * 24));
                    
                    currentEventEl.textContent = `⏰ Expired: ${lastEvent.eventName} (${daysAgo}d ago)`;
                    currentEventEl.className = 'current-event inactive expired';
                    currentEventEl.title = `Last event "${lastEvent.eventName}" was ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago (outside 7-day window)`;
                    
                } else {
                    currentEventEl.textContent = '❌ No scannable events';
                    currentEventEl.className = 'current-event inactive';
                    currentEventEl.title = 'No events are currently available for scanning';
                }
            }
        }

        console.log('✅ Current event display updated');

    } catch (error) {
        console.error('❌ Error updating current event:', error);
        currentEventEl.textContent = '⚠️ Error loading event';
        currentEventEl.className = 'current-event error';
        currentEventEl.title = 'Error loading event information. Please refresh the page.';
    }
}

// Stub functions for views that might not exist
function updateDashboard() {
    console.log('Dashboard update requested');
    updateCurrentEventDisplay();
}

function updateVolunteersView() {
    console.log('Volunteers view update requested');
}

function updateEventsView() {
    console.log('Events view update requested');
}

function updateReports() {
    console.log('Reports update requested');
}

// Export for testing
window.updateCurrentEventDisplay = updateCurrentEventDisplay;
window.toggleMobileNav = toggleMobileNav;
window.showSettings = showSettings;