/**
 * Main application logic for the Volunteer Attendance Tracker
 */

class VolunteerAttendanceApp {
    constructor() {
        this.currentView = 'dashboard';
        this.isInitialized = false;
        this.updateInterval = null;
        
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
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
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
     * Initialize all views
     */
    async initializeViews() {
        await this.updateDashboard();
        await this.updateVolunteersView();
        await this.updateEventsView();
        await this.updateReports('week');
    }

    /**
     * Switch between views
     */
    switchView(viewName) {
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
     * Update current event display
     */
    async updateCurrentEvent() {
        const currentEventEl = Utils.DOM.getElementById('currentEvent');
        if (!currentEventEl) return;

        try {
            const today = new Date();
            const todayEventId = `E${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
            const currentEvent = await window.StorageManager.getEvent(todayEventId);

            if (currentEvent) {
                currentEventEl.textContent = currentEvent.eventName;
            } else {
                currentEventEl.textContent = 'No active event';
            }

        } catch (error) {
            console.error('Error updating current event:', error);
            currentEventEl.textContent = 'Error loading event';
        }
    }

    /**
     * Update volunteers view
     */
    async updateVolunteersView() {
        const volunteersGrid = Utils.DOM.getElementById('volunteersGrid');
        if (!volunteersGrid) return;

        try {
            const volunteers = await window.StorageManager.getAllVolunteers();

            if (volunteers.length === 0) {
                volunteersGrid.innerHTML = `
                    <div class="card">
                        <p>No volunteers found. Click "Add Volunteer" or "Import CSV" to get started.</p>
                    </div>
                `;
                return;
            }

            const volunteersHTML = volunteers.map(volunteer => `
                <div class="card volunteer-card" data-volunteer-id="${volunteer.id}">
                    <h3>${volunteer.name}</h3>
                    <p><strong>ID:</strong> ${volunteer.id}</p>
                    <p><strong>Committee:</strong> ${volunteer.committee}</p>
                    <p><strong>Status:</strong> <span class="status ${volunteer.status.toLowerCase()}">${volunteer.status}</span></p>
                    <div class="volunteer-actions">
                        <button class="btn btn-secondary btn-sm" onclick="app.editVolunteer('${volunteer.id}')">Edit</button>
                        <button class="btn btn-secondary btn-sm" onclick="app.viewVolunteerHistory('${volunteer.id}')">History</button>
                    </div>
                </div>
            `).join('');

            volunteersGrid.innerHTML = volunteersHTML;

        } catch (error) {
            console.error('Error updating volunteers view:', error);
            volunteersGrid.innerHTML = `
                <div class="card">
                    <p>Error loading volunteers. Please try refreshing the page.</p>
                </div>
            `;
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
                        <p>No events found. Click "Add Event" to create your first event.</p>
                    </div>
                `;
                return;
            }

            // Sort events by date (most recent first)
            events.sort((a, b) => new Date(b.date) - new Date(a.date));

            const eventsHTML = events.map(event => {
                const eventDate = Utils.Date.format(new Date(event.date), 'long');
                return `
                    <div class="card event-card" data-event-id="${event.eventId}">
                        <h3>${event.eventName}</h3>
                        <p><strong>Date:</strong> ${eventDate}</p>
                        <p><strong>Type:</strong> ${event.type}</p>
                        <p><strong>Status:</strong> <span class="status ${event.status.toLowerCase()}">${event.status}</span></p>
                        <div class="event-actions">
                            <button class="btn btn-secondary btn-sm" onclick="app.editEvent('${event.eventId}')">Edit</button>
                            <button class="btn btn-secondary btn-sm" onclick="app.viewEventAttendance('${event.eventId}')">Attendance</button>
                        </div>
                    </div>
                `;
            }).join('');

            eventsList.innerHTML = eventsHTML;

        } catch (error) {
            console.error('Error updating events view:', error);
            eventsList.innerHTML = `
                <div class="card">
                    <p>Error loading events. Please try refreshing the page.</p>
                </div>
            `;
        }
    }

    /**
     * Update reports view
     */
    async updateReports(period = 'week') {
        const reportsContent = Utils.DOM.getElementById('reportsContent');
        if (!reportsContent) return;

        try {
            // Calculate date range based on period
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

            const attendance = await window.StorageManager.getAttendanceByDateRange(startDate, endDate);
            const volunteers = await window.StorageManager.getAllVolunteers();

            // Generate report
            const reportHTML = this.generateAttendanceReport(attendance, volunteers, period);
            reportsContent.innerHTML = reportHTML;

        } catch (error) {
            console.error('Error updating reports:', error);
            reportsContent.innerHTML = `
                <div class="card">
                    <p>Error loading reports. Please try refreshing the page.</p>
                </div>
            `;
        }
    }

    /**
     * Generate attendance report HTML
     */
    generateAttendanceReport(attendance, volunteers, period) {
        // Calculate volunteer attendance stats
        const volunteerStats = {};
        
        volunteers.forEach(volunteer => {
            volunteerStats[volunteer.id] = {
                name: volunteer.name,
                committee: volunteer.committee,
                attendanceCount: 0,
                totalEvents: 0
            };
        });

        // Count attendance
        attendance.forEach(record => {
            if (volunteerStats[record.volunteerId]) {
                volunteerStats[record.volunteerId].attendanceCount++;
            }
        });

        // Get unique events in period
        const uniqueEvents = [...new Set(attendance.map(record => record.eventId))];
        const totalEvents = uniqueEvents.length;

        // Update total events for each volunteer
        Object.keys(volunteerStats).forEach(volunteerId => {
            volunteerStats[volunteerId].totalEvents = totalEvents;
        });

        // Sort by attendance rate
        const sortedVolunteers = Object.entries(volunteerStats)
            .map(([id, stats]) => ({
                id,
                ...stats,
                attendanceRate: totalEvents > 0 ? (stats.attendanceCount / totalEvents * 100).toFixed(1) : 0
            }))
            .sort((a, b) => b.attendanceRate - a.attendanceRate);

        // Generate HTML
        const periodTitle = period.charAt(0).toUpperCase() + period.slice(1);
        
        return `
            <div class="card">
                <h3>Attendance Report - ${periodTitle}</h3>
                <div class="report-summary">
                    <div class="summary-stat">
                        <span class="summary-number">${attendance.length}</span>
                        <span class="summary-label">Total Check-ins</span>
                    </div>
                    <div class="summary-stat">
                        <span class="summary-number">${totalEvents}</span>
                        <span class="summary-label">Events</span>
                    </div>
                    <div class="summary-stat">
                        <span class="summary-number">${volunteers.length}</span>
                        <span class="summary-label">Volunteers</span>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>Volunteer Attendance Rankings</h3>
                <div class="attendance-rankings">
                    ${sortedVolunteers.map((volunteer, index) => `
                        <div class="ranking-item">
                            <div class="ranking-position">${index + 1}</div>
                            <div class="volunteer-info">
                                <span class="volunteer-name">${volunteer.name}</span>
                                <span class="volunteer-committee">${volunteer.committee}</span>
                            </div>
                            <div class="attendance-stats">
                                <span class="attendance-count">${volunteer.attendanceCount}/${volunteer.totalEvents}</span>
                                <span class="attendance-rate">${volunteer.attendanceRate}%</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Start periodic updates
     */
    startPeriodicUpdates() {
        // Update dashboard every 30 seconds
        this.updateInterval = setInterval(() => {
            if (this.currentView === 'dashboard') {
                this.updateDashboard();
            }
        }, 30000);
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
        if (modalCancel) modalCancel.textContent = cancelText;

        if (modalOverlay) {
            modalOverlay.classList.add('active');
        }
    }

    hideModal() {
        const modalOverlay = Utils.DOM.getElementById('modalOverlay');
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    }

    /**
     * Handle Google Sheets sync
     */
    async handleGoogleSync() {
        if (!window.GoogleSheetsService) {
            this.showError('Google Sheets service not available');
            return;
        }

        try {
            // Show loading
            this.showLoading(true);
            
            const status = window.GoogleSheetsService.getStatus();
            
            if (!status.hasCredentials) {
                // First time setup - will prompt for credentials
                await window.GoogleSheetsService.init();
            }
            
            if (!status.isAuthenticated) {
                // Authenticate with Google
                await window.GoogleSheetsService.authenticate();
            }
            
            // Perform sync
            const result = await window.GoogleSheetsService.syncAllData();
            
            // Show success message
            this.showModal(
                'Sync Complete', 
                `
                <div style="text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">✅</div>
                    <p>Successfully synced data to Google Sheets:</p>
                    <ul style="text-align: left; display: inline-block;">
                        <li>${result.volunteers} volunteers</li>
                        <li>${result.attendance} attendance records</li>
                        <li>${result.events} events</li>
                    </ul>
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
            
        } catch (error) {
            console.error('Google Sheets sync failed:', error);
            
            let errorMessage = 'Sync failed: ' + error.message;
            
            if (error.message.includes('Authentication')) {
                errorMessage += '<br><br>Please check your Google Sheets credentials and try again.';
            } else if (error.message.includes('not found')) {
                errorMessage += '<br><br>Please verify your Google Sheet ID is correct.';
            }
            
            this.showModal('Sync Failed', `<div style="color: #e74c3c;">${errorMessage}</div>`, 'Close', '');
            
        } finally {
            this.showLoading(false);
        }
    }

    // Placeholder methods for future implementation
    showSettings() {
        const status = window.GoogleSheetsService ? window.GoogleSheetsService.getStatus() : null;
        
        let googleSheetsStatus = 'Not available';
        if (status) {
            if (status.isAuthenticated) {
                googleSheetsStatus = `✅ Connected (Sheet: ${status.spreadsheetId?.substring(0, 10)}...)`;
            } else if (status.hasCredentials) {
                googleSheetsStatus = '🔑 Configured (not authenticated)';
            } else {
                googleSheetsStatus = '❌ Not configured';
            }
        }
        
        const settingsContent = `
            <div>
                <h4>Google Sheets Integration</h4>
                <p><strong>Status:</strong> ${googleSheetsStatus}</p>
                
                <div style="margin: 1rem 0;">
                    <button class="btn btn-primary" onclick="app.handleGoogleSync()">
                        📊 Sync Now
                    </button>
                    ${status?.hasCredentials ? `
                        <button class="btn btn-secondary" onclick="window.GoogleSheetsService.clearCredentials(); app.hideModal();">
                            🗑️ Clear Credentials
                        </button>
                    ` : ''}
                </div>
                
                <hr style="margin: 1.5rem 0;">
                
                <h4>System Information</h4>
                <p><strong>Environment:</strong> ${window.Config?.environment || 'Unknown'}</p>
                <p><strong>Database:</strong> ${window.StorageManager?.dbName || 'Unknown'}</p>
                <p><strong>Version:</strong> 1.0.0</p>
                
                <div style="margin-top: 1.5rem;">
                    <button class="btn btn-secondary" onclick="resetAppDatabase()">
                        🔄 Reset Database
                    </button>
                </div>
            </div>
        `;
        
        this.showModal('Settings', settingsContent, 'Close', '');
    }

    showAddVolunteerModal() {
        this.showModal('Add Volunteer', '<p>Add volunteer form coming soon...</p>');
    }

    showImportVolunteersModal() {
        this.showModal('Import Volunteers', '<p>CSV import functionality coming soon...</p>');
    }

    showAddEventModal() {
        this.showModal('Add Event', '<p>Add event form coming soon...</p>');
    }

    editVolunteer(volunteerId) {
        console.log('Edit volunteer:', volunteerId);
    }

    viewVolunteerHistory(volunteerId) {
        console.log('View volunteer history:', volunteerId);
    }

    editEvent(eventId) {
        console.log('Edit event:', eventId);
    }

    viewEventAttendance(eventId) {
        console.log('View event attendance:', eventId);
    }

    filterVolunteers(searchTerm) {
        console.log('Filter volunteers:', searchTerm);
    }

    exportReport() {
        console.log('Export report');
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.App = new VolunteerAttendanceApp();
});

// Make app globally available for onclick handlers
window.app = window.App;