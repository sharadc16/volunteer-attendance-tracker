/**
 * Main application logic for the Volunteer Attendance Tracker
 */

class VolunteerAttendanceApp {
    constructor() {
        this.currentView = 'dashboard';
        this.isInitialized = false;
        this.updateInterval = null;

        // Add caching to reduce database calls
        this.cache = {
            volunteers: null,
            events: null,
            attendance: null,
            lastUpdated: {
                volunteers: 0,
                events: 0,
                attendance: 0
            }
        };
        this.cacheTimeout = 30000; // 30 seconds cache

        // Listen for environment changes
        window.addEventListener('environmentChanged', (e) => {
            this.handleEnvironmentChange(e.detail);
        });

        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Show loading overlay
            this.showLoading(true);

            // Wait for storage manager to initialize
            await this.waitForStorageManager();

            // Setup event listeners
            this.setupEventListeners();

            // Initialize views
            await this.initializeViews();

            // Start periodic updates
            this.startPeriodicUpdates();

            // Hide loading overlay
            this.showLoading(false);

            this.isInitialized = true;
            console.log('Volunteer Attendance Tracker initialized successfully');

        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    /**
     * Wait for storage manager to be ready
     */
    async waitForStorageManager() {
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds max

        console.log('Waiting for storage manager to initialize...');

        while (!window.StorageManager || !window.StorageManager.db) {
            if (attempts >= maxAttempts) {
                throw new Error('Storage manager failed to initialize within 10 seconds');
            }

            if (attempts % 10 === 0) {
                console.log(`Waiting for storage manager... attempt ${attempts + 1}`);
            }

            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        console.log('Storage manager is ready!');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Hamburger menu
        const hamburgerBtn = Utils.DOM.getElementById('hamburgerBtn');
        const navContainer = Utils.DOM.getElementById('navContainer');
        const navOverlay = Utils.DOM.getElementById('navOverlay');

        if (hamburgerBtn && navContainer && navOverlay) {
            hamburgerBtn.addEventListener('click', () => this.toggleMobileNav());
            navOverlay.addEventListener('click', () => this.closeMobileNav());

            // Close nav when pressing Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && navContainer.classList.contains('active')) {
                    this.closeMobileNav();
                }
            });
        }

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Use currentTarget to get the button element, not the clicked child element
                const view = e.currentTarget.dataset.view;
                console.log('Navigation clicked:', view); // Debug log
                this.switchView(view);

                // Close mobile nav after selection
                this.closeMobileNav();
            });
        });

        // Sync status updates
        window.addEventListener('syncStatusChanged', (e) => {
            this.handleSyncStatusChange(e.detail);
        });

        // Events updated from Google Sheets sync
        window.addEventListener('eventsUpdated', (e) => {
            console.log('📡 Received eventsUpdated event:', e.detail);
            if (this.currentView === 'events') {
                console.log('🔄 Refreshing events view due to sync update');
                setTimeout(() => this.updateEventsView(), 100);
            }
            // Clear events cache to force refresh
            this.cache.events = null;
            this.cache.lastUpdated.events = 0;
        });

        // Settings button
        const settingsBtn = Utils.DOM.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }

        // Google Sheets sync button
        const googleSyncBtn = Utils.DOM.getElementById('googleSyncBtn');
        if (googleSyncBtn) {
            googleSyncBtn.addEventListener('click', () => this.handleGoogleSync());
        }

        // Force sync button
        const forceSyncBtn = Utils.DOM.getElementById('forceSyncBtn');
        if (forceSyncBtn) {
            forceSyncBtn.addEventListener('click', () => this.handleForceSync());
        }

        // Modal close handlers
        const modalOverlay = Utils.DOM.getElementById('modalOverlay');
        const modalClose = Utils.DOM.getElementById('modalClose');
        const modalCancel = Utils.DOM.getElementById('modalCancel');

        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.hideModal();
                }
            });
        }

        if (modalClose) {
            modalClose.addEventListener('click', () => this.hideModal());
        }

        if (modalCancel) {
            modalCancel.addEventListener('click', () => this.hideModal());
        }

        // Volunteer management
        const addVolunteerBtn = Utils.DOM.getElementById('addVolunteerBtn');
        const importVolunteersBtn = Utils.DOM.getElementById('importVolunteersBtn');
        const volunteerSearch = Utils.DOM.getElementById('volunteerSearch');

        if (addVolunteerBtn) {
            addVolunteerBtn.addEventListener('click', () => this.showAddVolunteerModal());
        }

        if (importVolunteersBtn) {
            importVolunteersBtn.addEventListener('click', () => this.showImportVolunteersModal());
        }

        if (volunteerSearch) {
            volunteerSearch.addEventListener('input',
                Utils.Event.debounce((e) => this.filterVolunteers(e.target.value), 300)
            );
        }

        // Event management
        const addEventBtn = Utils.DOM.getElementById('addEventBtn');
        if (addEventBtn) {
            addEventBtn.addEventListener('click', () => this.showAddEventModal());
        }

        const createSundayEventsBtn = Utils.DOM.getElementById('createSundayEventsBtn');
        if (createSundayEventsBtn) {
            createSundayEventsBtn.addEventListener('click', () => this.handleCreateSundayEvents());
        }

        // Event delegation for dynamically created buttons
        document.addEventListener('click', (e) => {
            // Full Calendar button
            if (e.target && e.target.id === 'fullCalendarBtn') {
                console.log('Full Calendar button clicked');
                this.showFullCalendar();
                return;
            }

            // Modal close buttons (additional event delegation for reliability)
            if (e.target && (e.target.id === 'modalClose' || e.target.id === 'modalCancel')) {
                console.log('Modal close button clicked:', e.target.id);
                this.hideModal();
                return;
            }

            // Modal confirm button when used as "Close" button
            if (e.target && e.target.id === 'modalConfirm') {
                const confirmText = e.target.textContent;
                if (confirmText === 'Close') {
                    console.log('Modal close via confirm button');
                    this.hideModal();
                    return;
                }
            }

            // Modal overlay click (close modal when clicking outside)
            if (e.target && e.target.id === 'modalOverlay') {
                console.log('Modal overlay clicked');
                this.hideModal();
                return;
            }

            // Event card action buttons (using data attributes for better targeting)
            if (e.target && e.target.dataset.action) {
                const action = e.target.dataset.action;
                const eventId = e.target.dataset.eventId;

                console.log('Event action clicked:', action, 'for event:', eventId);

                switch (action) {
                    case 'edit-event':
                        this.editEvent(eventId);
                        break;
                    case 'view-attendance':
                        this.viewEventAttendance(eventId);
                        break;
                    case 'delete-event':
                        this.deleteEvent(eventId);
                        break;
                }
                return;
            }
        });

        // Reports
        const reportPeriod = Utils.DOM.getElementById('reportPeriod');
        const exportReportBtn = Utils.DOM.getElementById('exportReportBtn');

        if (reportPeriod) {
            reportPeriod.addEventListener('change', (e) => this.updateReports(e.target.value));
        }

        if (exportReportBtn) {
            exportReportBtn.addEventListener('click', () => this.exportReport());
        }
    }

    /**
     * Get cached data or fetch from database
     */
    async getCachedData(type) {
        const now = Date.now();
        const lastUpdated = this.cache.lastUpdated[type];

        // Return cached data if it's still fresh
        if (this.cache[type] && (now - lastUpdated) < this.cacheTimeout) {
            console.log(`Using cached ${type} data`);
            return this.cache[type];
        }

        // Fetch fresh data
        console.log(`Fetching fresh ${type} data`);
        let data;
        switch (type) {
            case 'volunteers':
                data = await window.StorageManager.getAllVolunteers();
                break;
            case 'events':
                data = await window.StorageManager.getAllEvents();
                break;
            case 'attendance':
                data = await window.StorageManager.getAllAttendance();
                break;
            default:
                throw new Error(`Unknown data type: ${type}`);
        }

        // Cache the data
        this.cache[type] = data;
        this.cache.lastUpdated[type] = now;

        return data;
    }

    /**
     * Clear cache for a specific type or all types
     */
    clearCache(type = null) {
        if (type) {
            this.cache[type] = null;
            this.cache.lastUpdated[type] = 0;
            console.log(`Cleared ${type} cache`);
        } else {
            this.cache.volunteers = null;
            this.cache.events = null;
            this.cache.attendance = null;
            this.cache.lastUpdated = { volunteers: 0, events: 0, attendance: 0 };
            console.log('Cleared all cache');
        }
    }

    /**
     * Initialize all views (optimized to reduce database load)
     */
    async initializeViews() {
        // Only initialize the dashboard view initially
        // Other views will be loaded when user navigates to them
        await this.updateDashboard();

        console.log('Dashboard initialized. Other views will load on demand.');
    }

    /**
     * Switch between views
     */
    switchView(viewName) {
        // Validate viewName parameter
        if (!viewName || typeof viewName !== 'string') {
            console.error('Invalid view name:', viewName);
            return;
        }

        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        const activeView = Utils.DOM.getElementById(`${viewName}View`);
        if (activeView) {
            activeView.classList.add('active');
        } else {
            console.error(`View element not found: ${viewName}View`);
            return;
        }

        this.currentView = viewName;

        // Refresh view data if needed
        switch (viewName) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'volunteers':
                this.updateVolunteersView();
                break;
            case 'events':
                this.updateEventsView();
                break;
            case 'reports':
                this.updateReports();
                break;
        }
    }

    /**
     * Update dashboard view
     */
    async updateDashboard() {
        try {
            // Update today's scan count
            const todayAttendance = await window.StorageManager.getTodayAttendance();
            const todayScansEl = Utils.DOM.getElementById('todayScans');
            if (todayScansEl) {
                todayScansEl.textContent = todayAttendance.length;
            }

            // Update recent attendance list
            await this.updateRecentAttendance(todayAttendance);

            // Update summary stats
            await this.updateSummaryStats(todayAttendance);

            // Update current event
            await this.updateCurrentEvent();

        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }

    /**
     * Update recent attendance list
     */
    async updateRecentAttendance(attendanceData = null) {
        const recentAttendanceEl = Utils.DOM.getElementById('recentAttendance');
        if (!recentAttendanceEl) return;

        try {
            const attendance = attendanceData || await window.StorageManager.getTodayAttendance();

            // Sort by most recent first
            attendance.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

            // Take only the most recent 10
            const recentAttendance = attendance.slice(0, 10);

            if (recentAttendance.length === 0) {
                recentAttendanceEl.innerHTML = `
                    <div class="attendance-item">
                        <div class="volunteer-info">
                            <span class="volunteer-name">No check-ins yet today</span>
                            <span class="volunteer-committee">Start scanning badges to see attendance</span>
                        </div>
                        <span class="check-in-time">--:--</span>
                    </div>
                `;
                return;
            }

            const attendanceHTML = recentAttendance.map(record => {
                const checkInTime = Utils.Date.format(new Date(record.dateTime), 'time');
                return `
                    <div class="attendance-item">
                        <div class="volunteer-info">
                            <span class="volunteer-name">${record.volunteerName || record.volunteerId}</span>
                            <span class="volunteer-committee">${record.committee || 'Unknown'}</span>
                        </div>
                        <span class="check-in-time">${checkInTime}</span>
                    </div>
                `;
            }).join('');

            recentAttendanceEl.innerHTML = attendanceHTML;

        } catch (error) {
            console.error('Error updating recent attendance:', error);
            recentAttendanceEl.innerHTML = `
                <div class="attendance-item">
                    <div class="volunteer-info">
                        <span class="volunteer-name">Error loading attendance</span>
                        <span class="volunteer-committee">Please try refreshing</span>
                    </div>
                    <span class="check-in-time">--:--</span>
                </div>
            `;
        }
    }

    /**
     * Update summary statistics
     */
    async updateSummaryStats(attendanceData = null) {
        try {
            const attendance = attendanceData || await window.StorageManager.getTodayAttendance();
            const totalVolunteers = await window.StorageManager.getVolunteerCount();

            const totalCheckedInEl = Utils.DOM.getElementById('totalCheckedIn');
            const totalVolunteersEl = Utils.DOM.getElementById('totalVolunteers');
            const attendanceRateEl = Utils.DOM.getElementById('attendanceRate');

            if (totalCheckedInEl) {
                totalCheckedInEl.textContent = attendance.length;
            }

            if (totalVolunteersEl) {
                totalVolunteersEl.textContent = totalVolunteers;
            }

            if (attendanceRateEl) {
                const rate = totalVolunteers > 0 ? Math.round((attendance.length / totalVolunteers) * 100) : 0;
                attendanceRateEl.textContent = `${rate}%`;
            }

        } catch (error) {
            console.error('Error updating summary stats:', error);
        }
    }

    /**
     * Update current event display with enhanced 7-day scanning window feedback
     * Shows clear indication of which event is active and scanning context
     */
    async updateCurrentEvent() {
        const currentEventEl = Utils.DOM.getElementById('currentEvent');
        if (!currentEventEl) return;

        try {
            // Get the current scannable event with enhanced metadata
            const currentScannableEvent = await window.StorageManager.getCurrentScannableEvent();

            if (currentScannableEvent) {
                const context = currentScannableEvent.scanningContext;

                if (context?.isToday) {
                    // Today's event (Requirement 8.1, 8.4)
                    currentEventEl.textContent = `📅 Today: ${currentScannableEvent.eventName}`;
                    currentEventEl.className = 'current-event active today';
                    currentEventEl.title = `Recording attendance for today's event: ${currentScannableEvent.eventName}`;
                    console.log('Current event (today):', currentScannableEvent.eventName);

                } else if (context?.isPastEvent) {
                    // Past event for backfilling (Requirement 8.2, 8.4, 8.6)
                    const daysAgo = context.daysFromEventDate;
                    currentEventEl.textContent = `🔄 Backfill: ${currentScannableEvent.eventName} (${daysAgo}d ago)`;
                    currentEventEl.className = 'current-event active backfill';
                    currentEventEl.title = `Manual backfilling for ${currentScannableEvent.eventName} from ${currentScannableEvent.date} (${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago)`;
                    console.log('Current event (backfill):', currentScannableEvent.eventName, `${daysAgo} days ago`);

                } else {
                    // Fallback for events without context
                    currentEventEl.textContent = `📋 ${currentScannableEvent.eventName}`;
                    currentEventEl.className = 'current-event active';
                    currentEventEl.title = `Recording attendance for ${currentScannableEvent.eventName}`;
                    console.log('Current event (active):', currentScannableEvent.eventName);
                }

            } else {
                // No scannable event - get detailed status for better feedback (Requirement 8.3)
                if (window.scanner && typeof window.scanner.getScanningStatus === 'function') {
                    const scanningStatus = await window.scanner.getScanningStatus();

                    switch (scanningStatus.type) {
                        case 'no-events':
                            currentEventEl.textContent = '❌ No events created';
                            currentEventEl.className = 'current-event inactive no-events';
                            currentEventEl.title = 'No events have been created. Contact an administrator.';
                            break;

                        case 'future-event':
                            const nextEvent = scanningStatus.nextEvent;
                            const daysUntil = Math.ceil((new Date(nextEvent.date) - new Date()) / (1000 * 60 * 60 * 24));
                            currentEventEl.textContent = `⏳ Next: ${nextEvent.eventName} (${daysUntil}d)`;
                            currentEventEl.className = 'current-event inactive future';
                            currentEventEl.title = `Next event "${nextEvent.eventName}" is in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
                            break;

                        case 'expired-event':
                            const lastEvent = scanningStatus.lastEvent;
                            const daysAgo = Math.floor((new Date() - new Date(lastEvent.date)) / (1000 * 60 * 60 * 24));
                            currentEventEl.textContent = `⏰ Expired: ${lastEvent.eventName} (${daysAgo}d ago)`;
                            currentEventEl.className = 'current-event inactive expired';
                            currentEventEl.title = `Last event "${lastEvent.eventName}" was ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago (outside 7-day window)`;
                            break;

                        default:
                            currentEventEl.textContent = '❌ No scannable events';
                            currentEventEl.className = 'current-event inactive';
                            currentEventEl.title = 'No events are currently available for scanning';
                    }
                } else {
                    currentEventEl.textContent = '❌ No active event';
                    currentEventEl.className = 'current-event inactive';
                    currentEventEl.title = 'No events are currently available for scanning';
                }
            }

        } catch (error) {
            console.error('Error updating current event:', error);
            currentEventEl.textContent = '⚠️ Error loading event';
            currentEventEl.className = 'current-event error';
            currentEventEl.title = 'Error loading event information. Please refresh the page.';
        }
    }

    /**
     * Update volunteers view
     */
    async updateVolunteersView() {
        try {
            const volunteers = await window.StorageManager.getAllVolunteers();
            this.renderVolunteersGrid(volunteers);
        } catch (error) {
            console.error('Error updating volunteers view:', error);
            const volunteersGrid = Utils.DOM.getElementById('volunteersGrid');
            if (volunteersGrid) {
                volunteersGrid.innerHTML = `
                    <div class="card">
                        <p>Error loading volunteers. Please try refreshing the page.</p>
                    </div>
                `;
            }
        }
    }

    /**
     * Update events view
     */
    async updateEventsView() {
        const eventsList = Utils.DOM.getElementById('eventsList');
        if (!eventsList) return;

        try {
            const events = await window.StorageManager.getAllEvents();

            if (events.length === 0) {
                eventsList.innerHTML = `
                    <div class="card">
                        <div class="empty-state">
                            <div class="empty-icon">📅</div>
                            <h3>No Events Found</h3>
                            <p>Create your first event to start tracking attendance.</p>
                            <button class="btn btn-primary" onclick="app.showAddEventModal()">Add Event</button>
                        </div>
                    </div>
                `;
                return;
            }

            // Separate events into categories
            const today = new Date();
            const todayStr = today.getFullYear() + '-' +
                String(today.getMonth() + 1).padStart(2, '0') + '-' +
                String(today.getDate()).padStart(2, '0');

            const upcomingEvents = events.filter(event => event.date >= todayStr && event.status === 'Active');
            const pastEvents = events.filter(event => event.date < todayStr);
            const inactiveEvents = events.filter(event => event.status !== 'Active');

            // Sort events by date
            upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
            pastEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
            inactiveEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

            let eventsHTML = '';

            // Event Calendar View (Mini Calendar)
            eventsHTML += this.generateEventCalendar(events);

            // Upcoming Events
            if (upcomingEvents.length > 0) {
                eventsHTML += `
                    <div class="card events-section">
                        <div class="section-header">
                            <h3>📅 Upcoming Events</h3>
                            <span class="event-count">${upcomingEvents.length} event(s)</span>
                        </div>
                        <div class="events-grid">
                            ${upcomingEvents.map(event => this.generateEventCard(event, 'upcoming')).join('')}
                        </div>
                    </div>
                `;
            }

            // Past Events (Limited to last 10)
            if (pastEvents.length > 0) {
                const recentPastEvents = pastEvents.slice(0, 10);
                eventsHTML += `
                    <div class="card events-section">
                        <div class="section-header">
                            <h3>📋 Recent Past Events</h3>
                            <span class="event-count">Showing ${recentPastEvents.length} of ${pastEvents.length}</span>
                        </div>
                        <div class="events-grid">
                            ${recentPastEvents.map(event => this.generateEventCard(event, 'past')).join('')}
                        </div>
                        ${pastEvents.length > 10 ? `
                            <div class="section-footer">
                                <button class="btn btn-secondary btn-sm" onclick="app.showAllPastEvents()">
                                    View All ${pastEvents.length} Past Events
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }

            // Inactive/Cancelled Events
            if (inactiveEvents.length > 0) {
                eventsHTML += `
                    <div class="card events-section">
                        <div class="section-header">
                            <h3>⏸️ Inactive Events</h3>
                            <span class="event-count">${inactiveEvents.length} event(s)</span>
                        </div>
                        <div class="events-grid">
                            ${inactiveEvents.map(event => this.generateEventCard(event, 'inactive')).join('')}
                        </div>
                    </div>
                `;
            }

            eventsList.innerHTML = eventsHTML;

        } catch (error) {
            console.error('Error updating events view:', error);
            eventsList.innerHTML = `
                <div class="card">
                    <div class="error-state">
                        <div class="error-icon">⚠️</div>
                        <h3>Error Loading Events</h3>
                        <p>Please try refreshing the page.</p>
                        <button class="btn btn-secondary" onclick="app.updateEventsView()">Retry</button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Generate event calendar view
     */
    generateEventCalendar(events) {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Get events for current month
        const monthEvents = events.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate.getMonth() === currentMonth &&
                eventDate.getFullYear() === currentYear &&
                event.status === 'Active';
        });

        if (monthEvents.length === 0) {
            return `
                <div class="card calendar-section">
                    <div class="section-header">
                        <h3>📅 ${today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Calendar</h3>
                    </div>
                    <div class="calendar-empty">
                        <p>No active events scheduled for this month.</p>
                    </div>
                </div>
            `;
        }

        // Generate calendar grid (simplified)
        const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const eventsByDate = {};

        monthEvents.forEach(event => {
            const date = new Date(event.date).getDate();
            if (!eventsByDate[date]) {
                eventsByDate[date] = [];
            }
            eventsByDate[date].push(event);
        });

        const calendarHTML = `
            <div class="card calendar-section">
                <div class="section-header">
                    <h3>📅 ${monthName} Calendar</h3>
                    <div class="calendar-controls">
                        <button class="btn btn-secondary btn-sm" id="fullCalendarBtn">Full Calendar</button>
                    </div>
                </div>
                <div class="calendar-events">
                    ${Object.entries(eventsByDate).map(([date, dayEvents]) => `
                        <div class="calendar-day">
                            <div class="day-number">${date}</div>
                            <div class="day-events">
                                ${dayEvents.map(event => `
                                    <div class="calendar-event ${event.type.toLowerCase()}" 
                                         data-action="view-attendance" data-event-id="${event.eventId}"
                                         title="${event.eventName}" style="cursor: pointer;">
                                        <span class="event-name">${event.eventName}</span>
                                        ${event.type === 'Recurring' ? '<span class="recurring-indicator">🔄</span>' : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        return calendarHTML;
    }

    /**
     * Generate event card HTML
     */
    generateEventCard(event, category) {
        const eventDate = Utils.Date.format(new Date(event.date), 'long');

        // Fix timezone issues for today comparison
        const today = new Date();
        const todayStr = today.getFullYear() + '-' +
            String(today.getMonth() + 1).padStart(2, '0') + '-' +
            String(today.getDate()).padStart(2, '0');
        const isToday = event.date === todayStr;

        const eventDateObj = new Date(event.date + 'T00:00:00');
        const todayDateObj = new Date(todayStr + 'T00:00:00');
        const isPast = eventDateObj < todayDateObj;

        let statusClass = event.status.toLowerCase();
        let statusIcon = '';

        switch (event.status) {
            case 'Active':
                statusIcon = isToday ? '🟢' : (isPast ? '✅' : '📅');
                break;
            case 'Inactive':
                statusIcon = '⏸️';
                break;
            case 'Cancelled':
                statusIcon = '❌';
                break;
        }

        let typeIcon = '';
        switch (event.type) {
            case 'Recurring':
                typeIcon = '🔄';
                break;
            case 'Special':
                typeIcon = '⭐';
                break;
            case 'Daily':
                typeIcon = '📅';
                break;
        }

        return `
            <div class="event-card ${category} ${statusClass} ${isToday ? 'today' : ''}" data-event-id="${event.eventId}">
                <div class="event-header">
                    <div class="event-title">
                        <h4>${event.eventName}</h4>
                        <div class="event-badges">
                            <span class="event-type-badge" title="${event.type}">${typeIcon} ${event.type}</span>
                            <span class="event-status-badge ${statusClass}" title="${event.status}">${statusIcon} ${event.status}</span>
                        </div>
                    </div>
                    ${isToday ? '<div class="today-indicator">Today</div>' : ''}
                </div>
                
                <div class="event-details">
                    <div class="event-date">
                        <span class="date-icon">📅</span>
                        <span class="date-text">${eventDate}</span>
                    </div>
                    
                    ${event.dayOfWeek ? `
                        <div class="event-day">
                            <span class="day-icon">📆</span>
                            <span class="day-text">${event.dayOfWeek}</span>
                        </div>
                    ` : ''}
                    
                    ${event.recurringPattern ? `
                        <div class="event-pattern">
                            <span class="pattern-icon">🔄</span>
                            <span class="pattern-text">${event.recurringPattern}</span>
                        </div>
                    ` : ''}
                    
                    ${event.description ? `
                        <div class="event-description">
                            <p>${event.description}</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="event-actions">
                    <button class="btn btn-secondary btn-sm" data-action="edit-event" data-event-id="${event.eventId}" title="Edit Event">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-secondary btn-sm" data-action="view-attendance" data-event-id="${event.eventId}" title="View Attendance">
                        👥 Attendance
                    </button>
                    <button class="btn btn-danger btn-sm" data-action="delete-event" data-event-id="${event.eventId}" title="Delete Event">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Show full calendar view (placeholder for future enhancement)
     */
    showFullCalendar() {
        this.showModal(
            'Full Calendar',
            `<div style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
                <h3>Full Calendar View</h3>
                <p>This feature will be available in a future update.</p>
                <p>For now, you can view events by month in the main events list.</p>
            </div>`,
            'Close',
            ''
        );
    }

    /**
     * Handle creating all Sunday events
     */
    async handleCreateSundayEvents() {
        try {
            // Show confirmation modal first
            const modalContent = `
                <div class="sunday-events-confirmation">
                    <div style="text-align: center; margin-bottom: 1rem;">
                        <div style="font-size: 3rem;">📅</div>
                    </div>
                    <h3>Create Regular Class Events</h3>
                    <p>This will create Regular Class events for the following schedule:</p>
                    <ul style="text-align: left; margin: 1rem 0;">
                        <li><strong>Start Date:</strong> September 14, 2025</li>
                        <li><strong>End Date:</strong> May 17, 2026</li>
                        <li><strong>Frequency:</strong> Every Sunday</li>
                        <li><strong>Exceptions:</strong> No events on Nov 30, Dec 21, Dec 28, Feb 15, Apr 12</li>
                    </ul>
                    <p>This will create approximately <strong>30+ events</strong>.</p>
                    <div style="background: #fff3cd; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
                        <p style="margin: 0; color: #856404;"><strong>Note:</strong> If events already exist for some dates, they will be skipped.</p>
                    </div>
                    <p><strong>Do you want to proceed?</strong></p>
                </div>
            `;

            this.showModal('Create Regular Class Events', modalContent, 'Create Events', 'Cancel');

            // Handle confirmation
            const modalConfirm = Utils.DOM.getElementById('modalConfirm');
            if (modalConfirm) {
                modalConfirm.onclick = async () => {
                    try {
                        this.hideModal();
                        this.showLoading(true);

                        // Call the Sunday events creation function
                        if (typeof window.createSundayEvents === 'function') {
                            console.log('🚀 Starting Sunday events creation...');
                            const result = await window.createSundayEvents();

                            // Show success modal with results
                            const successContent = `
                                <div style="text-align: center;">
                                    <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
                                    <h3>Regular Class Events Created Successfully!</h3>
                                    <div style="margin: 1rem 0; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                                        <p><strong>📊 Summary:</strong></p>
                                        <ul style="text-align: left; display: inline-block;">
                                            <li>Total Sundays in range: ${result.totalSundays}</li>
                                            <li>Events created: ${result.createdEvents}</li>
                                            <li>Skipped (exceptions): ${result.skippedEvents}</li>
                                            ${result.errorCount > 0 ? `<li style="color: #e74c3c;">Errors: ${result.errorCount}</li>` : ''}
                                        </ul>
                                    </div>
                                    <p>All Regular Class events have been added to your calendar!</p>
                                </div>
                            `;

                            this.showModal('Success', successContent, 'Close', '');

                            // Refresh the events view
                            await this.updateEventsView();

                        } else {
                            throw new Error('Sunday events creation function not available');
                        }

                    } catch (error) {
                        console.error('Error creating Sunday events:', error);
                        this.showError(`Failed to create Sunday events: ${error.message}`);
                    } finally {
                        this.showLoading(false);
                    }
                };
            }

        } catch (error) {
            console.error('Error showing Sunday events modal:', error);
            this.showError(`Failed to show creation dialog: ${error.message}`);
        }
    }

    /**
     * Show all past events
     */
    async showAllPastEvents() {
        try {
            this.showLoading(true);

            const events = await window.StorageManager.getAllEvents();
            const today = new Date().toISOString().split('T')[0];
            const pastEvents = events.filter(event => event.date < today);

            // Sort by date (most recent first)
            pastEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

            const modalContent = `
                <div class="all-past-events">
                    <div class="events-summary">
                        <p><strong>Total Past Events:</strong> ${pastEvents.length}</p>
                    </div>
                    <div class="past-events-list">
                        ${pastEvents.map(event => {
                const eventDate = Utils.Date.format(new Date(event.date), 'long');
                return `
                                <div class="past-event-item">
                                    <div class="event-info">
                                        <h4>${event.eventName}</h4>
                                        <p><strong>Date:</strong> ${eventDate}</p>
                                        <p><strong>Type:</strong> ${event.type}</p>
                                        <p><strong>Status:</strong> ${event.status}</p>
                                    </div>
                                    <div class="event-actions">
                                        <button class="btn btn-secondary btn-sm" data-action="view-attendance" data-event-id="${event.eventId}">
                                            View Attendance
                                        </button>
                                    </div>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;

            this.showModal('All Past Events', modalContent, 'Close', '');

        } catch (error) {
            console.error('Error loading past events:', error);
            this.showError(`Failed to load past events: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Update reports view with comprehensive analytics
     */
    async updateReports(period = 'week') {
        const reportsContent = Utils.DOM.getElementById('reportsContent');
        if (!reportsContent) return;

        try {
            // Show loading state
            reportsContent.innerHTML = `
                <div class="card">
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <p>Generating attendance reports...</p>
                    </div>
                </div>
            `;

            // Calculate date range based on period
            let dateRange = null;
            if (period !== 'all') {
                const endDate = new Date();
                const startDate = new Date();

                switch (period) {
                    case 'week':
                        startDate.setDate(endDate.getDate() - 7);
                        break;
                    case 'month':
                        startDate.setMonth(endDate.getMonth() - 1);
                        break;
                    case 'quarter':
                        startDate.setMonth(endDate.getMonth() - 3);
                        break;
                    case 'year':
                        startDate.setFullYear(endDate.getFullYear() - 1);
                        break;
                }

                dateRange = { start: startDate, end: endDate };
            }

            // Get comprehensive analytics data
            const [
                volunteerScores,
                committeeStats,
                attendanceTrends
            ] = await Promise.all([
                window.StorageManager.getVolunteerAttendanceScores(dateRange, 'attendanceRate'),
                window.StorageManager.getCommitteeAttendanceStats(dateRange),
                window.StorageManager.getAttendanceTrends(null, period === 'year' ? 'quarter' : 'month', 6)
            ]);

            // Generate comprehensive report
            const reportHTML = this.generateComprehensiveReport(
                volunteerScores,
                committeeStats,
                attendanceTrends,
                period
            );

            reportsContent.innerHTML = reportHTML;

            // Setup interactive elements
            this.setupReportInteractions();

        } catch (error) {
            console.error('Error updating reports:', error);
            reportsContent.innerHTML = `
                <div class="card error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Error Loading Reports</h3>
                    <p>Unable to generate attendance reports. Please try refreshing the page.</p>
                    <button class="btn btn-secondary" onclick="app.updateReports('${period}')">Retry</button>
                </div>
            `;
        }
    }

    /**
     * Generate comprehensive attendance report HTML
     */
    generateComprehensiveReport(volunteerScores, committeeStats, trends, period) {
        const periodTitle = period.charAt(0).toUpperCase() + period.slice(1);
        const totalVolunteers = volunteerScores.length;
        const activeVolunteers = volunteerScores.filter(v => v.attendedEvents > 0).length;
        const avgAttendanceRate = totalVolunteers > 0
            ? Math.round(volunteerScores.reduce((sum, v) => sum + v.attendanceRate, 0) / totalVolunteers * 100) / 100
            : 0;

        return `
            <!-- Report Header -->
            <div class="card report-header">
                <div class="report-title">
                    <h2>📊 Attendance Analytics - ${periodTitle}</h2>
                    <div class="report-period-info">
                        ${period !== 'all' ? `
                            <span class="period-badge">${periodTitle} Report</span>
                            <span class="date-range">Generated: ${new Date().toLocaleDateString()}</span>
                        ` : `
                            <span class="period-badge">All Time Report</span>
                            <span class="date-range">Complete History</span>
                        `}
                    </div>
                </div>
                <div class="report-actions">
                    <div class="sort-controls">
                        <label for="reportSortBy">Sort by:</label>
                        <select id="reportSortBy" class="select-input">
                            <option value="attendanceRate">Attendance Rate</option>
                            <option value="engagementScore">Engagement Score</option>
                            <option value="totalAttendances">Total Attendances</option>
                            <option value="name">Name</option>
                            <option value="committee">Committee</option>
                        </select>
                    </div>
                    <button class="btn btn-secondary" id="exportDetailedReportBtn">📤 Export Detailed</button>
                </div>
            </div>

            <!-- Key Metrics Overview -->
            <div class="card metrics-overview">
                <h3>📈 Key Metrics</h3>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-icon">👥</div>
                        <div class="metric-content">
                            <span class="metric-number">${totalVolunteers}</span>
                            <span class="metric-label">Total Volunteers</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">✅</div>
                        <div class="metric-content">
                            <span class="metric-number">${activeVolunteers}</span>
                            <span class="metric-label">Active Volunteers</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">📊</div>
                        <div class="metric-content">
                            <span class="metric-number">${avgAttendanceRate}%</span>
                            <span class="metric-label">Avg Attendance</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">🏆</div>
                        <div class="metric-content">
                            <span class="metric-number">${volunteerScores.filter(v => v.tier === 'Platinum' || v.tier === 'Gold').length}</span>
                            <span class="metric-label">Top Performers</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Committee Performance Comparison -->
            ${this.generateCommitteeComparisonSection(committeeStats)}

            <!-- Volunteer Attendance Scores -->
            ${this.generateVolunteerScoresSection(volunteerScores)}

            <!-- Attendance Trends -->
            ${trends.length > 0 ? this.generateTrendsSection(trends) : ''}

            <!-- Performance Tiers -->
            ${this.generatePerformanceTiersSection(volunteerScores)}
        `;
    }

    /**
     * Generate committee comparison section
     */
    generateCommitteeComparisonSection(committeeStats) {
        if (committeeStats.length === 0) {
            return `
                <div class="card">
                    <h3>📋 Committee Performance</h3>
                    <div class="empty-state">
                        <p>No committee data available for this period.</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="card committee-performance">
                <div class="section-header">
                    <h3>📋 Committee Performance Comparison</h3>
                    <div class="section-actions">
                        <button class="btn btn-small btn-secondary" id="toggleCommitteeDetails">Show Details</button>
                    </div>
                </div>
                <div class="committee-stats-grid">
                    ${committeeStats.map((committee, index) => `
                        <div class="committee-card ${index === 0 ? 'top-performer' : ''}">
                            <div class="committee-header">
                                <h4>${committee.committee}</h4>
                                ${index === 0 ? '<span class="top-badge">🏆 Top</span>' : ''}
                            </div>
                            <div class="committee-metrics">
                                <div class="committee-metric">
                                    <span class="metric-value">${committee.avgAttendanceRate}%</span>
                                    <span class="metric-label">Avg Attendance</span>
                                </div>
                                <div class="committee-metric">
                                    <span class="metric-value">${committee.activeVolunteers}/${committee.totalVolunteers}</span>
                                    <span class="metric-label">Active/Total</span>
                                </div>
                                <div class="committee-metric">
                                    <span class="metric-value">${committee.totalAttendances}</span>
                                    <span class="metric-label">Total Check-ins</span>
                                </div>
                            </div>
                            ${committee.topPerformer ? `
                                <div class="committee-top-performer">
                                    <span class="top-performer-label">Top Performer:</span>
                                    <span class="top-performer-name">${committee.topPerformer.volunteerName}</span>
                                    <span class="top-performer-rate">(${committee.topPerformer.attendanceRate}%)</span>
                                </div>
                            ` : ''}
                            <div class="committee-details" style="display: none;">
                                <div class="committee-volunteers">
                                    <h5>Committee Members:</h5>
                                    <div class="volunteer-list">
                                        ${committee.volunteers.slice(0, 5).map(volunteer => `
                                            <div class="volunteer-item">
                                                <span class="volunteer-name">${volunteer.volunteerName}</span>
                                                <span class="volunteer-rate">${volunteer.attendanceRate}%</span>
                                            </div>
                                        `).join('')}
                                        ${committee.volunteers.length > 5 ? `
                                            <div class="volunteer-item more-volunteers">
                                                <span>... and ${committee.volunteers.length - 5} more</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Generate volunteer scores section
     */
    generateVolunteerScoresSection(volunteerScores) {
        return `
            <div class="card volunteer-scores">
                <div class="section-header">
                    <h3>🏅 Individual Volunteer Performance</h3>
                    <div class="section-info">
                        <span class="volunteer-count">${volunteerScores.length} volunteers</span>
                    </div>
                </div>
                <div class="scores-table-container">
                    <table class="scores-table" id="volunteerScoresTable">
                        <thead>
                            <tr>
                                <th class="rank-col">Rank</th>
                                <th class="name-col">Volunteer</th>
                                <th class="committee-col">Committee</th>
                                <th class="attendance-col">Attendance</th>
                                <th class="rate-col">Rate</th>
                                <th class="engagement-col">Engagement</th>
                                <th class="tier-col">Tier</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${volunteerScores.map((volunteer, index) => `
                                <tr class="volunteer-row ${volunteer.tier.toLowerCase()}-tier">
                                    <td class="rank-cell">
                                        <span class="rank-number">${index + 1}</span>
                                        ${index < 3 ? `<span class="rank-medal">${['🥇', '🥈', '🥉'][index]}</span>` : ''}
                                    </td>
                                    <td class="name-cell">
                                        <div class="volunteer-info">
                                            <span class="volunteer-name">${volunteer.volunteerName}</span>
                                            ${volunteer.lastAttendance ? `
                                                <span class="last-attendance">Last: ${Utils.Date.format(new Date(volunteer.lastAttendance), 'short')}</span>
                                            ` : ''}
                                        </div>
                                    </td>
                                    <td class="committee-cell">
                                        <span class="committee-badge">${volunteer.committee}</span>
                                    </td>
                                    <td class="attendance-cell">
                                        <span class="attendance-fraction">${volunteer.attendedEvents}/${volunteer.totalEvents}</span>
                                    </td>
                                    <td class="rate-cell">
                                        <div class="rate-display">
                                            <span class="rate-number">${volunteer.attendanceRate}%</span>
                                            <div class="rate-bar">
                                                <div class="rate-fill" style="width: ${volunteer.attendanceRate}%"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="engagement-cell">
                                        <span class="engagement-score">${volunteer.engagementScore}</span>
                                    </td>
                                    <td class="tier-cell">
                                        <span class="tier-badge ${volunteer.tier.toLowerCase()}">${volunteer.tier}</span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Generate trends section
     */
    generateTrendsSection(trends) {
        return `
            <div class="card trends-section">
                <h3>📈 Attendance Trends</h3>
                <div class="trends-chart">
                    <div class="chart-container">
                        ${trends.map((trend, index) => {
            const maxAttendance = Math.max(...trends.map(t => t.totalAttendances));
            const barHeight = maxAttendance > 0 ? (trend.totalAttendances / maxAttendance) * 100 : 0;

            return `
                                <div class="trend-bar-container">
                                    <div class="trend-bar" style="height: ${barHeight}%">
                                        <div class="trend-value">${trend.totalAttendances}</div>
                                    </div>
                                    <div class="trend-label">${trend.period}</div>
                                    <div class="trend-details">
                                        <span class="trend-volunteers">${trend.uniqueVolunteers} volunteers</span>
                                        <span class="trend-events">${trend.totalEvents} events</span>
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate performance tiers section
     */
    generatePerformanceTiersSection(volunteerScores) {
        const tiers = {
            'Platinum': volunteerScores.filter(v => v.tier === 'Platinum'),
            'Gold': volunteerScores.filter(v => v.tier === 'Gold'),
            'Silver': volunteerScores.filter(v => v.tier === 'Silver'),
            'Bronze': volunteerScores.filter(v => v.tier === 'Bronze')
        };

        return `
            <div class="card performance-tiers">
                <h3>🏆 Performance Tiers</h3>
                <div class="tiers-grid">
                    ${Object.entries(tiers).map(([tierName, volunteers]) => `
                        <div class="tier-card ${tierName.toLowerCase()}">
                            <div class="tier-header">
                                <h4>${tierName} Tier</h4>
                                <span class="tier-count">${volunteers.length} volunteers</span>
                            </div>
                            <div class="tier-criteria">
                                ${tierName === 'Platinum' ? '90%+ attendance' :
                tierName === 'Gold' ? '80-89% attendance' :
                    tierName === 'Silver' ? '70-79% attendance' :
                        'Below 70% attendance'}
                            </div>
                            <div class="tier-volunteers">
                                ${volunteers.slice(0, 3).map(volunteer => `
                                    <div class="tier-volunteer">
                                        <span class="volunteer-name">${volunteer.volunteerName}</span>
                                        <span class="volunteer-rate">${volunteer.attendanceRate}%</span>
                                    </div>
                                `).join('')}
                                ${volunteers.length > 3 ? `
                                    <div class="tier-volunteer more">
                                        <span>+${volunteers.length - 3} more</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Setup report interactions
     */
    setupReportInteractions() {
        // Sort functionality
        const sortSelect = Utils.DOM.getElementById('reportSortBy');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortVolunteerScores(e.target.value);
            });
        }

        // Committee details toggle
        const toggleDetailsBtn = Utils.DOM.getElementById('toggleCommitteeDetails');
        if (toggleDetailsBtn) {
            toggleDetailsBtn.addEventListener('click', () => {
                const details = document.querySelectorAll('.committee-details');
                const isVisible = details[0]?.style.display !== 'none';

                details.forEach(detail => {
                    detail.style.display = isVisible ? 'none' : 'block';
                });

                toggleDetailsBtn.textContent = isVisible ? 'Show Details' : 'Hide Details';
            });
        }

        // Export detailed report
        const exportDetailedBtn = Utils.DOM.getElementById('exportDetailedReportBtn');
        if (exportDetailedBtn) {
            exportDetailedBtn.addEventListener('click', () => {
                this.exportDetailedReport();
            });
        }
    }

    /**
     * Sort volunteer scores table
     */
    async sortVolunteerScores(sortBy) {
        try {
            const reportPeriod = Utils.DOM.getElementById('reportPeriod')?.value || 'week';

            // Calculate date range
            let dateRange = null;
            if (reportPeriod !== 'all') {
                const endDate = new Date();
                const startDate = new Date();

                switch (reportPeriod) {
                    case 'week':
                        startDate.setDate(endDate.getDate() - 7);
                        break;
                    case 'month':
                        startDate.setMonth(endDate.getMonth() - 1);
                        break;
                    case 'quarter':
                        startDate.setMonth(endDate.getMonth() - 3);
                        break;
                    case 'year':
                        startDate.setFullYear(endDate.getFullYear() - 1);
                        break;
                }

                dateRange = { start: startDate, end: endDate };
            }

            // Get sorted scores
            const sortedScores = await window.StorageManager.getVolunteerAttendanceScores(dateRange, sortBy);

            // Update table
            const tableBody = document.querySelector('#volunteerScoresTable tbody');
            if (tableBody) {
                tableBody.innerHTML = sortedScores.map((volunteer, index) => `
                    <tr class="volunteer-row ${volunteer.tier.toLowerCase()}-tier">
                        <td class="rank-cell">
                            <span class="rank-number">${index + 1}</span>
                            ${index < 3 ? `<span class="rank-medal">${['🥇', '🥈', '🥉'][index]}</span>` : ''}
                        </td>
                        <td class="name-cell">
                            <div class="volunteer-info">
                                <span class="volunteer-name">${volunteer.volunteerName}</span>
                                ${volunteer.lastAttendance ? `
                                    <span class="last-attendance">Last: ${Utils.Date.format(new Date(volunteer.lastAttendance), 'short')}</span>
                                ` : ''}
                            </div>
                        </td>
                        <td class="committee-cell">
                            <span class="committee-badge">${volunteer.committee}</span>
                        </td>
                        <td class="attendance-cell">
                            <span class="attendance-fraction">${volunteer.attendedEvents}/${volunteer.totalEvents}</span>
                        </td>
                        <td class="rate-cell">
                            <div class="rate-display">
                                <span class="rate-number">${volunteer.attendanceRate}%</span>
                                <div class="rate-bar">
                                    <div class="rate-fill" style="width: ${volunteer.attendanceRate}%"></div>
                                </div>
                            </div>
                        </td>
                        <td class="engagement-cell">
                            <span class="engagement-score">${volunteer.engagementScore}</span>
                        </td>
                        <td class="tier-cell">
                            <span class="tier-badge ${volunteer.tier.toLowerCase()}">${volunteer.tier}</span>
                        </td>
                    </tr>
                `).join('');
            }

        } catch (error) {
            console.error('Error sorting volunteer scores:', error);
        }
    }

    /**
     * Export detailed report
     */
    async exportDetailedReport() {
        try {
            const reportPeriod = Utils.DOM.getElementById('reportPeriod')?.value || 'week';

            // Calculate date range
            let dateRange = null;
            if (reportPeriod !== 'all') {
                const endDate = new Date();
                const startDate = new Date();

                switch (reportPeriod) {
                    case 'week':
                        startDate.setDate(endDate.getDate() - 7);
                        break;
                    case 'month':
                        startDate.setMonth(endDate.getMonth() - 1);
                        break;
                    case 'quarter':
                        startDate.setMonth(endDate.getMonth() - 3);
                        break;
                    case 'year':
                        startDate.setFullYear(endDate.getFullYear() - 1);
                        break;
                }

                dateRange = { start: startDate, end: endDate };
            }

            // Get comprehensive data
            const [volunteerScores, committeeStats] = await Promise.all([
                window.StorageManager.getVolunteerAttendanceScores(dateRange, 'attendanceRate'),
                window.StorageManager.getCommitteeAttendanceStats(dateRange)
            ]);

            // Create CSV content
            const csvContent = this.generateDetailedReportCSV(volunteerScores, committeeStats, reportPeriod);

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `attendance-report-${reportPeriod}-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error('Error exporting detailed report:', error);
            this.showError('Failed to export report. Please try again.');
        }
    }

    /**
     * Generate detailed report CSV
     */
    generateDetailedReportCSV(volunteerScores, committeeStats, period) {
        const headers = [
            'Rank', 'Volunteer Name', 'Committee', 'Attended Events', 'Total Events',
            'Attendance Rate (%)', 'Engagement Score', 'Consistency Score', 'Tier',
            'Last Attendance', 'Year to Date Attendance'
        ];

        const rows = volunteerScores.map((volunteer, index) => [
            index + 1,
            volunteer.volunteerName,
            volunteer.committee,
            volunteer.attendedEvents,
            volunteer.totalEvents,
            volunteer.attendanceRate,
            volunteer.engagementScore,
            volunteer.consistencyScore,
            volunteer.tier,
            volunteer.lastAttendance ? new Date(volunteer.lastAttendance).toLocaleDateString() : 'Never',
            volunteer.yearToDateAttendance
        ]);

        // Add committee summary
        const csvContent = [
            `Attendance Report - ${period.charAt(0).toUpperCase() + period.slice(1)}`,
            `Generated: ${new Date().toLocaleDateString()}`,
            '',
            'INDIVIDUAL VOLUNTEER PERFORMANCE',
            headers.join(','),
            ...rows.map(row => row.join(',')),
            '',
            'COMMITTEE SUMMARY',
            'Committee,Total Volunteers,Active Volunteers,Average Attendance Rate (%),Total Attendances,Top Performer',
            ...committeeStats.map(committee => [
                committee.committee,
                committee.totalVolunteers,
                committee.activeVolunteers,
                committee.avgAttendanceRate,
                committee.totalAttendances,
                committee.topPerformer ? `${committee.topPerformer.volunteerName} (${committee.topPerformer.attendanceRate}%)` : 'N/A'
            ].join(','))
        ].join('\n');

        return csvContent;
    }

    /**
     * Start periodic updates
     */
    startPeriodicUpdates() {
        // Update dashboard every 2 minutes (reduced from 30 seconds to minimize database load)
        this.updateInterval = setInterval(() => {
            if (this.currentView === 'dashboard') {
                // Clear cache before update to get fresh data
                this.clearCache('attendance');
                this.updateDashboard();
            }
        }, 120000); // 2 minutes instead of 30 seconds
    }

    /**
     * Stop periodic updates
     */
    stopPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Show/hide loading overlay
     */
    showLoading(show) {
        const loadingOverlay = Utils.DOM.getElementById('loadingOverlay');
        if (loadingOverlay) {
            if (show) {
                loadingOverlay.classList.add('active');
            } else {
                loadingOverlay.classList.remove('active');
            }
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        // For now, use alert - could be enhanced with a proper error modal
        alert(`Error: ${message}`);
    }

    /**
     * Show/hide modal
     */
    showModal(title, content, confirmText = 'Confirm', cancelText = 'Cancel') {
        const modalOverlay = Utils.DOM.getElementById('modalOverlay');
        const modalTitle = Utils.DOM.getElementById('modalTitle');
        const modalBody = Utils.DOM.getElementById('modalBody');
        const modalConfirm = Utils.DOM.getElementById('modalConfirm');
        const modalCancel = Utils.DOM.getElementById('modalCancel');

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
    }

    /**
     * Hide modal
     */
    hideModal() {
        const modalOverlay = Utils.DOM.getElementById('modalOverlay');
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    }

    /**
     * Handle environment change
     */
    async handleEnvironmentChange(eventDetail) {
        console.log('🔄 App handling environment change:', eventDetail);

        try {
            // Show loading overlay
            this.showLoading(true, 'Switching environments...');

            // Clear cache
            this.cache = {
                volunteers: null,
                events: null,
                attendance: null,
                lastUpdated: {
                    volunteers: 0,
                    events: 0,
                    attendance: 0
                }
            };

            // Stop periodic updates
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }

            // Wait for storage manager to reinitialize
            await this.waitForStorageManager();

            // Reinitialize views with new environment data
            await this.initializeViews();

            // Restart periodic updates
            this.startPeriodicUpdates();

            // Update UI to reflect new environment
            this.updateEnvironmentUI();

            // Hide loading overlay
            this.showLoading(false);

            console.log(`✅ App successfully switched to ${eventDetail.newEnvironment} environment`);

        } catch (error) {
            console.error('Failed to handle environment change:', error);
            this.showError('Failed to switch environments. Please refresh the page.');
            this.showLoading(false);
        }
    }

    /**
     * Update UI elements for current environment
     */
    updateEnvironmentUI() {
        // Update any environment-specific UI elements
        const config = window.EnvironmentManager ? window.EnvironmentManager.getCurrentConfig() : null;

        if (config) {
            // Update header styling for non-production environments
            const header = document.querySelector('.app-header');
            if (header && config.name !== 'Production') {
                header.style.borderBottom = `3px solid ${config.color}`;
            } else if (header) {
                header.style.borderBottom = '';
            }

            // Show/hide debug features
            const debugElements = document.querySelectorAll('.debug-only');
            debugElements.forEach(el => {
                el.style.display = config.features.debugMode ? 'block' : 'none';
            });
        }
    }
}

// Global troubleshooting functions for settings page
window.forceEnableScanner = function () {
    try {
        const scannerInput = document.getElementById('scannerInput');
        if (scannerInput) {
            scannerInput.disabled = false;
            scannerInput.placeholder = 'FORCE ENABLED: Scan badge or enter volunteer ID...';
            scannerInput.focus();
            console.log('✅ Scanner force enabled from settings');
            // Removed annoying popup - success logged to console instead
        } else {
            console.error('❌ Scanner input not found');
            alert('❌ Scanner input not found. Try refreshing the page.');
        }

        // Also try via scanner manager
        if (window.scanner && typeof window.scanner.forceEnable === 'function') {
            window.scanner.forceEnable();
        }
    } catch (error) {
        console.error('Error force enabling scanner:', error);
        alert('❌ Error: ' + error.message);
    }
};

window.disableGoogleSync = function () {
    try {
        if (window.Config) {
            window.Config.features.googleSheetsSync = false;
        }
        localStorage.removeItem('googleSheetsToken');
        localStorage.removeItem('googleSheetsCredentials');
        localStorage.removeItem('googleSheetsCredentials_development');
        localStorage.removeItem('googleSheetsCredentials_production');

        console.log('✅ Google Sheets sync disabled');
        alert('✅ Google Sheets sync has been disabled. Refresh the page to apply changes.');
    } catch (error) {
        console.error('Error disabling Google sync:', error);
        alert('❌ Error: ' + error.message);
    }
};

window.clearAppCache = function () {
    try {
        // Clear app cache
        if (window.app && typeof window.app.clearCache === 'function') {
            window.app.clearCache();
        }

        // Clear localStorage items (keep credentials)
        const keysToKeep = ['googleSheetsCredentials', 'googleSheetsCredentials_development', 'googleSheetsCredentials_production'];
        const allKeys = Object.keys(localStorage);

        allKeys.forEach(key => {
            if (!keysToKeep.includes(key)) {
                localStorage.removeItem(key);
            }
        });

        console.log('✅ App cache cleared');
        alert('✅ App cache cleared. The page will refresh.');
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Error clearing cache:', error);
        alert('❌ Error: ' + error.message);
    }
};

window.createTestEvent = function () {
    try {
        if (!window.StorageManager) {
            alert('❌ Storage manager not available');
            return;
        }

        const today = new Date();
        const todayStr = today.getFullYear() + '-' +
            String(today.getMonth() + 1).padStart(2, '0') + '-' +
            String(today.getDate()).padStart(2, '0');

        const eventId = `TEST${Date.now()}`;

        const event = {
            eventId: eventId,
            eventName: 'Test Event for Scanner',
            date: todayStr,
            type: 'Special',
            status: 'Active',
            description: 'Test event created from troubleshooting'
        };

        window.StorageManager.addEvent(event).then(() => {
            console.log('✅ Test event created');
            // Removed annoying popup - success logged to console instead

            // Refresh events view if we're on it
            if (window.app && window.app.currentView === 'events') {
                window.app.updateEventsView();
            }
        }).catch(error => {
            console.error('Error creating test event:', error);
            alert('❌ Error creating test event: ' + error.message);
        });

    } catch (error) {
        console.error('Error creating test event:', error);
        alert('❌ Error: ' + error.message);
    }
};

window.runSystemDiagnostics = function () {
    try {
        let diagnostics = '🏥 SYSTEM DIAGNOSTICS REPORT\n\n';

        // Check storage
        diagnostics += '💾 STORAGE:\n';
        diagnostics += `- StorageManager: ${window.StorageManager ? '✅ Available' : '❌ Not available'}\n`;
        diagnostics += `- Database: ${window.StorageManager?.db ? '✅ Connected' : '❌ Not connected'}\n`;

        // Check scanner
        diagnostics += '\n📱 SCANNER:\n';
        const scannerInput = document.getElementById('scannerInput');
        diagnostics += `- Scanner Input: ${scannerInput ? '✅ Found' : '❌ Not found'}\n`;
        diagnostics += `- Scanner Disabled: ${scannerInput?.disabled ? '❌ Yes' : '✅ No'}\n`;
        diagnostics += `- Scanner Manager: ${window.scanner ? '✅ Available' : '❌ Not available'}\n`;

        // Check config
        diagnostics += '\n⚙️ CONFIGURATION:\n';
        diagnostics += `- Config: ${window.Config ? '✅ Available' : '❌ Not available'}\n`;
        diagnostics += `- Environment: ${window.Config?.environment || 'Unknown'}\n`;
        diagnostics += `- Google Sheets Sync: ${window.Config?.features?.googleSheetsSync ? '✅ Enabled' : '❌ Disabled'}\n`;

        // Check sync
        diagnostics += '\n🔄 SYNC SYSTEM:\n';
        diagnostics += `- Sync Manager: ${window.SyncManager ? '✅ Available' : '❌ Not available'}\n`;
        diagnostics += `- Google Sheets Service: ${window.GoogleSheetsService ? '✅ Available' : '❌ Not available'}\n`;

        console.log(diagnostics);
        alert(diagnostics);

    } catch (error) {
        console.error('Error running diagnostics:', error);
        alert('❌ Error running diagnostics: ' + error.message);
    }
};

window.showSystemInfo = function () {
    try {
        let info = '📋 SYSTEM INFORMATION\n\n';

        info += `🌐 Browser: ${navigator.userAgent}\n`;
        info += `📱 Platform: ${navigator.platform}\n`;
        info += `🔗 URL: ${window.location.href}\n`;
        info += `⏰ Current Time: ${new Date().toLocaleString()}\n`;
        info += `💾 Local Storage: ${Object.keys(localStorage).length} items\n`;

        console.log(info);
        alert(info);

    } catch (error) {
        console.error('Error showing system info:', error);
        alert('❌ Error: ' + error.message);
    }
};

// Add handleSyncStatusChange to the VolunteerAttendanceApp prototype
VolunteerAttendanceApp.prototype.handleSyncStatusChange = function (detail) {
    const { status, isOnline, isSyncing, queueLength, stats } = detail;

    // Update sync status indicator
    const statusIndicator = document.querySelector('.sync-status-indicator');
    const statusText = document.querySelector('.sync-status-text');
    const syncInfo = document.querySelector('.sync-info');

    if (statusIndicator) {
        statusIndicator.className = `sync-status-indicator ${status}`;
    }

    if (statusText) {
        const statusMessages = {
            online: 'Online',
            offline: 'Offline',
            syncing: 'Syncing...',
            error: 'Sync Error'
        };
        statusText.textContent = statusMessages[status] || 'Unknown';
    }

    if (syncInfo) {
        const pendingItems = queueLength || 0;
        const lastSync = stats?.lastSyncTime ?
            new Date(stats.lastSyncTime).toLocaleTimeString() : 'Never';
        const successRate = stats?.successRate || 100;

        syncInfo.innerHTML = `
                <div class="sync-detail">Queue: ${pendingItems} items</div>
                <div class="sync-detail">Last sync: ${lastSync}</div>
                <div class="sync-detail">Success rate: ${successRate}%</div>
            `;
    }
};

// Add handleGoogleSync to the VolunteerAttendanceApp prototype
VolunteerAttendanceApp.prototype.handleGoogleSync = async function () {
    if (!window.SyncManager) {
        this.showError('Sync manager not available');
        return;
    }

    if (!window.GoogleSheetsService) {
        this.showError('Google Sheets service not available');
        return;
    }

    try {
        const status = window.GoogleSheetsService.getStatus();
        console.log('Google Sheets status:', status);

        if (!status.hasCredentials) {
            // Show credentials setup modal using existing modal system
            this.showGoogleSheetsSetupModal();
            return;
        }

        // Show loading
        this.showLoading(true);

        if (!status.isAuthenticated) {
            // Authenticate with Google
            console.log('Authenticating with Google...');
            await window.GoogleSheetsService.authenticate();
        }

        // Load events from Google Sheets using StorageManager method
        console.log('📊 Loading events from Google Sheets...');
        await window.StorageManager.syncEventsFromGoogleSheets();

        // Check how many events we now have
        const events = await window.StorageManager.getAllEvents();
        console.log(`📊 Total events after sync: ${events.length}`);

        // Show success message
        this.showModal(
            'Google Sheets Sync Complete',
            `
                <div style="text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">✅</div>
                    <p><strong>Successfully loaded events from Google Sheets!</strong></p>
                    <div style="margin: 1rem 0; padding: 1rem; background: #f8f9fa; border-radius: 4px;">
                        <div style="font-size: 1.5rem; color: #28a745; font-weight: bold;">${events.length}</div>
                        <div style="color: #666;">Events loaded</div>
                    </div>
                    <p style="font-size: 0.9rem; color: #666;">
                        Events are now available in the Events tab.
                    </p>
                </div>
                `,
            'Close',
            ''
        );

        // Refresh events view
        if (this.currentView === 'events') {
            await this.updateEventsView();
        }

        // Clear cache to ensure fresh data
        this.clearCache();

    } catch (error) {
        console.error('📊 Google Sheets sync failed:', error);

        let errorMessage = error.message;
        if (error.message.includes('credentials')) {
            errorMessage = 'Google Sheets credentials not configured. Please set up your API credentials.';
        } else if (error.message.includes('authentication')) {
            errorMessage = 'Google Sheets authentication failed. Please check your credentials.';
        } else if (error.message.includes('spreadsheet')) {
            errorMessage = 'Could not access the Google Sheet. Please check the spreadsheet ID and permissions.';
        }

        this.showError(`Sync failed: ${errorMessage}`);

    } finally {
        this.showLoading(false);
    }
};

// Add handleForceSync to the VolunteerAttendanceApp prototype
VolunteerAttendanceApp.prototype.handleForceSync = async function () {
    if (!window.SyncManager) {
        this.showError('Sync manager not available');
        return;
    }

    try {
        this.showLoading(true);
        console.log('Force sync requested');

        await window.SyncManager.forcSync();

        const stats = window.SyncManager.getStats();

        this.showModal(
            'Force Sync Complete',
            `
                <div style="text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">⚡</div>
                    <p>Force sync completed successfully!</p>
                    <div style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 4px;">
                        <ul style="text-align: left; display: inline-block; font-size: 0.9rem;">
                            <li>Pending items: ${stats.pendingItems}</li>
                            <li>Failed items: ${stats.failedItems}</li>
                            <li>Success rate: ${stats.successRate}%</li>
                        </ul>
                    </div>
                </div>
                `,
            'Close',
            ''
        );

    } catch (error) {
        console.error('Force sync failed:', error);
        this.showModal('Force Sync Failed', `<div style="color: #e74c3c;">Force sync failed: ${error.message}</div>`, 'Close', '');
    } finally {
        this.showLoading(false);
    }
};

// Add testGoogleSheetsConnection to the VolunteerAttendanceApp prototype
VolunteerAttendanceApp.prototype.testGoogleSheetsConnection = async function () {
    if (!window.GoogleSheetsService) {
        this.showError('Google Sheets service not available');
        return;
    }

    try {
        this.showLoading(true);

        const result = await window.GoogleSheetsService.testConnection();

        if (result.success) {
            this.showModal(
                'Connection Test Successful',
                `
                    <div style="text-align: center;">
                        <div style="font-size: 2rem; margin-bottom: 1rem;">✅</div>
                        <p><strong>${result.message}</strong></p>
                        <div style="margin: 1rem 0; text-align: left;">
                            <p><strong>Available Sheets:</strong></p>
                            <ul>
                                ${result.sheets.map(sheet => `<li>${sheet}</li>`).join('')}
                            </ul>
                        </div>
                        <p style="margin-top: 1rem;">
                            <a href="https://docs.google.com/spreadsheets/d/${window.GoogleSheetsService.spreadsheetId}" 
                               target="_blank" class="btn btn-primary">
                                View Google Sheet
                            </a>
                        </p>
                    </div>
                    `,
                'Close',
                ''
            );
        } else {
            this.showModal(
                'Connection Test Failed',
                `
                    <div style="color: #e74c3c; text-align: center;">
                        <div style="font-size: 2rem; margin-bottom: 1rem;">❌</div>
                        <p><strong>${result.message}</strong></p>
                        <div style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
                            <p>Common solutions:</p>
                            <ul style="text-align: left; display: inline-block;">
                                <li>Verify the Google Sheet ID is correct</li>
                                <li>Check that the API key has Sheets API access</li>
                                <li>Ensure the sheet is publicly accessible or shared</li>
                            </ul>
                        </div>
                    </div>
                    `,
                'Close',
                ''
            );
        }

    } catch (error) {
        console.error('Connection test error:', error);
        this.showModal('Test Failed', `<div style="color: #e74c3c;">Test failed: ${error.message}</div>`, 'Close', '');
    } finally {
        this.showLoading(false);
    }
}

// Add testBasicConnection to the VolunteerAttendanceApp prototype
VolunteerAttendanceApp.prototype.testBasicConnection = async function () {
    if (!window.GoogleSheetsService) {
        this.showError('Google Sheets service not available');
        return;
    }

    try {
        this.showLoading(true);

        const result = await window.GoogleSheetsService.testBasicConnection();

        if (result.success) {
            this.showModal(
                'Basic Connection Test Successful',
                `
                    <div style="text-align: center;">
                        <div style="font-size: 2rem; margin-bottom: 1rem;">✅</div>
                        <p><strong>${result.message}</strong></p>
                        <div style="margin: 1rem 0; text-align: left;">
                            <p><strong>Available Sheets:</strong></p>
                            <ul>
                                ${result.sheets.map(sheet => `<li>${sheet}</li>`).join('')}
                            </ul>
                        </div>
                        <div style="background: #d4edda; padding: 1rem; border-radius: 4px; margin-top: 1rem;">
                            <p style="margin: 0; color: #155724;"><strong>✅ API Key works!</strong></p>
                            <p style="margin: 0.5rem 0 0 0; color: #155724;">Your API key and spreadsheet ID are correct.</p>
                        </div>
                        <p style="margin-top: 1rem;">
                            <a href="https://docs.google.com/spreadsheets/d/${window.GoogleSheetsService.spreadsheetId}" 
                               target="_blank" class="btn btn-primary">
                                View Google Sheet
                            </a>
                        </p>
                    </div>
                    `,
                'Close',
                ''
            );
        } else {
            this.showModal(
                'Basic Connection Test Failed',
                `
                    <div style="color: #e74c3c; text-align: center;">
                        <div style="font-size: 2rem; margin-bottom: 1rem;">❌</div>
                        <p><strong>${result.message}</strong></p>
                        <div style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
                            <p>Common solutions:</p>
                            <ul style="text-align: left; display: inline-block;">
                                <li>Verify the Google Sheet ID is correct</li>
                                <li>Check that the API key has Sheets API access</li>
                                <li>Ensure the sheet is publicly accessible or shared</li>
                                <li>Make sure the API key is not restricted to wrong domains</li>
                            </ul>
                        </div>
                    </div>
                    `,
                'Close',
                ''
            );
        }

    } catch (error) {
        console.error('Basic connection test error:', error);
        this.showModal('Test Failed', `<div style="color: #e74c3c;">Test failed: ${error.message}</div>`, 'Close', '');
    } finally {
        this.showLoading(false);
    }
}

/**
 * Show Google Sheets setup modal
 */
showGoogleSheetsSetupModal() {
    const setupContent = `
            <div>
                <p>To enable Google Sheets integration, you need to set up a Google Cloud project and get API credentials.</p>
                
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
                    <h4>Quick Setup Guide:</h4>
                    <ol style="margin: 0.5rem 0; padding-left: 1.5rem;">
                        <li>Go to <a href="https://console.cloud.google.com" target="_blank">Google Cloud Console</a></li>
                        <li>Create a new project or select existing one</li>
                        <li>Enable the Google Sheets API</li>
                        <li>Create credentials (API Key and OAuth 2.0 Client ID)</li>
                        <li>Create a Google Sheet and copy its ID from the URL</li>
                    </ol>
                </div>

                <form id="credentialsForm" onsubmit="app.handleCredentialsSubmit(event)">
                    <div style="margin-bottom: 1rem;">
                        <label for="apiKey" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">API Key:</label>
                        <input type="text" id="apiKey" name="apiKey" required 
                               style="width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 6px;"
                               placeholder="AIza..." autocomplete="off">
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label for="clientId" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">OAuth Client ID:</label>
                        <input type="text" id="clientId" name="clientId" required 
                               style="width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 6px;"
                               placeholder="123456789-...googleusercontent.com" autocomplete="off">
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label for="spreadsheetId" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Google Sheet ID:</label>
                        <input type="text" id="spreadsheetId" name="spreadsheetId" required 
                               style="width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 6px;"
                               placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" autocomplete="off">
                        <small style="color: #666; font-size: 0.8rem; display: block; margin-top: 0.25rem;">
                            Copy from the Google Sheet URL between /d/ and /edit
                        </small>
                    </div>
                </form>
            </div>
        `;

    // Update modal footer to have custom buttons
    this.showModal('Google Sheets Integration Setup', setupContent, 'Save & Connect', 'Cancel');

    // Override the confirm button behavior
    const modalConfirm = document.getElementById('modalConfirm');
    const modalCancel = document.getElementById('modalCancel');

    if (modalConfirm) {
        modalConfirm.onclick = () => {
            const form = document.getElementById('credentialsForm');
            if (form) {
                this.handleCredentialsSubmit({ preventDefault: () => { }, target: form });
            }
        };
    }

    // Focus first input
    setTimeout(() => {
        const firstInput = document.getElementById('apiKey');
        if (firstInput) {
            firstInput.focus();
        }
    }, 100);
}

/**
 * Handle credentials form submission
 */
handleCredentialsSubmit(event) {
    event.preventDefault();

    const form = event.target || document.getElementById('credentialsForm');
    const credentials = {
        apiKey: form.apiKey.value.trim(),
        clientId: form.clientId.value.trim(),
        spreadsheetId: form.spreadsheetId.value.trim()
    };

    console.log('Credentials entered:', {
        apiKey: credentials.apiKey ? 'Present' : 'Missing',
        clientId: credentials.clientId ? 'Present' : 'Missing',
        spreadsheetId: credentials.spreadsheetId ? 'Present' : 'Missing'
    });

    // Validate credentials
    if (!credentials.apiKey || !credentials.clientId || !credentials.spreadsheetId) {
        alert('Please fill in all fields');
        return;
    }

    // Store credentials
    localStorage.setItem('googleSheetsCredentials', JSON.stringify(credentials));

    // Update Google Sheets service
    if (window.GoogleSheetsService) {
        window.GoogleSheetsService.apiKey = credentials.apiKey;
        window.GoogleSheetsService.clientId = credentials.clientId;
        window.GoogleSheetsService.spreadsheetId = credentials.spreadsheetId;
    }

    console.log('Credentials stored successfully');

    // Close modal
    this.hideModal();

    // Show success message and offer to sync
    this.showModal(
        'Credentials Saved',
        `
            <div style="text-align: center;">
                <div style="font-size: 2rem; margin-bottom: 1rem;">✅</div>
                <p>Google Sheets credentials have been saved successfully!</p>
                <p style="margin-top: 1rem;">Would you like to test the connection and sync your data now?</p>
            </div>
            `,
        'Sync Now',
        'Later'
    );

    // Override confirm button to trigger sync
    const modalConfirm = document.getElementById('modalConfirm');
    if (modalConfirm) {
        modalConfirm.onclick = () => {
            this.hideModal();
            this.handleGoogleSync();
        };
    }
}

// Placeholder methods for future implementation
showSettings() {
    console.log('🔧 showSettings called - redirecting to settings.html');
    
    // Force redirect to the comprehensive settings page
    try {
        window.location.href = 'settings.html';
    } catch (error) {
        console.error('Error redirecting to settings:', error);
        // Fallback: try different redirect methods
        window.location.assign('settings.html');
    }
}

/**
 * Show add volunteer modal with form
 */
showAddVolunteerModal() {
    const modalContent = `
            <form id="addVolunteerForm">
                <div style="margin-bottom: 1rem;">
                    <label for="volunteerId">Volunteer ID *</label>
                    <input type="text" id="volunteerId" name="id" required 
                           placeholder="e.g., V001" style="margin-top: 0.5rem;">
                </div>
                <div style="margin-bottom: 1rem;">
                    <label for="volunteerName">Full Name *</label>
                    <input type="text" id="volunteerName" name="name" required 
                           placeholder="e.g., John Doe" style="margin-top: 0.5rem;">
                </div>
                <div style="margin-bottom: 1rem;">
                    <label for="volunteerCommittee">Committee</label>
                    <select id="volunteerCommittee" name="committee" style="margin-top: 0.5rem; width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 6px;">
                        <option value="General">General</option>
                        <option value="Events">Events</option>
                        <option value="Hospitality">Hospitality</option>
                        <option value="Setup">Setup</option>
                        <option value="Cleanup">Cleanup</option>
                        <option value="Registration">Registration</option>
                        <option value="Security">Security</option>
                        <option value="Technical">Technical</option>
                    </select>
                </div>
                <div style="margin-bottom: 1rem;">
                    <label for="volunteerEmail">Email (optional)</label>
                    <input type="email" id="volunteerEmail" name="email" 
                           placeholder="e.g., john.doe@example.com" style="margin-top: 0.5rem;">
                </div>
                <div style="margin-bottom: 1rem;">
                    <label for="volunteerStatus">Status</label>
                    <select id="volunteerStatus" name="status" style="margin-top: 0.5rem; width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 6px;">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Suspended">Suspended</option>
                    </select>
                </div>
            </form>
        `;

    this.showModal('Add Volunteer', modalContent, 'Add Volunteer', 'Cancel');

    // Handle form submission
    const modalConfirm = Utils.DOM.getElementById('modalConfirm');
    if (modalConfirm) {
        modalConfirm.onclick = () => this.handleAddVolunteer();
    }
}

    /**
     * Handle add volunteer form submission
     */
    async handleAddVolunteer() {
    try {
        const form = Utils.DOM.getElementById('addVolunteerForm');
        if (!form) return;

        const formData = new FormData(form);
        const volunteerData = {
            id: formData.get('id').trim(),
            name: formData.get('name').trim(),
            committee: formData.get('committee') || 'General',
            email: formData.get('email').trim() || null,
            status: formData.get('status') || 'Active'
        };

        // Validate required fields
        if (!volunteerData.id || !volunteerData.name) {
            this.showError('Volunteer ID and Name are required');
            return;
        }

        // Show loading
        this.showLoading(true);

        // Add volunteer to storage
        await window.StorageManager.addVolunteer(volunteerData);

        // Hide modal and loading
        this.hideModal();
        this.showLoading(false);

        // Refresh volunteers view
        await this.updateVolunteersView();

        // Show success message
        this.showModal(
            'Success',
            `<div style="text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">✅</div>
                    <p><strong>${volunteerData.name}</strong> has been added successfully!</p>
                    <p style="color: #666; margin-top: 0.5rem;">ID: ${volunteerData.id}</p>
                </div>`,
            'Close',
            ''
        );

    } catch (error) {
        this.showLoading(false);
        console.error('Error adding volunteer:', error);
        this.showError(error.message || 'Failed to add volunteer');
    }
}

/**
 * Show import volunteers modal with CSV upload
 */
showImportVolunteersModal() {
    const modalContent = `
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 1rem;">Import Volunteers from CSV</h4>
                <p style="color: #666; margin-bottom: 1rem;">
                    Upload a CSV file with volunteer information. The file should have the following columns:
                </p>
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
                    <strong>Required columns:</strong> ID, Name<br>
                    <strong>Optional columns:</strong> Committee, Email, Status
                </div>
                <div style="margin-bottom: 1rem;">
                    <label for="csvFile">Select CSV File</label>
                    <input type="file" id="csvFile" accept=".csv" 
                           style="margin-top: 0.5rem; width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 6px;">
                </div>
                <div style="margin-bottom: 1rem;">
                    <label>
                        <input type="checkbox" id="skipDuplicates" checked style="margin-right: 0.5rem;">
                        Skip duplicate volunteer IDs
                    </label>
                </div>
                <div id="csvPreview" style="display: none; margin-top: 1rem;">
                    <h5>Preview:</h5>
                    <div id="csvPreviewContent" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 0.5rem; background: #f9f9f9;"></div>
                </div>
            </div>
        `;

    this.showModal('Import Volunteers', modalContent, 'Import', 'Cancel');

    // Handle file selection
    const csvFile = Utils.DOM.getElementById('csvFile');
    if (csvFile) {
        csvFile.addEventListener('change', (e) => this.previewCSV(e.target.files[0]));
    }

    // Handle import
    const modalConfirm = Utils.DOM.getElementById('modalConfirm');
    if (modalConfirm) {
        modalConfirm.onclick = () => this.handleImportVolunteers();
    }
}

    /**
     * Preview CSV file contents
     */
    async previewCSV(file) {
    if (!file) return;

    try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            this.showError('CSV file must have at least a header row and one data row');
            return;
        }

        const preview = lines.slice(0, 6); // Show first 5 rows + header
        const previewHTML = preview.map((line, index) => {
            const cells = line.split(',').map(cell => cell.trim());
            const cellsHTML = cells.map(cell => `<td style="padding: 0.25rem; border: 1px solid #ddd;">${cell}</td>`).join('');
            const rowStyle = index === 0 ? 'background: #f0f0f0; font-weight: bold;' : '';
            return `<tr style="${rowStyle}">${cellsHTML}</tr>`;
        }).join('');

        const previewDiv = Utils.DOM.getElementById('csvPreview');
        const previewContent = Utils.DOM.getElementById('csvPreviewContent');

        if (previewDiv && previewContent) {
            previewContent.innerHTML = `
                    <table style="width: 100%; border-collapse: collapse;">
                        ${previewHTML}
                    </table>
                    ${lines.length > 6 ? `<p style="margin-top: 0.5rem; color: #666;">... and ${lines.length - 6} more rows</p>` : ''}
                `;
            previewDiv.style.display = 'block';
        }

    } catch (error) {
        console.error('Error previewing CSV:', error);
        this.showError('Error reading CSV file');
    }
}

    /**
     * Handle CSV import
     */
    async handleImportVolunteers() {
    try {
        const csvFile = Utils.DOM.getElementById('csvFile');
        const skipDuplicates = Utils.DOM.getElementById('skipDuplicates');

        if (!csvFile || !csvFile.files[0]) {
            this.showError('Please select a CSV file');
            return;
        }

        const file = csvFile.files[0];
        const skipDups = skipDuplicates ? skipDuplicates.checked : true;

        // Show loading
        this.showLoading(true);

        // Read and import CSV
        const csvContent = await file.text();
        const result = await window.StorageManager.importVolunteersFromCSV(csvContent, skipDups);

        // Hide modal and loading
        this.hideModal();
        this.showLoading(false);

        // Refresh volunteers view
        await this.updateVolunteersView();

        // Show results
        const resultMessage = `
                <div style="text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">📊</div>
                    <h4>Import Results</h4>
                    <div style="margin: 1rem 0; text-align: left;">
                        <p>✅ <strong>${result.success}</strong> volunteers imported successfully</p>
                        ${result.skipped > 0 ? `<p>⏭️ <strong>${result.skipped}</strong> volunteers skipped (duplicates)</p>` : ''}
                        ${result.errors > 0 ? `<p>❌ <strong>${result.errors}</strong> volunteers failed to import</p>` : ''}
                    </div>
                    ${result.errorDetails.length > 0 ? `
                        <details style="margin-top: 1rem; text-align: left;">
                            <summary>Error Details</summary>
                            <ul style="margin-top: 0.5rem;">
                                ${result.errorDetails.map(error => `<li style="color: #e74c3c;">${error}</li>`).join('')}
                            </ul>
                        </details>
                    ` : ''}
                </div>
            `;

        this.showModal('Import Complete', resultMessage, 'Close', '');

    } catch (error) {
        this.showLoading(false);
        console.error('Error importing volunteers:', error);
        this.showError(error.message || 'Failed to import volunteers');
    }
}

/**
 * Show add event modal
 */
showAddEventModal() {
    const modalContent = `
            <form id="addEventForm" class="event-form">
                <div class="form-group">
                    <label for="eventName">Event Name *</label>
                    <input type="text" id="eventName" name="eventName" required 
                           placeholder="e.g., Sunday Service, Special Event">
                </div>
                
                <div class="form-group">
                    <label for="eventDate">Event Date *</label>
                    <input type="date" id="eventDate" name="eventDate" required>
                </div>
                
                <div class="form-group">
                    <label for="eventType">Event Type *</label>
                    <select id="eventType" name="eventType" required>
                        <option value="">Select event type</option>
                        <option value="Special">Special Event (One-time)</option>
                        <option value="Recurring">Recurring Event</option>
                        <option value="Daily">Daily Event</option>
                    </select>
                </div>
                
                <div class="form-group recurring-options" id="recurringOptions" style="display: none;">
                    <label for="recurringPattern">Recurring Pattern</label>
                    <select id="recurringPattern" name="recurringPattern">
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Daily">Daily</option>
                    </select>
                </div>
                
                <div class="form-group recurring-options" id="dayOfWeekGroup" style="display: none;">
                    <label for="dayOfWeek">Day of Week</label>
                    <select id="dayOfWeek" name="dayOfWeek">
                        <option value="Sunday">Sunday</option>
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                    </select>
                </div>
                
                <div class="form-group recurring-options" id="endDateGroup" style="display: none;">
                    <label for="endDate">End Date (optional)</label>
                    <input type="date" id="endDate" name="endDate">
                    <small class="form-help">Leave empty for ongoing recurring events</small>
                </div>
                
                <div class="form-group">
                    <label for="eventDescription">Description (optional)</label>
                    <textarea id="eventDescription" name="eventDescription" rows="3" 
                              placeholder="Additional details about the event"></textarea>
                </div>
                
                <div class="form-group">
                    <label for="eventStatus">Status</label>
                    <select id="eventStatus" name="eventStatus">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>
            </form>
        `;

    this.showModal('Add Event', modalContent, 'Create Event', 'Cancel');

    // Setup form behavior
    const eventTypeSelect = Utils.DOM.getElementById('eventType');
    const recurringOptions = document.querySelectorAll('.recurring-options');

    if (eventTypeSelect) {
        eventTypeSelect.addEventListener('change', (e) => {
            const isRecurring = e.target.value === 'Recurring';
            recurringOptions.forEach(option => {
                option.style.display = isRecurring ? 'block' : 'none';
            });

            // Set default day of week to Sunday for recurring events
            if (isRecurring) {
                const dayOfWeekSelect = Utils.DOM.getElementById('dayOfWeek');
                if (dayOfWeekSelect) {
                    dayOfWeekSelect.value = 'Sunday';
                }
            }
        });
    }

    // Set default date to today
    const eventDateInput = Utils.DOM.getElementById('eventDate');
    if (eventDateInput) {
        const today = new Date();
        eventDateInput.value = today.toISOString().split('T')[0];
    }

    // Handle form submission
    const modalConfirm = Utils.DOM.getElementById('modalConfirm');
    if (modalConfirm) {
        modalConfirm.onclick = () => this.handleAddEvent();
    }
}

    /**
     * Handle add event form submission
     */
    async handleAddEvent() {
    try {
        const form = Utils.DOM.getElementById('addEventForm');
        if (!form) return;

        const formData = new FormData(form);
        const eventData = {
            eventName: formData.get('eventName')?.trim(),
            eventDate: formData.get('eventDate'),
            eventType: formData.get('eventType'),
            recurringPattern: formData.get('recurringPattern'),
            dayOfWeek: formData.get('dayOfWeek'),
            endDate: formData.get('endDate') || null,
            description: formData.get('eventDescription')?.trim() || null,
            status: formData.get('eventStatus') || 'Active'
        };

        // Validate required fields
        if (!eventData.eventName) {
            this.showError('Event name is required');
            return;
        }

        if (!eventData.eventDate) {
            this.showError('Event date is required');
            return;
        }

        if (!eventData.eventType) {
            this.showError('Event type is required');
            return;
        }

        // Show loading
        this.showLoading(true);

        // Create the event(s)
        if (eventData.eventType === 'Recurring') {
            await this.createRecurringEvents(eventData);
        } else {
            await this.createSingleEvent(eventData);
        }

        // Hide modal and refresh events view
        this.hideModal();
        await this.updateEventsView();

        // Show success message
        const eventCount = eventData.eventType === 'Recurring' ? 'recurring events' : 'event';
        this.showModal(
            'Success',
            `<div style="text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">✅</div>
                    <p><strong>${eventData.eventName}</strong> ${eventCount} created successfully!</p>
                </div>`,
            'Close',
            ''
        );

    } catch (error) {
        console.error('Error creating event:', error);
        this.showError(`Failed to create event: ${error.message}`);
    } finally {
        this.showLoading(false);
    }
}

    /**
     * Create a single event
     */
    async createSingleEvent(eventData) {
    const eventDate = new Date(eventData.eventDate);
    const eventId = `E${eventDate.getFullYear()}${String(eventDate.getMonth() + 1).padStart(2, '0')}${String(eventDate.getDate()).padStart(2, '0')}`;

    const event = {
        eventId: eventId,
        eventName: eventData.eventName,
        date: eventData.eventDate,
        type: eventData.eventType,
        status: eventData.status,
        description: eventData.description,
        dayOfWeek: eventDate.toLocaleDateString('en-US', { weekday: 'long' })
    };

    await window.StorageManager.addEvent(event);
    console.log('Single event created:', event);
}

    /**
     * Create recurring events
     */
    async createRecurringEvents(eventData) {
    const startDate = new Date(eventData.eventDate);
    const endDate = eventData.endDate ? new Date(eventData.endDate) : null;
    const pattern = eventData.recurringPattern || 'Weekly';
    const dayOfWeek = eventData.dayOfWeek || 'Sunday';

    // Calculate how many events to create (default: 1 year or until end date)
    const maxDate = endDate || new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
    const events = [];

    let currentDate = new Date(startDate);
    let eventCount = 0;
    const maxEvents = 100; // Safety limit

    // Adjust start date to match the specified day of week for weekly recurring events
    if (pattern === 'Weekly') {
        const targetDayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(dayOfWeek);
        const currentDayIndex = currentDate.getDay();
        const daysToAdd = (targetDayIndex - currentDayIndex + 7) % 7;
        currentDate.setDate(currentDate.getDate() + daysToAdd);
    }

    while (currentDate <= maxDate && eventCount < maxEvents) {
        const eventId = `E${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;

        const event = {
            eventId: eventId,
            eventName: eventData.eventName,
            date: currentDate.toISOString().split('T')[0],
            type: 'Recurring',
            status: eventData.status,
            recurringPattern: pattern,
            dayOfWeek: dayOfWeek,
            description: eventData.description,
            parentEventId: `${eventData.eventName.replace(/\s+/g, '')}_${pattern}_${dayOfWeek}`
        };

        events.push(event);
        eventCount++;

        // Calculate next occurrence
        switch (pattern) {
            case 'Weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'Monthly':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
            case 'Daily':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
        }
    }

    // Create all events
    for (const event of events) {
        try {
            await window.StorageManager.addEvent(event);
        } catch (error) {
            // Skip if event already exists (duplicate date)
            if (!error.message.includes('already exists')) {
                throw error;
            }
        }
    }

    console.log(`Created ${events.length} recurring events for ${eventData.eventName}`);
}

    /**
     * Show edit event modal
     */
    async showEditEventModal(eventId) {
    try {
        const event = await window.StorageManager.getEvent(eventId);
        if (!event) {
            this.showError('Event not found');
            return;
        }

        const modalContent = `
                <form id="editEventForm" class="event-form">
                    <input type="hidden" id="editEventId" value="${event.eventId}">
                    
                    <div class="form-group">
                        <label for="editEventName">Event Name *</label>
                        <input type="text" id="editEventName" name="eventName" required 
                               value="${event.eventName}" placeholder="e.g., Sunday Service, Special Event">
                    </div>
                    
                    <div class="form-group">
                        <label for="editEventDate">Event Date *</label>
                        <input type="date" id="editEventDate" name="eventDate" required value="${event.date}">
                    </div>
                    
                    <div class="form-group">
                        <label for="editEventType">Event Type *</label>
                        <select id="editEventType" name="eventType" required>
                            <option value="Special" ${event.type === 'Special' ? 'selected' : ''}>Special Event (One-time)</option>
                            <option value="Recurring" ${event.type === 'Recurring' ? 'selected' : ''}>Recurring Event</option>
                            <option value="Daily" ${event.type === 'Daily' ? 'selected' : ''}>Daily Event</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="editEventDescription">Description (optional)</label>
                        <textarea id="editEventDescription" name="eventDescription" rows="3" 
                                  placeholder="Additional details about the event">${event.description || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="editEventStatus">Status</label>
                        <select id="editEventStatus" name="eventStatus">
                            <option value="Active" ${event.status === 'Active' ? 'selected' : ''}>Active</option>
                            <option value="Inactive" ${event.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                            <option value="Cancelled" ${event.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                    
                    ${event.type === 'Recurring' ? `
                        <div class="form-group">
                            <label>Recurring Pattern</label>
                            <p class="form-info">${event.recurringPattern || 'Weekly'} - ${event.dayOfWeek || 'Sunday'}</p>
                            <small class="form-help">To change recurring pattern, delete and recreate the event series</small>
                        </div>
                    ` : ''}
                </form>
            `;

        this.showModal('Edit Event', modalContent, 'Update Event', 'Cancel');

        // Handle form submission
        const modalConfirm = Utils.DOM.getElementById('modalConfirm');
        if (modalConfirm) {
            modalConfirm.onclick = () => this.handleEditEvent();
        }

    } catch (error) {
        console.error('Error loading event for edit:', error);
        this.showError(`Failed to load event: ${error.message}`);
    }
}

    /**
     * Handle edit event form submission
     */
    async handleEditEvent() {
    try {
        const form = Utils.DOM.getElementById('editEventForm');
        if (!form) return;

        const formData = new FormData(form);
        const eventId = Utils.DOM.getElementById('editEventId')?.value;

        if (!eventId) {
            this.showError('Event ID not found');
            return;
        }

        const eventData = {
            eventId: eventId,
            eventName: formData.get('eventName')?.trim(),
            date: formData.get('eventDate'),
            type: formData.get('eventType'),
            description: formData.get('eventDescription')?.trim() || null,
            status: formData.get('eventStatus')
        };

        // Validate required fields
        if (!eventData.eventName) {
            this.showError('Event name is required');
            return;
        }

        if (!eventData.date) {
            this.showError('Event date is required');
            return;
        }

        // Show loading
        this.showLoading(true);

        // Update the event
        await window.StorageManager.updateEvent(eventData);

        // Hide modal and refresh events view
        this.hideModal();
        await this.updateEventsView();

        // Show success message
        this.showModal(
            'Success',
            `<div style="text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">✅</div>
                    <p><strong>${eventData.eventName}</strong> updated successfully!</p>
                </div>`,
            'Close',
            ''
        );

    } catch (error) {
        console.error('Error updating event:', error);
        this.showError(`Failed to update event: ${error.message}`);
    } finally {
        this.showLoading(false);
    }
}

/**
 * Edit event (called from event card)
 */
editEvent(eventId) {
    this.showEditEventModal(eventId);
}

    /**
     * View event attendance
     */
    async viewEventAttendance(eventId) {
    try {
        this.showLoading(true);

        const event = await window.StorageManager.getEvent(eventId);
        const attendance = await window.StorageManager.getAttendanceByEvent(eventId);

        if (!event) {
            this.showError('Event not found');
            return;
        }

        const eventDate = Utils.Date.format(new Date(event.date), 'long');

        let attendanceHTML = '';
        if (attendance.length === 0) {
            attendanceHTML = '<p>No attendance records for this event.</p>';
        } else {
            // Sort by check-in time
            attendance.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

            attendanceHTML = `
                    <div class="attendance-summary">
                        <p><strong>Total Check-ins:</strong> ${attendance.length}</p>
                    </div>
                    <div class="attendance-list">
                        ${attendance.map(record => {
                const checkInTime = Utils.Date.format(new Date(record.dateTime), 'time');
                return `
                                <div class="attendance-item">
                                    <div class="volunteer-info">
                                        <span class="volunteer-name">${record.volunteerName || record.volunteerId}</span>
                                        <span class="volunteer-committee">${record.committee || 'Unknown'}</span>
                                    </div>
                                    <span class="check-in-time">${checkInTime}</span>
                                </div>
                            `;
            }).join('')}
                    </div>
                `;
        }

        const modalContent = `
                <div class="event-attendance-view">
                    <div class="event-info">
                        <h3>${event.eventName}</h3>
                        <p><strong>Date:</strong> ${eventDate}</p>
                        <p><strong>Type:</strong> ${event.type}</p>
                        <p><strong>Status:</strong> ${event.status}</p>
                    </div>
                    <hr>
                    <div class="attendance-section">
                        <h4>Attendance Records</h4>
                        ${attendanceHTML}
                    </div>
                </div>
            `;

        this.showModal(`Attendance - ${event.eventName}`, modalContent, 'Close', '');

    } catch (error) {
        console.error('Error viewing event attendance:', error);
        this.showError(`Failed to load event attendance: ${error.message}`);
    } finally {
        this.showLoading(false);
    }
}

    /**
     * Delete event with confirmation
     */
    async deleteEvent(eventId) {
    try {
        const event = await window.StorageManager.getEvent(eventId);
        if (!event) {
            this.showError('Event not found');
            return;
        }

        // Check if event has attendance records
        const attendance = await window.StorageManager.getAttendanceByEvent(eventId);

        let warningMessage = '';
        if (attendance.length > 0) {
            warningMessage = `<div class="warning-message">
                    <p><strong>⚠️ Warning:</strong> This event has ${attendance.length} attendance record(s). 
                    Deleting the event will not delete the attendance records, but they may become orphaned.</p>
                </div>`;
        }

        const modalContent = `
                <div class="delete-confirmation">
                    <div style="text-align: center; margin-bottom: 1rem;">
                        <div style="font-size: 3rem; color: #e74c3c;">🗑️</div>
                    </div>
                    <p>Are you sure you want to delete the event:</p>
                    <p><strong>${event.eventName}</strong></p>
                    <p>Date: ${Utils.Date.format(new Date(event.date), 'long')}</p>
                    ${warningMessage}
                    <p><strong>This action cannot be undone.</strong></p>
                </div>
            `;

        this.showModal('Delete Event', modalContent, 'Delete Event', 'Cancel');

        // Handle confirmation
        const modalConfirm = Utils.DOM.getElementById('modalConfirm');
        if (modalConfirm) {
            modalConfirm.onclick = async () => {
                try {
                    this.showLoading(true);
                    await window.StorageManager.deleteEvent(eventId);
                    this.hideModal();
                    await this.updateEventsView();

                    this.showModal(
                        'Event Deleted',
                        `<div style="text-align: center;">
                                <div style="font-size: 2rem; margin-bottom: 1rem;">✅</div>
                                <p><strong>${event.eventName}</strong> has been deleted.</p>
                            </div>`,
                        'Close',
                        ''
                    );
                } catch (error) {
                    console.error('Error deleting event:', error);
                    this.showError(`Failed to delete event: ${error.message}`);
                } finally {
                    this.showLoading(false);
                }
            };
        }

    } catch (error) {
        console.error('Error preparing event deletion:', error);
        this.showError(`Failed to load event: ${error.message}`);
    }
}

    /**
     * Edit volunteer information
     */
    async editVolunteer(volunteerId) {
    try {
        // Get volunteer data
        const volunteer = await window.StorageManager.getVolunteer(volunteerId);
        if (!volunteer) {
            this.showError('Volunteer not found');
            return;
        }

        const modalContent = `
                <form id="editVolunteerForm">
                    <div style="margin-bottom: 1rem;">
                        <label for="editVolunteerId">Volunteer ID *</label>
                        <input type="text" id="editVolunteerId" name="id" required 
                               value="${volunteer.id}" readonly
                               style="margin-top: 0.5rem; background: #f5f5f5;">
                        <small style="color: #666;">ID cannot be changed</small>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label for="editVolunteerName">Full Name *</label>
                        <input type="text" id="editVolunteerName" name="name" required 
                               value="${volunteer.name}" style="margin-top: 0.5rem;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label for="editVolunteerCommittee">Committee</label>
                        <select id="editVolunteerCommittee" name="committee" style="margin-top: 0.5rem; width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 6px;">
                            <option value="General" ${volunteer.committee === 'General' ? 'selected' : ''}>General</option>
                            <option value="Events" ${volunteer.committee === 'Events' ? 'selected' : ''}>Events</option>
                            <option value="Hospitality" ${volunteer.committee === 'Hospitality' ? 'selected' : ''}>Hospitality</option>
                            <option value="Setup" ${volunteer.committee === 'Setup' ? 'selected' : ''}>Setup</option>
                            <option value="Cleanup" ${volunteer.committee === 'Cleanup' ? 'selected' : ''}>Cleanup</option>
                            <option value="Registration" ${volunteer.committee === 'Registration' ? 'selected' : ''}>Registration</option>
                            <option value="Security" ${volunteer.committee === 'Security' ? 'selected' : ''}>Security</option>
                            <option value="Technical" ${volunteer.committee === 'Technical' ? 'selected' : ''}>Technical</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label for="editVolunteerEmail">Email (optional)</label>
                        <input type="email" id="editVolunteerEmail" name="email" 
                               value="${volunteer.email || ''}" style="margin-top: 0.5rem;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label for="editVolunteerStatus">Status</label>
                        <select id="editVolunteerStatus" name="status" style="margin-top: 0.5rem; width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 6px;">
                            <option value="Active" ${volunteer.status === 'Active' ? 'selected' : ''}>Active</option>
                            <option value="Inactive" ${volunteer.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                            <option value="Suspended" ${volunteer.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
                        </select>
                    </div>
                    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #eee; color: #666; font-size: 0.9rem;">
                        <p><strong>Added:</strong> ${Utils.Date.format(new Date(volunteer.dateAdded), 'long')}</p>
                    </div>
                </form>
            `;

        this.showModal(`Edit Volunteer - ${volunteer.name}`, modalContent, 'Save Changes', 'Cancel');

        // Handle form submission
        const modalConfirm = Utils.DOM.getElementById('modalConfirm');
        if (modalConfirm) {
            modalConfirm.onclick = () => this.handleEditVolunteer(volunteerId);
        }

    } catch (error) {
        console.error('Error loading volunteer for edit:', error);
        this.showError('Failed to load volunteer information');
    }
}

    /**
     * Handle edit volunteer form submission
     */
    async handleEditVolunteer(volunteerId) {
    try {
        const form = Utils.DOM.getElementById('editVolunteerForm');
        if (!form) return;

        const formData = new FormData(form);
        const volunteerData = {
            id: volunteerId, // Keep original ID
            name: formData.get('name').trim(),
            committee: formData.get('committee') || 'General',
            email: formData.get('email').trim() || null,
            status: formData.get('status') || 'Active'
        };

        // Validate required fields
        if (!volunteerData.name) {
            this.showError('Volunteer name is required');
            return;
        }

        // Show loading
        this.showLoading(true);

        // Update volunteer in storage
        await window.StorageManager.updateVolunteer(volunteerData);

        // Hide modal and loading
        this.hideModal();
        this.showLoading(false);

        // Refresh volunteers view
        await this.updateVolunteersView();

        // Show success message
        this.showModal(
            'Success',
            `<div style="text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">✅</div>
                    <p><strong>${volunteerData.name}</strong> has been updated successfully!</p>
                </div>`,
            'Close',
            ''
        );

    } catch (error) {
        this.showLoading(false);
        console.error('Error updating volunteer:', error);
        this.showError(error.message || 'Failed to update volunteer');
    }
}

    /**
     * View volunteer attendance history
     */
    async viewVolunteerHistory(volunteerId) {
    try {
        // Show loading
        this.showLoading(true);

        // Get volunteer data
        const volunteer = await window.StorageManager.getVolunteer(volunteerId);
        if (!volunteer) {
            this.showLoading(false);
            this.showError('Volunteer not found');
            return;
        }

        // Get attendance history
        const attendanceHistory = await window.StorageManager.getAttendanceByVolunteer(volunteerId);

        // Sort by most recent first
        attendanceHistory.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

        // Calculate statistics
        const totalAttendance = attendanceHistory.length;
        const uniqueEvents = [...new Set(attendanceHistory.map(record => record.eventId))].length;
        const lastAttendance = attendanceHistory.length > 0 ? attendanceHistory[0] : null;

        // Get recent attendance (last 10)
        const recentAttendance = attendanceHistory.slice(0, 10);

        const modalContent = `
                <div style="margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <h4 style="margin: 0; color: #2c3e50;">${volunteer.name}</h4>
                            <p style="margin: 0; color: #666;">ID: ${volunteer.id} | Committee: ${volunteer.committee}</p>
                        </div>
                        <div style="margin-left: auto;">
                            <span class="status ${volunteer.status.toLowerCase()}" style="padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.8rem; font-weight: 500; 
                                ${volunteer.status === 'Active' ? 'background: #d4edda; color: #155724;' :
                volunteer.status === 'Inactive' ? 'background: #f8d7da; color: #721c24;' :
                    'background: #fff3cd; color: #856404;'}">${volunteer.status}</span>
                        </div>
                    </div>

                    <!-- Statistics -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 6px;">
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #3498db;">${totalAttendance}</div>
                            <div style="font-size: 0.8rem; color: #666;">Total Check-ins</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #27ae60;">${uniqueEvents}</div>
                            <div style="font-size: 0.8rem; color: #666;">Events Attended</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #e67e22;">
                                ${lastAttendance ? Utils.Date.format(new Date(lastAttendance.dateTime), 'short') : 'Never'}
                            </div>
                            <div style="font-size: 0.8rem; color: #666;">Last Check-in</div>
                        </div>
                    </div>

                    <!-- Recent Attendance -->
                    <div>
                        <h5 style="margin-bottom: 1rem;">Recent Attendance</h5>
                        ${recentAttendance.length > 0 ? `
                            <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px;">
                                ${recentAttendance.map(record => `
                                    <div style="padding: 0.75rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <div style="font-weight: 500;">${record.eventName || record.eventId}</div>
                                            <div style="font-size: 0.8rem; color: #666;">${Utils.Date.format(new Date(record.dateTime), 'long')}</div>
                                        </div>
                                        <div style="font-size: 0.9rem; color: #666;">
                                            ${Utils.Date.format(new Date(record.dateTime), 'time')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            ${attendanceHistory.length > 10 ? `
                                <p style="margin-top: 0.5rem; text-align: center; color: #666; font-size: 0.9rem;">
                                    Showing 10 of ${attendanceHistory.length} total check-ins
                                </p>
                            ` : ''}
                        ` : `
                            <div style="text-align: center; padding: 2rem; color: #666; font-style: italic;">
                                No attendance records found
                            </div>
                        `}
                    </div>
                </div>
            `;

        this.showLoading(false);
        this.showModal(`${volunteer.name} - Attendance History`, modalContent, 'Close', '');

    } catch (error) {
        this.showLoading(false);
        console.error('Error loading volunteer history:', error);
        this.showError('Failed to load volunteer history');
    }
}

editEvent(eventId) {
    console.log('Edit event:', eventId);
}

viewEventAttendance(eventId) {
    console.log('View event attendance:', eventId);
}

    /**
     * Filter volunteers based on search term
     */
    async filterVolunteers(searchTerm) {
    try {
        const volunteersGrid = Utils.DOM.getElementById('volunteersGrid');
        if (!volunteersGrid) return;

        let volunteers;

        if (!searchTerm || searchTerm.trim() === '') {
            // Show all volunteers if no search term
            volunteers = await window.StorageManager.getAllVolunteers();
        } else {
            // Search volunteers
            volunteers = await window.StorageManager.searchVolunteers(searchTerm.trim());
        }

        // Update the volunteers grid with filtered results
        this.renderVolunteersGrid(volunteers, searchTerm);

    } catch (error) {
        console.error('Error filtering volunteers:', error);
        const volunteersGrid = Utils.DOM.getElementById('volunteersGrid');
        if (volunteersGrid) {
            volunteersGrid.innerHTML = `
                    <div class="card">
                        <p>Error filtering volunteers. Please try again.</p>
                    </div>
                `;
        }
    }
}

/**
 * Render volunteers grid with given volunteers
 */
renderVolunteersGrid(volunteers, searchTerm = '') {
    const volunteersGrid = Utils.DOM.getElementById('volunteersGrid');
    if (!volunteersGrid) return;

    if (volunteers.length === 0) {
        const message = searchTerm
            ? `No volunteers found matching "${searchTerm}". Try a different search term.`
            : 'No volunteers found. Click "Add Volunteer" or "Import CSV" to get started.';

        volunteersGrid.innerHTML = `
                <div class="card">
                    <p>${message}</p>
                    ${searchTerm ? `<button class="btn btn-secondary" onclick="document.getElementById('volunteerSearch').value = ''; app.filterVolunteers('');">Clear Search</button>` : ''}
                </div>
            `;
        return;
    }

    // Sort volunteers by name
    volunteers.sort((a, b) => a.name.localeCompare(b.name));

    const volunteersHTML = volunteers.map(volunteer => `
            <div class="card volunteer-card" data-volunteer-id="${volunteer.id}">
                <div style="display: flex; justify-content: between; align-items: flex-start; margin-bottom: 1rem;">
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 0.5rem 0;">${this.highlightSearchTerm(volunteer.name, searchTerm)}</h3>
                        <p style="margin: 0.25rem 0;"><strong>ID:</strong> ${this.highlightSearchTerm(volunteer.id, searchTerm)}</p>
                        <p style="margin: 0.25rem 0;"><strong>Committee:</strong> ${this.highlightSearchTerm(volunteer.committee, searchTerm)}</p>
                        ${volunteer.email ? `<p style="margin: 0.25rem 0;"><strong>Email:</strong> ${volunteer.email}</p>` : ''}
                    </div>
                    <div style="margin-left: 1rem;">
                        <span class="status ${volunteer.status.toLowerCase()}" style="padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.8rem; font-weight: 500; white-space: nowrap;
                            ${volunteer.status === 'Active' ? 'background: #d4edda; color: #155724;' :
            volunteer.status === 'Inactive' ? 'background: #f8d7da; color: #721c24;' :
                'background: #fff3cd; color: #856404;'}">${volunteer.status}</span>
                    </div>
                </div>
                <div class="volunteer-actions" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn-secondary btn-sm" onclick="app.editVolunteer('${volunteer.id}')" style="padding: 0.5rem 1rem; font-size: 0.8rem;">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="app.viewVolunteerHistory('${volunteer.id}')" style="padding: 0.5rem 1rem; font-size: 0.8rem;">
                        📊 History
                    </button>
                </div>
            </div>
        `).join('');

    volunteersGrid.innerHTML = volunteersHTML;

    // Show search results count if searching
    if (searchTerm) {
        const resultCount = volunteers.length;
        const countMessage = `<div style="margin-bottom: 1rem; padding: 0.75rem; background: #e3f2fd; border-radius: 4px; text-align: center;">
                Found <strong>${resultCount}</strong> volunteer${resultCount !== 1 ? 's' : ''} matching "${searchTerm}"
            </div>`;
        volunteersGrid.insertAdjacentHTML('afterbegin', countMessage);
    }
}

/**
 * Highlight search term in text
 */
highlightSearchTerm(text, searchTerm) {
    if (!searchTerm || !text) return text;

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark style="background: #fff3cd; padding: 0.1rem 0.2rem; border-radius: 2px;">$1</mark>');
}

    /**
     * Export basic report (CSV format)
     */
    async exportReport() {
    try {
        const reportPeriod = Utils.DOM.getElementById('reportPeriod')?.value || 'week';

        // Calculate date range
        let dateRange = null;
        if (reportPeriod !== 'all') {
            const endDate = new Date();
            const startDate = new Date();

            switch (reportPeriod) {
                case 'week':
                    startDate.setDate(endDate.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(endDate.getMonth() - 1);
                    break;
                case 'quarter':
                    startDate.setMonth(endDate.getMonth() - 3);
                    break;
                case 'year':
                    startDate.setFullYear(endDate.getFullYear() - 1);
                    break;
            }

            dateRange = { start: startDate, end: endDate };
        }

        // Get attendance data for the period
        const csvContent = await window.StorageManager.exportToCSV('attendance', dateRange);

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `attendance-${reportPeriod}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error('Error exporting report:', error);
        this.showError('Failed to export report. Please try again.');
    }
}

/**
 * Toggle mobile navigation menu
 */
toggleMobileNav() {
    const hamburgerBtn = Utils.DOM.getElementById('hamburgerBtn');
    const navContainer = Utils.DOM.getElementById('navContainer');
    const navOverlay = Utils.DOM.getElementById('navOverlay');

    if (hamburgerBtn && navContainer && navOverlay) {
        const isActive = navContainer.classList.contains('active');

        if (isActive) {
            this.closeMobileNav();
        } else {
            this.openMobileNav();
        }
    }
}

/**
 * Open mobile navigation menu
 */
openMobileNav() {
    const hamburgerBtn = Utils.DOM.getElementById('hamburgerBtn');
    const navContainer = Utils.DOM.getElementById('navContainer');
    const navOverlay = Utils.DOM.getElementById('navOverlay');

    if (hamburgerBtn && navContainer && navOverlay) {
        hamburgerBtn.classList.add('active');
        navContainer.classList.add('active');
        navOverlay.classList.add('active');
        hamburgerBtn.setAttribute('aria-expanded', 'true');

        // Prevent body scroll when nav is open
        document.body.style.overflow = 'hidden';

        // Focus first nav item for accessibility
        const firstNavBtn = navContainer.querySelector('.nav-btn');
        if (firstNavBtn) {
            setTimeout(() => firstNavBtn.focus(), 100);
        }
    }
}

/**
 * Close mobile navigation menu
 */
closeMobileNav() {
    const hamburgerBtn = Utils.DOM.getElementById('hamburgerBtn');
    const navContainer = Utils.DOM.getElementById('navContainer');
    const navOverlay = Utils.DOM.getElementById('navOverlay');

    if (hamburgerBtn && navContainer && navOverlay) {
        hamburgerBtn.classList.remove('active');
        navContainer.classList.remove('active');
        navOverlay.classList.remove('active');
        hamburgerBtn.setAttribute('aria-expanded', 'false');

        // Restore body scroll
        document.body.style.overflow = '';
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.App = new VolunteerAttendanceApp();
    // Make app globally available for onclick handlers (after initialization)
    window.app = window.App;
});