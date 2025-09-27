/**
 * Main Application Controller - Clean and Simple
 */
class VolunteerApp {
  constructor() {
    this.currentView = 'dashboard';
    this.isInitialized = false;
    this.components = {};
    
    this.init();
  }
  
  // Initialize application
  async init() {
    try {
      console.log('Initializing Volunteer Attendance Tracker...');
      
      // Track session start time for conflict resolution
      const sessionStartTime = new Date().toISOString();
      localStorage.setItem('app_session_start', sessionStartTime);
      localStorage.setItem('page_load_time', sessionStartTime);
      
      // Show loading
      Utils.Loading.show('Initializing application...');
      
      // Initialize storage
      await Storage.init();
      
      // Auto-restore configuration from available sources
      console.log('🔄 Starting auto-restore configuration...');
      await this.autoRestoreConfiguration();
      console.log('✅ Auto-restore configuration completed');
      
      // Initialize status manager
      if (window.StatusManager) {
        await window.StatusManager.init();
      }
      
      // Initialize UI components
      await this.initializeUI();
      
      // Load initial data
      await this.loadInitialData();
      
      // Initialize services
      await this.initializeSyncServices();
      
      // Initialize Google Sheets authentication if enabled
      if (Config.googleSheets.enabled) {
        try {
          console.log('Initializing Google Sheets authentication...');
          const authInitialized = await window.AuthManager.init();
          
          if (authInitialized) {
            // Initialize sheets manager if auth is successful
            if (window.AuthManager.isAuthenticatedUser()) {
              console.log('User authenticated, initializing SheetsManager...');
              const sheetsInitialized = await window.SheetsManager.init();
              
              if (sheetsInitialized) {
                console.log('Google Sheets integration fully initialized');
                
                // Re-evaluate sync status now that Google Sheets is ready
                if (window.SyncManager && window.SyncManager.reevaluateEnabledStatus) {
                  await window.SyncManager.reevaluateEnabledStatus();
                  console.log('Sync system re-evaluated after Google Sheets initialization');
                } else {
                  console.log('Google Sheets integration ready - unified sync system active');
                }
              }
            } else {
              // Try to restore authentication from storage
              const restored = await window.AuthManager.restoreAuthenticationFromStorage();
              if (restored) {
                console.log('Authentication restored from storage - Google Sheets sync active');
                
                // Re-evaluate sync status now that authentication is restored
                if (window.SyncManager && window.SyncManager.reevaluateEnabledStatus) {
                  await window.SyncManager.reevaluateEnabledStatus();
                  console.log('Sync system re-evaluated after authentication restored');
                } else {
                  console.log('Authentication restored - unified sync system active');
                }
              } else {
                console.log('User not authenticated - Google Sheets sync available but not active');
                
                // Unified sync system handles unauthenticated state automatically
                console.log('User not authenticated - sync system will handle this automatically');
              }
            }
          } else {
            console.warn('AuthManager initialization failed - Google Sheets sync disabled');
          }
        } catch (error) {
          console.warn('Failed to initialize Google Sheets authentication:', error);
          // Don't throw - allow app to continue without sync
        }
      } else {
        console.log('Google Sheets sync is disabled in configuration');
      }
      
      // Initialize validation engine
      if (window.ValidationEngine) {
        await window.ValidationEngine.init();
        console.log('Validation engine initialized');
        
        // Force refresh ValidationIndicators after ValidationEngine is ready
        if (window.ValidationIndicators) {
          setTimeout(() => {
            window.ValidationIndicators.refresh();
            console.log('ValidationIndicators refreshed after ValidationEngine initialization');
          }, 100);
        }
      }
      
      // Initialize environment-specific configuration (after user settings are loaded)
      if (window.EnvironmentSheetsManager && typeof window.EnvironmentSheetsManager.init === 'function') {
        await window.EnvironmentSheetsManager.init();
        console.log('Environment sheets manager initialized');
      }
      
      // Initialize performance optimizations for high-volume scanning
      await this.initializePerformanceOptimizations();
      
      // Initialize error handling system
      await this.initializeErrorHandling();
      
      // Initialize scanner (after data is loaded)
      if (window.Scanner && typeof window.Scanner.init === 'function') {
        await window.Scanner.init();
      }
      
      // Auto-fix event detection issues if scanner has no current event
      if (window.Scanner && !window.Scanner.currentEvent) {
        console.log('⚠️ Scanner has no current event - running auto-fix...');
        const fixedCount = await Storage.autoFixEventIssues();
        
        if (fixedCount > 0) {
          console.log(`🔧 Auto-fix applied ${fixedCount} fixes - reloading scanner...`);
          if (typeof window.Scanner.loadCurrentEvent === 'function') {
            await window.Scanner.loadCurrentEvent();
          }
        }
      }
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Hide loading
      Utils.Loading.hide();
      
      this.isInitialized = true;
      console.log('Application initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize application:', error);
      
      // Use enhanced error handling if available
      if (window.ErrorHandler) {
        window.ErrorHandler.handleError(error, {
          type: 'system',
          operation: 'app_initialization'
        }, {
          showTechnicalDetails: true,
          targetElement: 'body'
        });
      } else {
        // Fallback error handling
        Utils.Notify.error('Failed to initialize application. Please refresh the page.');
      }
      
      Utils.Loading.hide();
    }
  }
  
  // Initialize sync services
  async initializeSyncServices() {
    try {
      // Note: Unified sync system is initialized automatically by sync-init.js
      // This method is kept for compatibility and additional setup if needed
      
      // Wait for sync system to be ready
      if (!window.SyncManager) {
        console.log('Waiting for unified sync system to initialize...');
        
        // Wait up to 5 seconds for sync system
        let attempts = 0;
        while (!window.SyncManager && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      }
      
      if (window.SyncManager) {
        console.log('Unified sync system is ready');
        
        // Verify sync manager is properly initialized
        const syncStatus = window.SyncManager.getSyncStatus();
        console.log('Sync status:', {
          enabled: syncStatus.enabled,
          online: syncStatus.online,
          changeCount: syncStatus.changeCount
        });
      } else {
        console.warn('Unified sync system not available after initialization timeout');
      }
      
      console.log('Sync services initialization completed');
      
    } catch (error) {
      console.error('Failed to initialize sync services:', error);
      // Don't throw - allow app to continue without sync
    }
  }
  
  // Initialize performance optimizations for high-volume scanning
  async initializePerformanceOptimizations() {
    try {
      console.log('🚀 Initializing performance optimizations for high-volume scanning...');
      
      // Initialize data indexing system
      if (window.DataIndex) {
        await window.DataIndex.init();
        console.log('✅ DataIndex initialized for fast volunteer lookups');
      }
      
      // Initialize batch processor
      if (window.BatchProcessor) {
        await window.BatchProcessor.init();
        
        // Configure for optimal scanning performance
        window.BatchProcessor.configure({
          batchSize: 10, // Process 10 scans at once
          batchTimeout: 400, // 400ms timeout for responsive scanning
          maxQueueSize: 150 // Handle up to 150 queued scans
        });
        
        console.log('✅ BatchProcessor initialized for high-volume scanning');
      }
      
      // Initialize UI update manager
      if (window.UIUpdateManager) {
        await window.UIUpdateManager.init();
        
        // Configure for smooth UI updates
        window.UIUpdateManager.configure({
          batchSize: 8, // Process 8 UI updates at once
          updateInterval: 100, // 100ms update interval
          maxQueueSize: 200, // Handle up to 200 queued updates
          useRequestAnimationFrame: true, // Smooth animations
          enableVirtualScrolling: true, // Handle large lists efficiently
          enableUpdateCoalescing: true // Merge similar updates
        });
        
        console.log('✅ UIUpdateManager initialized for smooth UI updates');
      }
      
      // Initialize fast connectivity validator
      if (window.FastConnectivityValidator) {
        await window.FastConnectivityValidator.init();
        
        // Configure for minimal scanning delays
        window.FastConnectivityValidator.configure({
          cacheTimeout: 60000, // 60 second cache for fast responses
          fastCheckTimeout: 2000, // 2 second fast check timeout
          backgroundCheckInterval: 120000, // 2 minute background checks
          fastMode: true // Enable fast mode for scanning
        });
        
        console.log('✅ FastConnectivityValidator initialized for minimal delays');
      }
      
      // Initialize performance monitor
      if (window.PerformanceMonitor) {
        await window.PerformanceMonitor.init();
        console.log('✅ PerformanceMonitor initialized for bottleneck detection');
      }
      
      // Initialize performance dashboard
      if (window.PerformanceDashboard) {
        await window.PerformanceDashboard.init();
        console.log('✅ PerformanceDashboard initialized (Ctrl+Shift+P to toggle)');
      }
      
      console.log('🎯 All performance optimizations initialized successfully');
      console.log('📊 Performance Dashboard: Press Ctrl+Shift+P to view real-time metrics');
      
    } catch (error) {
      console.error('❌ Failed to initialize performance optimizations:', error);
      // Don't throw - allow app to continue without optimizations
    }
  }

  // Initialize error handling system
  async initializeErrorHandling() {
    try {
      console.log('Initializing error handling system...');
      
      // Initialize error handler
      if (window.ErrorHandler) {
        await window.ErrorHandler.init();
        console.log('ErrorHandler initialized');
      }
      
      // Initialize loading manager
      if (window.LoadingManager) {
        await window.LoadingManager.init();
        console.log('LoadingManager initialized');
      }
      
      // Initialize system status monitoring
      if (window.SystemStatus) {
        await window.SystemStatus.init();
        console.log('SystemStatus initialized');
      }
      
      // Initialize error feedback component
      if (window.ErrorFeedback) {
        await window.ErrorFeedback.init();
        console.log('ErrorFeedback initialized');
      }
      
      console.log('Error handling system fully initialized');
      
    } catch (error) {
      console.error('Failed to initialize error handling system:', error);
      // Don't throw - allow app to continue with basic error handling
    }
  }
  
  // Initialize UI components
  async initializeUI() {
    // Load saved settings
    await this.loadSettings();
    
    // Initialize shared components
    this.initializeSharedComponents();
    
    // Initialize modal handlers
    this.setupModalHandlers();
    
    // Initialize sync status UI
    if (window.SyncStatusUI) {
      const syncStatusInitialized = window.SyncStatusUI.init();
      if (syncStatusInitialized) {
        console.log('Sync status UI initialized successfully');
      }
    }
    
    // Initialize validation indicators
    if (window.ValidationIndicators) {
      window.ValidationIndicators.init();
      console.log('Validation indicators initialized');
    }

    // Initialize volunteers component
    if (window.Volunteers) {
      window.Volunteers.init();
      console.log('Volunteers component initialized');
    }

    // Settings component will be initialized lazily when settings view is shown
    console.log('Settings component will be initialized on demand');
    
    // Initialize sync status
    this.updateSyncStatus();
  }

  // Initialize shared components
  initializeSharedComponents() {
    // Determine active navigation item based on current hash
    let activeItem = 'dashboard';
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      if (['volunteers', 'events', 'reports', 'settings'].includes(hash)) {
        activeItem = hash;
      }
    }

    // Initialize header and navigation with shared components
    if (window.HeaderComponent) {
      window.HeaderComponent.replace('Gurukul Attendance');
    }
    
    if (window.NavigationComponent) {
      window.NavigationComponent.replace(activeItem);
      
      // Initialize UI Navigation for view switching after NavigationComponent is ready
      setTimeout(() => {
        if (window.UI && window.UI.Navigation) {
          window.UI.Navigation.init();
          
          // Ensure initial view is loaded after all components are ready
          setTimeout(() => {
            const currentHash = window.location.hash.substring(1) || 'dashboard';
            if (currentHash === 'volunteers') {
              console.log('Loading volunteers view on initial load');
              this.handleViewChange('volunteers');
            }
          }, 50);
        }
      }, 100);
    }
    
    console.log('Shared components initialized');
  }
  
  // Setup modal event handlers
  setupModalHandlers() {
    const modalOverlay = Utils.DOM.get('#modalOverlay');
    const modalClose = Utils.DOM.get('#modalClose');
    const modalCancel = Utils.DOM.get('#modalCancel');
    
    // Close modal handlers
    [modalClose, modalCancel].forEach(btn => {
      if (btn) {
        btn.onclick = () => UI.Modal.hide();
      }
    });
    
    // Close on overlay click
    if (modalOverlay) {
      modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
          UI.Modal.hide();
        }
      };
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && UI.Modal.current) {
        UI.Modal.hide();
      }
    });
  }
  
  // Load initial data
  async loadInitialData() {
    // Load dashboard data
    await this.updateDashboard();
    
    // Create sample data if empty
    await this.createSampleDataIfNeeded();
  }
  
  // Create sample data for testing
  async createSampleDataIfNeeded() {
    const volunteers = await Storage.getAllVolunteers();
    const events = await Storage.getAllEvents();
    
    // Create sample volunteers if none exist
    if (volunteers.length === 0) {
      const sampleVolunteers = [
        { id: 'V001', name: 'John Doe', email: 'john@example.com', committee: 'Teaching' },
        { id: 'V002', name: 'Jane Smith', email: 'jane@example.com', committee: 'Administration' },
        { id: 'TEST001', name: 'Test Volunteer', email: 'test@example.com', committee: 'Events' }
      ];
      
      for (const volunteer of sampleVolunteers) {
        await Storage.addVolunteer(volunteer);
      }
      
      console.log('Created sample volunteers');
    }
    
    // Create sample event if none exist
    if (events.length === 0) {
      const today = Utils.Date.today();
      const sampleEvent = {
        id: 'E001',
        name: this.generateGurukulEventName(today),
        date: today,
        startTime: '10:00',
        endTime: '12:00',
        status: 'Active',
        description: 'Regular Sunday class session'
      };
      
      await Storage.addEvent(sampleEvent);
      console.log('Created sample event');
    }
  }
  
  // Setup event listeners
  setupEventListeners() {
    // Refresh button
    const refreshBtn = Utils.DOM.get('#refreshBtn');
    if (refreshBtn) {
      refreshBtn.onclick = () => this.refreshCurrentView();
    }
    
    // Note: Sync button is now handled by NavigationComponent
    
    // Volunteer management
    const addVolunteerBtn = Utils.DOM.get('#addVolunteerBtn');
    if (addVolunteerBtn) {
      addVolunteerBtn.onclick = () => this.showAddVolunteer();
    }
    
    // Event management
    const addEventBtn = Utils.DOM.get('#addEventBtn');
    const createEventsBtn = Utils.DOM.get('#createEventsBtn');
    
    if (addEventBtn) {
      addEventBtn.onclick = () => this.showAddEvent();
    }
    
    if (createEventsBtn) {
      createEventsBtn.onclick = () => this.createSundayEvents();
    }
    
    // Reports
    const exportBtn = Utils.DOM.get('#exportBtn');
    const reportPeriod = Utils.DOM.get('#reportPeriod');
    
    if (exportBtn) {
      exportBtn.onclick = () => this.exportReport();
    }
    
    if (reportPeriod) {
      reportPeriod.onchange = (e) => this.updateReports(e.target.value);
    }
    
    // Listen for view changes
    Utils.Event.on('viewChanged', (e) => {
      this.currentView = e.detail.view;
      this.handleViewChange(e.detail.view);
    });
    
    // Listen for attendance records
    Utils.Event.on('attendanceRecorded', () => {
      this.updateDashboard();
    });
  }
  
  // Handle view changes
  async handleViewChange(view) {
    switch (view) {
      case 'dashboard':
        await this.updateDashboard();
        break;
      case 'volunteers':
        await this.updateVolunteersView();
        break;
      case 'events':
        await this.updateEventsView();
        break;
      case 'reports':
        await this.updateReportsView();
        break;
    }
  }
  
  // Update dashboard
  async updateDashboard() {
    try {
      if (window.Scanner && typeof window.Scanner.updateStats === 'function') {
        await window.Scanner.updateStats();
      } else {
        console.warn('Scanner not available for dashboard update');
      }
    } catch (error) {
      console.error('Error updating dashboard:', error);
    }
  }
  
  // Update volunteers view
  async updateVolunteersView() {
    const container = Utils.DOM.get('#volunteersContainer');
    if (!container) return;
    
    try {
      UI.Loading.show(container, 'Loading volunteers...');
      
      // Ensure Volunteers component is initialized
      if (window.Volunteers && typeof window.Volunteers.init === 'function' && !window.Volunteers.initialized) {
        window.Volunteers.init();
        window.Volunteers.initialized = true;
        console.log('Volunteers component initialized on demand');
      }
      
      const volunteers = await Storage.getAllVolunteers();
      
      if (volunteers.length === 0) {
        UI.Empty.show(container, '👥', 'No Volunteers', 'Add volunteers to start tracking attendance', {
          text: 'Add Volunteer',
          handler: 'app.showAddVolunteer()'
        });
        return;
      }
      
      // Use the Volunteers component to render
      if (window.Volunteers && typeof window.Volunteers.renderVolunteers === 'function') {
        Volunteers.renderVolunteers(volunteers);
      } else {
        console.error('Volunteers component not available');
        container.innerHTML = '<div class="error">Volunteers component not loaded</div>';
      }
      
    } catch (error) {
      console.error('Error updating volunteers view:', error);
      container.innerHTML = '<div class="error">Error loading volunteers</div>';
    }
  }
  
  // Update events view
  async updateEventsView() {
    const container = Utils.DOM.get('#eventsList');
    if (!container) return;
    
    try {
      UI.Loading.show(container, 'Loading events...');
      
      const events = await Storage.getAllEvents();
      
      if (events.length === 0) {
        UI.Empty.show(container, '📅', 'No Events', 'Create events to start tracking attendance', {
          text: 'Add Event',
          handler: 'app.showAddEvent()'
        });
        return;
      }
      
      // Sort events by date
      events.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Render events list
      const html = events.map(event => {
        const isActive = event.status === 'Active';
        const isPast = new Date(event.date) < new Date();
        
        return `
          <div class="card">
            <div class="card-header">
              <h4>${event.name}</h4>
              <span class="status ${isActive ? 'active' : 'inactive'}">${event.status}</span>
            </div>
            <div class="card-body">
              <p><strong>Date:</strong> ${Utils.Date.format(event.date, 'date')}</p>
              <p><strong>Time:</strong> ${event.startTime} - ${event.endTime}</p>
              ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
              <div class="card-actions">
                <button class="btn btn-small btn-secondary" onclick="app.viewAttendance('${event.id}')">Attendance</button>
                <button class="btn btn-small btn-secondary" onclick="app.editEvent('${event.id}')">Edit</button>
                <button class="btn btn-small btn-warning" onclick="app.deleteEvent('${event.id}')">Delete</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      container.innerHTML = html;
      
    } catch (error) {
      console.error('Error updating events view:', error);
      container.innerHTML = '<div class="error">Error loading events</div>';
    }
  }
  
  // Update reports view
  async updateReportsView() {
    const container = Utils.DOM.get('#reportsContent');
    if (!container) return;
    
    const period = Utils.DOM.get('#reportPeriod')?.value || 'week';
    await this.updateReports(period);
  }
  
  // Update reports
  async updateReports(period) {
    const container = Utils.DOM.get('#reportsContent');
    if (!container) return;
    
    try {
      UI.Loading.show(container, 'Generating report...');
      
      const stats = await Storage.getAttendanceStats(period);
      
      if (stats.totalRecords === 0) {
        UI.Empty.show(container, '📊', 'No Data', `No attendance records found for ${period}`);
        return;
      }
      
      // Generate report HTML
      const html = `
        <div class="report-summary">
          <div class="report-stat">
            <span class="stat-number">${stats.totalRecords}</span>
            <span class="stat-label">Total Check-ins</span>
          </div>
          <div class="report-stat">
            <span class="stat-number">${stats.uniqueVolunteers}</span>
            <span class="stat-label">Unique Volunteers</span>
          </div>
        </div>
        
        <div class="report-section">
          <h3>By Committee</h3>
          <div class="committee-stats">
            ${Object.entries(stats.byCommittee).map(([committee, records]) => `
              <div class="committee-stat">
                <span class="committee-name">${committee || 'Unknown'}</span>
                <span class="committee-count">${records.length}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      
      container.innerHTML = html;
      
    } catch (error) {
      console.error('Error updating reports:', error);
      container.innerHTML = '<div class="error">Error generating report</div>';
    }
  }
  
  // Show add volunteer modal
  showAddVolunteer() {
    // Create form HTML manually to avoid losing event handlers
    const formHTML = `
      <form class="form">
        <div class="form-group">
          <label class="form-label">Volunteer ID <span class="required">*</span></label>
          <input class="form-input" type="text" name="id" placeholder="V001" required>
        </div>
        <div class="form-group">
          <label class="form-label">Full Name <span class="required">*</span></label>
          <input class="form-input" type="text" name="name" placeholder="John Doe" required>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" type="email" name="email" placeholder="john@example.com">
        </div>
        <div class="form-group">
          <label class="form-label">Committee</label>
          <select class="form-input" name="committee">
            <option value="">Select Committee</option>
            <option value="Teaching">Teaching</option>
            <option value="Administration">Administration</option>
            <option value="Events">Events</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </form>
    `;
    
    // Show modal with custom actions
    UI.Modal.show('Add Volunteer', formHTML, [
      {
        text: 'Cancel',
        class: 'btn-secondary',
        handler: () => UI.Modal.hide()
      },
      {
        text: 'Add Volunteer',
        class: 'btn-primary',
        handler: async () => {
          const modalForm = Utils.DOM.get('#modal form');
          if (modalForm && UI.Form.validate(modalForm)) {
            try {
              // Get form data
              const formData = new FormData(modalForm);
              const data = Object.fromEntries(formData.entries());
              
              await Storage.addVolunteer(data);
              UI.Modal.hide();
              Utils.Notify.success('Volunteer added successfully');
              
              // Trigger sync if enabled
              this.triggerDataSync('volunteers');
              
              if (this.currentView === 'volunteers') {
                this.updateVolunteersView();
              }
            } catch (error) {
              Utils.Notify.error('Error adding volunteer: ' + error.message);
            }
          }
        }
      }
    ]);
  }
  
  // Show add event modal
  showAddEvent() {
    // Create form HTML manually to avoid losing event handlers
    const formHTML = `
      <form class="form">
        <div class="form-group">
          <label class="form-label">Event Name <span class="required">*</span></label>
          <input class="form-input" type="text" name="name" placeholder="Gurukul - MM/DD/YY" required>
        </div>
        <div class="form-group">
          <label class="form-label">Date <span class="required">*</span></label>
          <input class="form-input" type="date" name="date" value="${Utils.Date.today()}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-input" name="description" rows="3" placeholder="Event description..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-input" name="status">
            <option value="Active" selected>Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </form>
    `;
    
    // Show modal with custom actions
    UI.Modal.show('Add Event', formHTML, [
      {
        text: 'Cancel',
        class: 'btn-secondary',
        handler: () => UI.Modal.hide()
      },
      {
        text: 'Add Event',
        class: 'btn-primary',
        handler: async () => {
          const modalForm = Utils.DOM.get('#modal form');
          if (modalForm && UI.Form.validate(modalForm)) {
            try {
              // Get form data
              const formData = new FormData(modalForm);
              const data = Object.fromEntries(formData.entries());
              
              // Set default time values since we removed the time fields
              data.startTime = '10:00';
              data.endTime = '12:00';
              
              await Storage.addEvent(data);
              UI.Modal.hide();
              Utils.Notify.success('Event added successfully');
              
              // Trigger sync if enabled
              this.triggerDataSync('events');
              
              if (this.currentView === 'events') {
                this.updateEventsView();
              }
              // Reload current event for scanner
              if (window.Scanner && typeof window.Scanner.loadCurrentEvent === 'function') {
                window.Scanner.loadCurrentEvent();
              }
            } catch (error) {
              Utils.Notify.error('Error adding event: ' + error.message);
            }
          }
        }
      }
    ]);
  }
  
  // Create Sunday events
  async createSundayEvents() {
    console.log('🔄 createSundayEvents called');
    
    if (!UI || !UI.Modal) {
      console.error('❌ UI.Modal not available');
      Utils.Notify.error('Modal system not available');
      return;
    }
    
    UI.Modal.confirm(
      'Create Sunday Events',
      'This will create events for the next 12 Sundays. Continue?',
      async () => {
        console.log('✅ Modal confirmed, starting event creation');
        try {
          Utils.Loading.show('Creating Sunday events...');
          
          const events = [];
          const today = new Date();
          
          // Find next Sunday
          let nextSunday = new Date(today);
          nextSunday.setDate(today.getDate() + (7 - today.getDay()) % 7);
          if (nextSunday.getDay() !== 0) {
            nextSunday.setDate(nextSunday.getDate() + 7);
          }
          
          console.log('📅 Next Sunday:', nextSunday.toLocaleDateString());
          
          // Create 12 Sunday events
          for (let i = 0; i < 12; i++) {
            const eventDate = new Date(nextSunday);
            eventDate.setDate(nextSunday.getDate() + (i * 7));
            
            const event = {
              name: this.generateGurukulEventName(eventDate),
              date: eventDate.toISOString().split('T')[0],
              startTime: '10:00',
              endTime: '12:00',
              status: 'Active',
              description: 'Regular Sunday class session'
            };
            
            events.push(event);
            console.log(`📝 Created event ${i + 1}: ${event.name} (${event.date})`);
          }
          
          console.log(`💾 Adding ${events.length} events to storage...`);
          
          // Add events to database
          for (const event of events) {
            await Storage.addEvent(event);
          }
          
          Utils.Loading.hide();
          Utils.Notify.success(`Created ${events.length} Sunday events`);
          console.log('✅ Sunday events created successfully');
          
          // Trigger sync for new events
          this.triggerDataSync('events');
          
          if (this.currentView === 'events') {
            this.updateEventsView();
          }
          
          if (window.Scanner && typeof window.Scanner.loadCurrentEvent === 'function') {
            window.Scanner.loadCurrentEvent();
          }
          
        } catch (error) {
          console.error('❌ Error creating Sunday events:', error);
          Utils.Loading.hide();
          Utils.Notify.error('Error creating events: ' + error.message);
        }
      },
      () => {
        console.log('❌ Modal cancelled');
      }
    );
  }
  
  // Handle sync
  async handleSync() {
    try {
      // Check if sync is enabled
      if (!Config.googleSheets.enabled) {
        Utils.Notify.warning('Google Sheets sync is disabled. Enable it in settings to sync data.');
        return;
      }
      
      // Check authentication
      if (!window.AuthManager || !window.AuthManager.isAuthenticatedUser()) {
        Utils.Notify.warning('Please authenticate with Google first in settings.');
        this.showSettings(); // Open settings to help user authenticate
        return;
      }
      
      // Check if SheetsManager is initialized
      if (!window.SheetsManager || !window.SheetsManager.isInitialized) {
        Utils.Notify.warning('Google Sheets service not initialized. Please check your settings.');
        return;
      }
      
      Utils.Loading.show('Syncing data...');
      
      // Perform force sync with unified sync system
      if (!window.SyncManager) {
        throw new Error('Unified sync system not available');
      }
      
      const result = await window.SyncManager.forceFullSync();
      
      Utils.Loading.hide();
      
      if (result.success) {
        const stats = result.result;
        const totalUploaded = Object.values(stats.uploaded || {}).reduce((sum, count) => sum + count, 0);
        const totalDownloaded = Object.values(stats.downloaded || {}).reduce((sum, count) => sum + count, 0);
        const totalConflicts = stats.conflicts ? stats.conflicts.length : 0;
        
        let message = 'Sync completed successfully!';
        if (totalUploaded > 0 || totalDownloaded > 0) {
          message += ` Uploaded: ${totalUploaded}, Downloaded: ${totalDownloaded}`;
          if (totalConflicts > 0) {
            message += `, Conflicts resolved: ${totalConflicts}`;
          }
        }
        
        Utils.Notify.success(message);
        
        // Refresh current view to show updated data
        this.refreshCurrentView();
        
        // Update dashboard stats
        await this.updateDashboard();
        
      } else {
        Utils.Notify.error('Sync failed: ' + (result.error || 'Unknown error'));
      }
      
    } catch (error) {
      Utils.Loading.hide();
      console.error('Sync error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Sync failed: ';
      if (error.message.includes('authentication') || error.message.includes('401')) {
        errorMessage += 'Authentication expired. Please re-authenticate in settings.';
      } else if (error.message.includes('network') || error.message.includes('offline')) {
        errorMessage += 'Network connection issue. Please check your internet connection.';
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        errorMessage += 'Google API quota exceeded. Please try again later.';
      } else {
        errorMessage += error.message;
      }
      
      Utils.Notify.error(errorMessage);
    }
  }
  
  // Show settings
  async showSettings() {
    // Load current Google Sheets credentials
    const credentials = window.EnvironmentManager ? 
      await window.EnvironmentManager.loadEnvironment() : 
      { apiKey: '', clientId: '' };
    const isUsingEnvCredentials = window.EnvironmentManager ? 
      window.EnvironmentManager.isUsingEnvironmentCredentials() : 
      true;
    const authStatus = window.AuthManager ? 
      window.AuthManager.isAuthenticatedUser() : 
      false;
    
    const settingsForm = `
      <div class="settings-form">
        <div class="setting-group">
          <h4>Scanner Settings</h4>
          <label class="setting-item">
            <input type="checkbox" id="scannerEnabled" ${Config.scanner.enabled ? 'checked' : ''}>
            <span>Enable scanner</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" id="autoFocus" ${Config.scanner.autoFocus ? 'checked' : ''}>
            <span>Auto-focus scanner input</span>
          </label>
          <label class="setting-item">
            <span>Scanner prefix:</span>
            <input type="text" id="scannerPrefix" value="${Config.scanner.prefix}" placeholder="Optional prefix">
          </label>
          <label class="setting-item">
            <span>Scanner suffix:</span>
            <input type="text" id="scannerSuffix" value="${Config.scanner.suffix}" placeholder="Optional suffix">
          </label>
        </div>
        
        <div class="setting-group">
          <h4>Google Sheets Sync</h4>
          <label class="setting-item">
            <input type="checkbox" id="googleSheetsEnabled" ${Config.googleSheets.enabled ? 'checked' : ''}>
            <span>Enable Google Sheets synchronization</span>
          </label>
          
          <div class="google-sheets-config" id="googleSheetsConfig" style="display: ${Config.googleSheets.enabled ? 'block' : 'none'};">
            <div class="credential-status">
              <div class="status-indicator ${authStatus ? 'authenticated' : 'not-authenticated'}">
                <span class="status-dot"></span>
                <span class="status-text">${authStatus ? 'Authenticated' : 'Not Authenticated'}</span>
              </div>
              ${isUsingEnvCredentials ? 
                '<small class="credential-source">Using environment credentials</small>' : 
                '<small class="credential-source">Using manual credentials</small>'
              }
            </div>
            
            <div class="credential-override">
              <h5>Credential Override</h5>
              <small class="help-text">Leave blank to use environment variables</small>
              
              <label class="setting-item">
                <span>Google API Key:</span>
                <input type="password" id="googleApiKey" 
                       value="${!isUsingEnvCredentials ? (credentials.apiKey || '') : ''}" 
                       placeholder="AIza...">
                <button type="button" class="btn-icon" onclick="app.togglePasswordVisibility('googleApiKey')" title="Show/Hide">👁️</button>
              </label>
              
              <label class="setting-item">
                <span>Google Client ID:</span>
                <input type="password" id="googleClientId" 
                       value="${!isUsingEnvCredentials ? (credentials.clientId || '') : ''}" 
                       placeholder="...googleusercontent.com">
                <button type="button" class="btn-icon" onclick="app.togglePasswordVisibility('googleClientId')" title="Show/Hide">👁️</button>
              </label>
              
              <div class="credential-actions">
                <button type="button" class="btn btn-small btn-secondary" onclick="app.testGoogleCredentials()">🔍 Test Credentials</button>
                <button type="button" class="btn btn-small btn-secondary" onclick="app.clearGoogleCredentials()">🗑️ Clear Override</button>
                ${authStatus ? 
                  '<button type="button" class="btn btn-small btn-warning" onclick="app.signOutGoogle()">🚪 Sign Out</button>' :
                  '<button type="button" class="btn btn-small btn-primary" onclick="app.authenticateGoogle()">🔐 Authenticate</button>'
                }
              </div>
            </div>
            
            <label class="setting-item">
              <span>Spreadsheet ID (optional):</span>
              <input type="text" id="googleSpreadsheetId" 
                     value="${Config.googleSheets.spreadsheetId}" 
                     placeholder="Leave blank to auto-create">
              <small class="help-text">Leave blank to automatically create a new spreadsheet</small>
            </label>
            
            <!-- Sync interval moved to general sync settings -->
          </div>
        </div>
        
        <div class="setting-group">
          <h4>Sync Settings</h4>
          <label class="setting-item">
            <input type="checkbox" id="syncEnabled" ${Config.sync.enabled ? 'checked' : ''}>
            <span>Enable data sync</span>
          </label>
          <label class="setting-item">
            <span>Sync interval (seconds):</span>
            <input type="number" id="syncInterval" value="${Config.sync.interval / 1000}" min="30" max="300">
          </label>
        </div>
        
        <div class="setting-group">
          <h4>Display Settings</h4>
          <label class="setting-item">
            <span>Recent check-ins to show:</span>
            <input type="number" id="recentLimit" value="${Config.ui.recentAttendanceLimit}" min="5" max="50">
          </label>
          <label class="setting-item">
            <span>Auto-refresh interval (seconds):</span>
            <input type="number" id="autoRefresh" value="${Config.ui.autoRefreshInterval / 1000}" min="10" max="300">
          </label>
        </div>
        
        <div class="setting-group">
          <h4>Configuration Management</h4>
          <div class="setting-buttons">
            <button type="button" class="btn btn-secondary" onclick="app.exportConfiguration()">📤 Export Settings</button>
            <button type="button" class="btn btn-secondary" onclick="app.importConfiguration()">📥 Import Settings</button>
            <button type="button" class="btn btn-secondary" onclick="app.showConfigurationBackups()">🗂️ View Backups</button>
            <button type="button" class="btn btn-warning" onclick="app.resetConfiguration()">🔄 Reset to Defaults</button>
          </div>
          <small class="help-text">Backups are created automatically before major changes</small>
        </div>
        
        <div class="setting-group">
          <h4>Data Management</h4>
          <div class="setting-buttons">
            <button type="button" class="btn btn-secondary" onclick="DataManager.exportAllData()">📤 Export All Data</button>
            <button type="button" class="btn btn-secondary" onclick="DataManager.importData()">📥 Import Data</button>
            <button type="button" class="btn btn-warning" onclick="DataManager.clearAllData()">🗑️ Clear All Data</button>
          </div>
          <div class="setting-buttons" style="margin-top: 10px;">
            <button type="button" class="btn btn-primary" onclick="DataManager.resetAndSyncFromSheets()">🔄 Reset & Sync from Sheets</button>
            <button type="button" class="btn btn-secondary" onclick="window.open('reset-from-sheets.html', '_blank')">🛠️ Advanced Reset Tool</button>
          </div>
          <small class="help-text">Reset clears local data and syncs fresh from Google Sheets</small>
        </div>
      </div>
    `;
    
    // Add event listener for Google Sheets toggle and setup validation
    setTimeout(() => {
      const googleSheetsToggle = Utils.DOM.get('#googleSheetsEnabled');
      const googleSheetsConfig = Utils.DOM.get('#googleSheetsConfig');
      
      if (googleSheetsToggle && googleSheetsConfig) {
        googleSheetsToggle.onchange = (e) => {
          googleSheetsConfig.style.display = e.target.checked ? 'block' : 'none';
        };
      }
      
      // Initialize settings validator
      if (window.SettingsValidator) {
        window.SettingsValidator.init();
        window.SettingsValidator.setupFormValidation();
      }
    }, 100);
    
    UI.Modal.show('Settings', settingsForm, [
      {
        text: 'Cancel',
        class: 'btn-secondary',
        handler: () => UI.Modal.hide()
      },
      {
        text: 'Save Settings',
        class: 'btn-primary',
        handler: () => this.saveSettings()
      }
    ]);
  }
  
  // Refresh current view
  refreshCurrentView() {
    this.handleViewChange(this.currentView);
  }
  
  // Google Sheets Authentication Methods
  
  /**
   * Authenticate with Google Sheets
   */
  async authenticateGoogle() {
    try {
      Utils.Loading.show('Authenticating with Google...');
      
      if (!window.AuthManager) {
        throw new Error('AuthManager not available');
      }
      
      // Initialize and authenticate with Google
      const initialized = await window.AuthManager.init();
      if (!initialized) {
        throw new Error('Failed to initialize Google authentication');
      }
      
      await window.AuthManager.authenticate();
      
      // Initialize SheetsManager after successful authentication
      if (window.SheetsManager && !window.SheetsManager.isInitialized) {
        await window.SheetsManager.init();
      }
      
      // Unified sync system is automatically enabled when conditions are met
      console.log('Google Sheets sync will be enabled automatically by unified sync system');
      
      Utils.Loading.hide();
      Utils.Notify.success('Successfully authenticated with Google!');
      
      // Update settings UI
      this.updateGoogleSheetsStatus();
      
    } catch (error) {
      Utils.Loading.hide();
      console.error('Google authentication failed:', error);
      
      let errorMessage = 'Authentication failed: ';
      if (error.message.includes('popup')) {
        errorMessage += 'Please allow popups for this site and try again.';
      } else if (error.message.includes('access_denied')) {
        errorMessage += 'Access denied. Please grant the required permissions.';
      } else {
        errorMessage += error.message;
      }
      
      Utils.Notify.error(errorMessage);
    }
  }
  
  /**
   * Sign out from Google Sheets
   */
  async signOutGoogle() {
    try {
      Utils.Loading.show('Signing out...');
      
      if (window.AuthManager) {
        await window.AuthManager.signOut();
      }
      
      // Disable sync
      if (window.SyncManager && window.SyncManager.isEnabled) {
        // Unified sync system handles disabling automatically
      }
      
      Utils.Loading.hide();
      Utils.Notify.success('Successfully signed out from Google');
      
      // Update settings UI
      this.updateGoogleSheetsStatus();
      
    } catch (error) {
      Utils.Loading.hide();
      console.error('Sign out failed:', error);
      Utils.Notify.error('Sign out failed: ' + error.message);
    }
  }
  
  /**
   * Test Google credentials
   */
  async testGoogleCredentials() {
    try {
      Utils.Loading.show('Testing credentials...');
      
      // Get credentials from form
      const apiKey = Utils.DOM.get('#googleApiKey')?.value?.trim();
      const clientId = Utils.DOM.get('#googleClientId')?.value?.trim();
      
      if (!apiKey || !clientId) {
        throw new Error('Please enter both API Key and Client ID');
      }
      
      // Update credentials temporarily for testing
      const originalCredentials = window.AuthManager?.getCredentials();
      
      if (window.AuthManager) {
        await window.AuthManager.updateCredentials({
          apiKey,
          clientId
        });
        
        // Test authentication
        const isValid = await window.AuthManager.validateAuthentication();
        
        if (isValid) {
          Utils.Loading.hide();
          Utils.Notify.success('Credentials are valid!');
        } else {
          // Restore original credentials
          if (originalCredentials) {
            await window.AuthManager.updateCredentials(originalCredentials);
          }
          throw new Error('Invalid credentials or insufficient permissions');
        }
      } else {
        throw new Error('AuthManager not available');
      }
      
    } catch (error) {
      Utils.Loading.hide();
      console.error('Credential test failed:', error);
      Utils.Notify.error('Credential test failed: ' + error.message);
    }
  }
  
  /**
   * Clear Google credentials override
   */
  async clearGoogleCredentials() {
    try {
      // Clear form fields
      const apiKeyField = Utils.DOM.get('#googleApiKey');
      const clientIdField = Utils.DOM.get('#googleClientId');
      
      if (apiKeyField) apiKeyField.value = '';
      if (clientIdField) clientIdField.value = '';
      
      // Clear stored override credentials
      if (window.EnvironmentManager) {
        await window.EnvironmentManager.clearStoredCredentials();
      }
      
      // Reinitialize with environment credentials
      if (window.AuthManager) {
        await window.AuthManager.updateCredentials({});
      }
      
      Utils.Notify.success('Credential override cleared. Using environment variables.');
      
      // Update settings UI
      this.updateGoogleSheetsStatus();
      
    } catch (error) {
      console.error('Failed to clear credentials:', error);
      Utils.Notify.error('Failed to clear credentials: ' + error.message);
    }
  }
  
  /**
   * Update Google Sheets status in settings UI
   */
  updateGoogleSheetsStatus() {
    // Update authentication status indicator
    const statusIndicator = Utils.DOM.get('.credential-status .status-indicator');
    const statusText = Utils.DOM.get('.credential-status .status-text');
    const credentialSource = Utils.DOM.get('.credential-source');
    
    if (statusIndicator && statusText) {
      const isAuthenticated = window.AuthManager?.isAuthenticatedUser() || false;
      const isUsingEnv = window.EnvironmentManager?.isUsingEnvironmentCredentials() || false;
      
      statusIndicator.className = `status-indicator ${isAuthenticated ? 'authenticated' : 'not-authenticated'}`;
      statusText.textContent = isAuthenticated ? 'Authenticated' : 'Not Authenticated';
      
      if (credentialSource) {
        credentialSource.textContent = isUsingEnv ? 
          'Using environment credentials' : 
          'Using manual credentials';
      }
    }
    
    // Update sync status
    if (window.SyncStatusUI) {
      window.SyncStatusUI.updateDisplay();
    }
  }
  
  /**
   * Toggle password visibility for credential fields
   */
  togglePasswordVisibility(fieldId) {
    const field = Utils.DOM.get(`#${fieldId}`);
    if (field) {
      field.type = field.type === 'password' ? 'text' : 'password';
    }
  }
  
  /**
   * Handle Google Sheets configuration changes
   */
  async handleGoogleSheetsConfigChanges(config) {
    try {
      // Check if Google Sheets was enabled/disabled
      const wasEnabled = Config.googleSheets.enabled;
      const isNowEnabled = config.googleSheets?.enabled || false;
      
      // Handle credential updates
      const apiKey = Utils.DOM.get('#googleApiKey')?.value?.trim();
      const clientId = Utils.DOM.get('#googleClientId')?.value?.trim();
      
      if (apiKey || clientId) {
        // Update credentials if provided
        const newCredentials = {};
        if (apiKey) newCredentials.apiKey = apiKey;
        if (clientId) newCredentials.clientId = clientId;
        
        if (window.EnvironmentManager) {
          await window.EnvironmentManager.storeCredentials(newCredentials);
        }
        
        // Update AuthManager with new credentials
        if (window.AuthManager) {
          await window.AuthManager.updateCredentials(newCredentials);
        }
      }
      
      // Handle sync enable/disable
      if (wasEnabled !== isNowEnabled) {
        if (isNowEnabled) {
          // Enable Google Sheets sync
          await this.enableGoogleSheetsSync();
        } else {
          // Disable Google Sheets sync
          await this.disableGoogleSheetsSync();
        }
      } else if (isNowEnabled) {
        // Sync was already enabled, check if we need to reinitialize
        if (apiKey || clientId) {
          // Credentials changed, reinitialize
          await this.reinitializeGoogleSheetsSync();
        }
      }
      
      // Update spreadsheet ID if changed
      const spreadsheetId = Utils.DOM.get('#googleSpreadsheetId')?.value?.trim();
      if (spreadsheetId && spreadsheetId !== Config.googleSheets.spreadsheetId) {
        Config.googleSheets.spreadsheetId = spreadsheetId;
        
        // Update SheetsManager with new spreadsheet ID
        if (window.SheetsManager && window.SheetsManager.isInitialized) {
          window.SheetsManager.spreadsheetId = spreadsheetId;
          window.UIUtils.Storage.set('vat_spreadsheet_id', spreadsheetId);
        }
      }
      
      // Update sync interval if changed
      const syncInterval = parseInt(Utils.DOM.get('#syncInterval')?.value) * 1000;
      if (syncInterval && syncInterval !== Config.sync.interval) {
        Config.sync.interval = syncInterval;
        
        // Update sync manager interval
        if (window.Sync && window.Sync.setSyncInterval) {
          window.SyncManager.setSyncInterval(syncInterval);
        }
      }
      
    } catch (error) {
      console.error('Error handling Google Sheets config changes:', error);
      throw error;
    }
  }
  
  /**
   * Enable Google Sheets sync
   */
  async enableGoogleSheetsSync() {
    try {
      console.log('Enabling Google Sheets sync...');
      
      // Initialize AuthManager (handles singleton internally)
      if (window.AuthManager) {
        const authInitialized = await window.AuthManager.init();
        if (!authInitialized) {
          throw new Error('Failed to initialize Google authentication');
        }
      }
      
      // Initialize SheetsManager if authenticated
      if (window.AuthManager && window.AuthManager.isAuthenticatedUser()) {
        if (window.SheetsManager && !window.SheetsManager.isInitialized) {
          await window.SheetsManager.init();
        }
        
        // Enable sync
        if (window.SyncManager && !window.SyncManager.isEnabled) {
          // Unified sync system handles enabling automatically
        }
      }
      
      console.log('Google Sheets sync enabled successfully');
      
    } catch (error) {
      console.error('Failed to enable Google Sheets sync:', error);
      throw error;
    }
  }
  
  /**
   * Disable Google Sheets sync
   */
  async disableGoogleSheetsSync() {
    try {
      console.log('Disabling Google Sheets sync...');
      
      // Disable sync
      if (window.SyncManager && window.SyncManager.isEnabled) {
        // Unified sync system handles disabling automatically
      }
      
      console.log('Google Sheets sync disabled successfully');
      
    } catch (error) {
      console.error('Failed to disable Google Sheets sync:', error);
      throw error;
    }
  }
  
  /**
   * Reinitialize Google Sheets sync with new credentials
   */
  async reinitializeGoogleSheetsSync() {
    try {
      console.log('Reinitializing Google Sheets sync with new credentials...');
      
      // Sign out first to clear old tokens
      if (window.AuthManager && window.AuthManager.isAuthenticatedUser()) {
        await window.AuthManager.signOut();
      }
      
      // Reinitialize AuthManager
      if (window.AuthManager) {
        // Force re-initialization by resetting the flag
        window.AuthManager.isInitialized = false;
        const authInitialized = await window.AuthManager.init();
        if (!authInitialized) {
          throw new Error('Failed to reinitialize Google authentication');
        }
      }
      
      // Reset SheetsManager
      if (window.SheetsManager) {
        window.SheetsManager.isInitialized = false;
      }
      
      console.log('Google Sheets sync reinitialized successfully');
      
    } catch (error) {
      console.error('Failed to reinitialize Google Sheets sync:', error);
      throw error;
    }
  }
  
  /**
   * Trigger data sync for specific data type (optimized for performance)
   */
  async triggerDataSync(dataType = null) {
    try {
      // Update data indexes when data changes (immediate for fast lookups)
      if (window.DataIndex && window.DataIndex.isInitialized && dataType) {
        // Force index update for the changed data type
        setTimeout(() => {
          window.DataIndex.updateIndexes(dataType, 'update', null);
        }, 50); // Very fast update for indexes
      }
      
      // Only sync if Google Sheets is enabled and we're authenticated
      if (!Config.googleSheets.enabled || 
          !window.AuthManager?.isAuthenticatedUser() || 
          !window.SyncManager?.isEnabled) {
        return;
      }
      
      // Don't trigger if already syncing
      if (window.Sync && window.SyncManager.isSyncing) {
        return;
      }
      
      // Trigger sync with specific data type or all data
      const syncOptions = dataType ? { types: [dataType] } : {};
      
      // Use a small delay to batch multiple rapid changes
      if (this.syncTriggerTimeout) {
        clearTimeout(this.syncTriggerTimeout);
      }
      
      this.syncTriggerTimeout = setTimeout(async () => {
        try {
          if (window.Sync) {
            await window.SyncManager.performSync(syncOptions);
          }
        } catch (error) {
          console.error('Auto-sync failed:', error);
          // Don't show error notification for auto-sync failures
        }
      }, 2000); // 2 second delay to batch changes
      
    } catch (error) {
      console.error('Error triggering data sync:', error);
    }
  }
  
  // Load saved settings
  async loadSettings() {
    if (window.ConfigManager) {
      try {
        const loaded = await window.ConfigManager.loadConfig();
        if (loaded) {
          console.log('Settings loaded from storage via ConfigManager');
        } else {
          console.log('Using default settings');
        }
      } catch (error) {
        console.error('Error loading settings via ConfigManager:', error);
        console.log('Using default settings');
      }
    } else {
      // Fallback to old method
      const savedSettings = Utils.Storage.get(Config.storageKeys.settings);
      if (savedSettings) {
        // Merge saved settings with defaults
        if (savedSettings.scanner) {
          Object.assign(Config.scanner, savedSettings.scanner);
        }
        if (savedSettings.sync) {
          Object.assign(Config.sync, savedSettings.sync);
        }
        if (savedSettings.ui) {
          Object.assign(Config.ui, savedSettings.ui);
        }
        if (savedSettings.googleSheets) {
          Object.assign(Config.googleSheets, savedSettings.googleSheets);
        }
        
        console.log('Settings loaded from storage (fallback)');
      }
    }
  }

  /**
   * Generate Gurukul event name with MM/DD/YY format
   */
  generateGurukulEventName(date) {
    const eventDate = new Date(date);
    const month = String(eventDate.getMonth() + 1).padStart(2, '0');
    const day = String(eventDate.getDate()).padStart(2, '0');
    const year = String(eventDate.getFullYear()).slice(-2);
    return `Gurukul - ${month}/${day}/${year}`;
  }

  /**
   * Auto-restore configuration from environment variables and available credentials
   */
  async autoRestoreConfiguration() {
    try {
      console.log('🔄 Auto-restoring configuration from available sources...');
      
      let configChanged = false;
      
      // Check if Google Sheets should be auto-enabled based on available credentials
      if (window.CredentialManager) {
        const credentials = await window.CredentialManager.loadCredentials();
        const hasCredentials = credentials.apiKey && credentials.clientId;
        
        // Enable if we have credentials, regardless of current auth state
        // (auth can be restored later)
        if (hasCredentials && !Config.googleSheets.enabled) {
          console.log('🔄 Auto-enabling Google Sheets: credentials available');
          configChanged = true;
        }
      }
      
      // Check if configuration exists in storage but might need updating
      const savedConfig = await Storage.getItem('config');
      
      if (savedConfig && savedConfig.googleSheets && savedConfig.googleSheets.enabled && !configChanged) {
        console.log('ℹ️ Google Sheets already enabled in storage, skipping auto-restoration');
        return;
      }
      
      console.log('📋 No saved configuration found, checking for auto-restoration opportunities...');
      
      // If we determined that Google Sheets should be enabled, do it now
      if (configChanged) {
        console.log('✅ Auto-enabling Google Sheets sync');
        Config.googleSheets.enabled = true;
        
        // Load and set credentials in config for validation
        try {
          const credentials = await window.CredentialManager.loadCredentials();
          if (credentials.apiKey && credentials.clientId) {
            Config.googleSheets.apiKey = credentials.apiKey;
            Config.googleSheets.clientId = credentials.clientId;
            Config.googleSheets.spreadsheetId = credentials.spreadsheetId;
            console.log('✅ Credentials loaded into configuration');
          }
        } catch (error) {
          console.warn('⚠️ Could not load credentials into config:', error);
        }
        
        // Also enable sync if Google Sheets is enabled
        if (!Config.sync.enabled) {
          console.log('✅ Auto-enabling sync since Google Sheets is available');
          Config.sync.enabled = true;
        }
      } else {
        // Check if Google Sheets credentials are available (fallback logic)
        if (window.CredentialManager) {
          try {
            const credentials = await window.CredentialManager.loadCredentials();
            
            if (credentials.apiKey && credentials.clientId && !Config.googleSheets.enabled) {
              console.log('✅ Found Google Sheets credentials, auto-enabling Google Sheets sync');
              Config.googleSheets.enabled = true;
              Config.googleSheets.apiKey = credentials.apiKey;
              Config.googleSheets.clientId = credentials.clientId;
              Config.googleSheets.spreadsheetId = credentials.spreadsheetId;
              configChanged = true;
              
              // Also enable sync if Google Sheets is enabled
              if (!Config.sync.enabled) {
                console.log('✅ Auto-enabling sync since Google Sheets is available');
                Config.sync.enabled = true;
              }
            } else {
              console.log('ℹ️ No Google Sheets credentials found or already enabled');
            }
          } catch (error) {
            console.warn('⚠️ Error checking credentials:', error);
          }
        }
      }
      
      // Save restored configuration if changes were made
      if (configChanged) {
        await Storage.setItem('config', {
          scanner: Config.scanner,
          googleSheets: Config.googleSheets,
          sync: Config.sync,
          ui: Config.ui
        });
        console.log('✅ Configuration auto-restored and saved to storage');
        
        // Trigger updates across all components
        this.notifyConfigurationChange();
      } else {
        console.log('ℹ️ No auto-restoration needed');
      }
      
    } catch (error) {
      console.warn('⚠️ Auto-restoration failed:', error);
    }
  }

  /**
   * Notify all components that configuration has changed
   */
  notifyConfigurationChange() {
    console.log('📢 Notifying components of configuration change...');
    
    // Update sync status UI
    if (window.SyncStatusUI) {
      window.SyncStatusUI.updateDisplay();
    }
    
    // Update scanner status
    if (window.Scanner) {
      window.Scanner.updateStatus();
    }
    
    // Update main sync status
    this.updateSyncStatus();
    
    console.log('✅ All components notified of configuration change');
  }
  
  // Update sync status
  updateSyncStatus() {
    const syncStatus = Utils.DOM.get('#syncStatus');
    if (syncStatus) {
      // Check if sync service is available before accessing it
      if (Config.sync.enabled && window.Sync && window.SyncManager.isOnline) {
        Utils.DOM.addClass(syncStatus, 'online');
        syncStatus.querySelector('.status-text').textContent = 'Online';
      } else {
        Utils.DOM.removeClass(syncStatus, 'online');
        syncStatus.querySelector('.status-text').textContent = 'Offline';
      }
    }
  }
  
  // Save settings
  async saveSettings() {
    try {
      // Get form values
      const newConfig = this.collectSettingsFromForm();
      
      // Validate configuration using ConfigManager
      if (window.ConfigManager) {
        const validation = window.ConfigManager.validateConfig(newConfig);
        
        if (!validation.isValid) {
          Utils.Notify.error('Settings validation failed: ' + validation.errors.join(', '));
          return;
        }
        
        if (validation.warnings.length > 0) {
          console.warn('Settings warnings:', validation.warnings);
          // Show warnings but continue
          Utils.Notify.warning('Settings saved with warnings. Check console for details.');
        }
        
        // Sanitize configuration
        const sanitizedConfig = window.ConfigManager.sanitizeConfig(newConfig);
        
        // Apply configuration changes
        await this.applyConfigurationChanges(sanitizedConfig);
        
        // Save using ConfigManager
        await window.ConfigManager.applyConfig(sanitizedConfig);
        
        // Handle Google Sheets credential updates
        await this.handleGoogleSheetsConfigChanges(sanitizedConfig);
        
      } else {
        // Fallback to old method
        await this.applyConfigurationChanges(newConfig);
        await this.saveConfigurationFallback(newConfig);
        
        // Handle Google Sheets credential updates
        await this.handleGoogleSheetsConfigChanges(newConfig);
      }
      
      UI.Modal.hide();
      Utils.Notify.success('Settings saved successfully');
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      Utils.Notify.error('Failed to save settings: ' + error.message);
    }
  }
  
  // Collect settings from form
  collectSettingsFromForm() {
    return {
      scanner: {
        enabled: Utils.DOM.get('#scannerEnabled')?.checked ?? Config.scanner.enabled,
        autoFocus: Utils.DOM.get('#autoFocus')?.checked ?? Config.scanner.autoFocus,
        prefix: Utils.DOM.get('#scannerPrefix')?.value ?? Config.scanner.prefix,
        suffix: Utils.DOM.get('#scannerSuffix')?.value ?? Config.scanner.suffix,
        timeout: Config.scanner.timeout // Keep existing value
      },
      sync: {
        enabled: Utils.DOM.get('#syncEnabled')?.checked ?? Config.sync.enabled,
        interval: (parseInt(Utils.DOM.get('#syncInterval')?.value) || Config.sync.interval / 1000) * 1000,
        retryAttempts: Config.sync.retryAttempts, // Keep existing value
        retryDelay: Config.sync.retryDelay // Keep existing value
      },
      googleSheets: {
        enabled: Utils.DOM.get('#googleSheetsEnabled')?.checked ?? Config.googleSheets.enabled,
        apiKey: Utils.DOM.get('#googleApiKey')?.value?.trim() ?? Config.googleSheets.apiKey,
        clientId: Utils.DOM.get('#googleClientId')?.value?.trim() ?? Config.googleSheets.clientId,
        spreadsheetId: Utils.DOM.get('#googleSpreadsheetId')?.value?.trim() ?? Config.googleSheets.spreadsheetId,
        // syncInterval removed from googleSheets config - using Config.sync.interval
        discoveryDoc: Config.googleSheets.discoveryDoc, // Keep existing value
        scopes: Config.googleSheets.scopes, // Keep existing value
        retryAttempts: Config.googleSheets.retryAttempts, // Keep existing value
        retryDelay: Config.googleSheets.retryDelay, // Keep existing value
        batchSize: Config.googleSheets.batchSize // Keep existing value
      },
      ui: {
        recentAttendanceLimit: parseInt(Utils.DOM.get('#recentLimit')?.value) || Config.ui.recentAttendanceLimit,
        autoRefreshInterval: (parseInt(Utils.DOM.get('#autoRefresh')?.value) || Config.ui.autoRefreshInterval / 1000) * 1000,
        animationDuration: Config.ui.animationDuration // Keep existing value
      },
      events: {
        scanningWindowDays: Config.events.scanningWindowDays, // Keep existing value
        defaultDuration: Config.events.defaultDuration, // Keep existing value
        autoCreateSundays: Config.events.autoCreateSundays // Keep existing value
      }
    };
  }
  
  // Apply configuration changes
  async applyConfigurationChanges(newConfig) {
    const wasGoogleSheetsEnabled = Config.googleSheets.enabled;
    
    // Handle credential updates first
    if (newConfig.googleSheets.apiKey || newConfig.googleSheets.clientId) {
      const credentials = {};
      if (newConfig.googleSheets.apiKey) credentials.apiKey = newConfig.googleSheets.apiKey;
      if (newConfig.googleSheets.clientId) credentials.clientId = newConfig.googleSheets.clientId;
      
      await window.AuthManager.updateCredentials(credentials);
    }
    
    // Handle Google Sheets sync state changes
    if (newConfig.googleSheets.enabled && !wasGoogleSheetsEnabled) {
      // Google Sheets sync was just enabled
      try {
        await window.AuthManager.init();
        
        if (window.AuthManager.isAuthenticatedUser()) {
          await window.SheetsManager.init();
        }
        
        // Restart sync with new settings
        if (window.Sync) {
          // Unified sync system initializes automatically
        }
      } catch (error) {
        console.error('Failed to initialize Google Sheets sync:', error);
        Utils.Notify.warning('Google Sheets sync enabled but initialization failed. Check your credentials.');
      }
    } else if (!newConfig.googleSheets.enabled && wasGoogleSheetsEnabled) {
      // Google Sheets sync was just disabled
      if (window.Sync) {
        // Unified sync system handles disabling automatically;
      }
    }
    
    // Update scanner status
    if (window.Scanner && window.Scanner.updateStatus) {
      window.Scanner.updateStatus();
    }
    
    // Update sync service
    if (window.Sync) {
      if (newConfig.sync.enabled && !window.Sync.isEnabled) {
        // Unified sync system handles enabling automatically;
      } else if (!newConfig.sync.enabled && window.Sync.isEnabled) {
        // Unified sync system handles disabling automatically;
      }
    }
    
    // Initialize Google Sheets sync if enabled
    if (newConfig.googleSheets.enabled) {
      await window.AuthManager.init();
    }
  }
  
  // Fallback configuration save method
  async saveConfigurationFallback(newConfig) {
    // Update Config object
    Object.assign(Config.scanner, newConfig.scanner);
    Object.assign(Config.sync, newConfig.sync);
    Object.assign(Config.googleSheets, newConfig.googleSheets);
    Object.assign(Config.ui, newConfig.ui);
    Object.assign(Config.events, newConfig.events);
    
    // Save to localStorage
    Utils.Storage.set(Config.storageKeys.settings, {
      scanner: Config.scanner,
      sync: Config.sync,
      ui: Config.ui,
      googleSheets: Config.googleSheets,
      events: Config.events
    });
  }
  
  // Toggle password visibility
  togglePasswordVisibility(inputId) {
    const input = Utils.DOM.get(`#${inputId}`);
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  }
  
  // Test Google credentials
  async testGoogleCredentials() {
    try {
      Utils.Loading.show('Testing credentials...');
      
      const apiKey = Utils.DOM.get('#googleApiKey')?.value?.trim();
      const clientId = Utils.DOM.get('#googleClientId')?.value?.trim();
      
      if (!apiKey || !clientId) {
        Utils.Loading.hide();
        Utils.Notify.error('Please enter both API Key and Client ID');
        return;
      }
      
      // Temporarily update credentials for testing
      await window.AuthManager.updateCredentials({ apiKey, clientId });
      
      // Try to initialize
      const success = await window.AuthManager.init();
      
      Utils.Loading.hide();
      
      if (success) {
        Utils.Notify.success('Credentials are valid!');
      } else {
        Utils.Notify.error('Invalid credentials or initialization failed');
      }
      
    } catch (error) {
      Utils.Loading.hide();
      Utils.Notify.error('Credential test failed: ' + error.message);
    }
  }
  
  // Clear Google credentials
  async clearGoogleCredentials() {
    try {
      await window.EnvironmentManager.clearStoredCredentials();
      
      // Clear form fields
      const apiKeyInput = Utils.DOM.get('#googleApiKey');
      const clientIdInput = Utils.DOM.get('#googleClientId');
      
      if (apiKeyInput) apiKeyInput.value = '';
      if (clientIdInput) clientIdInput.value = '';
      
      Utils.Notify.success('Google credentials cleared');
      
      // Update credential status display
      setTimeout(() => {
        this.updateCredentialStatus();
      }, 100);
      
    } catch (error) {
      Utils.Notify.error('Failed to clear credentials: ' + error.message);
    }
  }
  
  // Update credential status in settings UI
  updateCredentialStatus() {
    const statusIndicator = Utils.DOM.get('.credential-status .status-indicator');
    const statusText = Utils.DOM.get('.credential-status .status-text');
    const credentialSource = Utils.DOM.get('.credential-source');
    
    if (statusIndicator && statusText) {
      const isAuthenticated = window.AuthManager?.isAuthenticatedUser() || false;
      const isUsingEnvCredentials = window.EnvironmentManager?.isUsingEnvironmentCredentials() || false;
      
      statusIndicator.className = `status-indicator ${isAuthenticated ? 'authenticated' : 'not-authenticated'}`;
      statusText.textContent = isAuthenticated ? 'Authenticated' : 'Not Authenticated';
      
      if (credentialSource) {
        credentialSource.textContent = isUsingEnvCredentials ? 
          'Using environment credentials' : 
          'Using manual credentials';
      }
    }
  }
  
  // Export all data
  async exportAllData() {
    try {
      Utils.Loading.show('Exporting data...');
      
      const volunteers = await Storage.getAllVolunteers();
      const events = await Storage.getAllEvents();
      const attendance = await Storage.getAllAttendance();
      
      const exportData = {
        volunteers,
        events,
        attendance,
        exportedAt: new Date().toISOString(),
        version: Config.version
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `gurukul-attendance-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      Utils.Loading.hide();
      Utils.Notify.success('Data exported successfully');
      
    } catch (error) {
      Utils.Loading.hide();
      Utils.Notify.error('Export failed: ' + error.message);
    }
  }
  
  // Import data
  async importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        Utils.Loading.show('Importing data...');
        
        const text = await file.text();
        const importData = JSON.parse(text);
        
        // Validate import data structure
        if (!importData.volunteers || !importData.events || !importData.attendance) {
          throw new Error('Invalid import file format');
        }
        
        // Confirm import
        const confirmed = await new Promise(resolve => {
          UI.Modal.confirm(
            'Import Data',
            `This will replace all existing data with ${importData.volunteers.length} volunteers, ${importData.events.length} events, and ${importData.attendance.length} attendance records. Continue?`,
            () => resolve(true),
            () => resolve(false)
          );
        });
        
        if (!confirmed) {
          Utils.Loading.hide();
          return;
        }
        
        // Clear existing data
        await Storage.clearAllData();
        
        // Import new data with duplicate handling
        let importedVolunteers = 0;
        let skippedVolunteers = 0;
        
        for (const volunteer of importData.volunteers) {
          try {
            await Storage.addVolunteer(volunteer);
            importedVolunteers++;
          } catch (error) {
            if (error.message.includes('already exists')) {
              console.warn(`Skipping duplicate volunteer ID: ${volunteer.id}`);
              skippedVolunteers++;
            } else {
              throw error; // Re-throw other errors
            }
          }
        }
        
        console.log(`Import completed: ${importedVolunteers} volunteers imported, ${skippedVolunteers} duplicates skipped`);
        
        for (const event of importData.events) {
          await Storage.addEvent(event);
        }
        
        for (const record of importData.attendance) {
          await Storage.addAttendance(record);
        }
        
        Utils.Loading.hide();
        Utils.Notify.success('Data imported successfully');
        
        // Refresh current view
        this.refreshCurrentView();
        
      } catch (error) {
        Utils.Loading.hide();
        Utils.Notify.error('Import failed: ' + error.message);
      }
    };
    
    input.click();
  }
  
  // Export configuration
  async exportConfiguration() {
    try {
      if (!window.ConfigManager) {
        Utils.Notify.error('Configuration manager not available');
        return;
      }
      
      const config = window.ConfigManager.exportConfig();
      const configStr = JSON.stringify(config, null, 2);
      const configBlob = new Blob([configStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(configBlob);
      link.download = `gurukul-attendance-config-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      Utils.Notify.success('Configuration exported successfully');
      
    } catch (error) {
      Utils.Notify.error('Export failed: ' + error.message);
    }
  }
  
  // Import configuration
  async importConfiguration() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        Utils.Loading.show('Importing configuration...');
        
        const text = await file.text();
        const importData = JSON.parse(text);
        
        if (!window.ConfigManager) {
          Utils.Loading.hide();
          Utils.Notify.error('Configuration manager not available');
          return;
        }
        
        // Import configuration
        const result = await window.ConfigManager.importConfig(importData);
        
        Utils.Loading.hide();
        
        if (result.success) {
          Utils.Notify.success('Configuration imported successfully');
          
          if (result.warnings && result.warnings.length > 0) {
            console.warn('Import warnings:', result.warnings);
            Utils.Notify.warning('Configuration imported with warnings. Check console for details.');
          }
          
          // Refresh settings UI if open
          if (UI.Modal.current) {
            UI.Modal.hide();
            setTimeout(() => this.showSettings(), 100);
          }
          
          // Refresh current view
          this.refreshCurrentView();
          
        } else {
          Utils.Notify.error('Import failed: ' + result.error);
        }
        
      } catch (error) {
        Utils.Loading.hide();
        Utils.Notify.error('Import failed: ' + error.message);
      }
    };
    
    input.click();
  }
  
  // Reset configuration to defaults
  async resetConfiguration() {
    UI.Modal.confirm(
      'Reset Configuration',
      'This will reset all settings to their default values. A backup will be created automatically. Your data will not be affected. Continue?',
      async () => {
        try {
          Utils.Loading.show('Resetting configuration...');
          
          if (window.ConfigManager) {
            // Create backup before reset
            const backupId = window.ConfigManager.createBackup();
            if (backupId) {
              console.log('Backup created before reset:', backupId);
            }
            
            window.ConfigManager.resetConfig();
          } else {
            // Fallback reset
            Utils.Storage.remove(Config.storageKeys.settings);
            location.reload(); // Reload to apply defaults
          }
          
          Utils.Loading.hide();
          Utils.Notify.success('Configuration reset to defaults. Backup created automatically.');
          
          // Refresh settings UI if open
          if (UI.Modal.current) {
            UI.Modal.hide();
            setTimeout(() => this.showSettings(), 100);
          }
          
        } catch (error) {
          Utils.Loading.hide();
          Utils.Notify.error('Reset failed: ' + error.message);
        }
      }
    );
  }

  // Show configuration backups
  async showConfigurationBackups() {
    if (!window.ConfigManager) {
      Utils.Notify.error('Configuration manager not available');
      return;
    }

    try {
      const backups = window.ConfigManager.getStoredBackups();
      
      if (backups.length === 0) {
        Utils.Notify.info('No configuration backups found');
        return;
      }

      const backupList = backups.map(backup => `
        <div class="backup-item">
          <div class="backup-info">
            <strong>${backup.backupId}</strong>
            <small>Created: ${new Date(backup.exportedAt).toLocaleString()}</small>
            <small>Type: ${backup.backupType || 'manual'}</small>
          </div>
          <div class="backup-actions">
            <button class="btn btn-small btn-primary" onclick="app.restoreConfigurationBackup('${backup.backupId}')">
              Restore
            </button>
          </div>
        </div>
      `).join('');

      const backupsModal = `
        <div class="backups-list">
          <h4>Configuration Backups</h4>
          <p>Select a backup to restore:</p>
          ${backupList}
        </div>
      `;

      UI.Modal.show('Configuration Backups', backupsModal);

    } catch (error) {
      Utils.Notify.error('Failed to load backups: ' + error.message);
    }
  }

  // Restore configuration backup
  async restoreConfigurationBackup(backupId) {
    UI.Modal.confirm(
      'Restore Configuration',
      `This will restore configuration from backup "${backupId}". Current settings will be backed up automatically. Continue?`,
      async () => {
        try {
          Utils.Loading.show('Restoring configuration...');
          
          // Create backup of current config
          const currentBackupId = window.ConfigManager.createBackup();
          if (currentBackupId) {
            console.log('Current configuration backed up:', currentBackupId);
          }
          
          // Restore from backup
          await window.ConfigManager.restoreFromBackup(backupId);
          
          Utils.Loading.hide();
          Utils.Notify.success('Configuration restored successfully');
          
          // Refresh settings UI if open
          if (UI.Modal.current) {
            UI.Modal.hide();
            setTimeout(() => this.showSettings(), 100);
          }
          
          // Refresh current view
          this.refreshCurrentView();
          
        } catch (error) {
          Utils.Loading.hide();
          Utils.Notify.error('Restore failed: ' + error.message);
        }
      }
    );
  }
  
  // Data management methods - delegated to centralized DataManager
  async clearAllData() {
    return await window.DataManager.clearAllData();
  }

  async resetAndSyncFromSheets() {
    return await window.DataManager.resetAndSyncFromSheets();
  }

  async exportAllData() {
    return await window.DataManager.exportAllData();
  }

  async importData() {
    return await window.DataManager.importData();
  }
  
  // Edit volunteer
  async editVolunteer(volunteerId) {
    try {
      const volunteer = await Storage.getVolunteer(volunteerId);
      if (!volunteer) {
        Utils.Notify.error('Volunteer not found');
        return;
      }
      
      const form = UI.Form.create([
        { name: 'id', type: 'text', label: 'Volunteer ID', required: true, value: volunteer.id, readonly: true },
        { name: 'name', type: 'text', label: 'Full Name', required: true, value: volunteer.name },
        { name: 'email', type: 'email', label: 'Email', value: volunteer.email || '' },
        {
          name: 'committee',
          type: 'select',
          label: 'Committee',
          value: volunteer.committee || '',
          options: [
            { value: '', text: 'Select Committee' },
            { value: 'Teaching', text: 'Teaching' },
            { value: 'Administration', text: 'Administration' },
            { value: 'Events', text: 'Events' },
            { value: 'Maintenance', text: 'Maintenance' },
            { value: 'Other', text: 'Other' }
          ]
        }
      ], async (data) => {
        try {
          await Storage.updateVolunteer(volunteerId, data);
          UI.Modal.hide();
          Utils.Notify.success('Volunteer updated successfully');
          
          // Trigger sync for updated volunteer
          this.triggerDataSync('volunteers');
          
          if (this.currentView === 'volunteers') {
            this.updateVolunteersView();
          }
        } catch (error) {
          Utils.Notify.error('Error updating volunteer: ' + error.message);
        }
      });
      
      UI.Modal.show('Edit Volunteer', form.outerHTML);
      
    } catch (error) {
      Utils.Notify.error('Error loading volunteer: ' + error.message);
    }
  }
  
  // Delete volunteer
  async deleteVolunteer(volunteerId) {
    try {
      const volunteer = await Storage.getVolunteer(volunteerId);
      if (!volunteer) {
        Utils.Notify.error('Volunteer not found');
        return;
      }
      
      UI.Modal.confirm(
        'Delete Volunteer',
        `Are you sure you want to delete ${volunteer.name}? This will also delete all their attendance records.`,
        async () => {
          try {
            await Storage.deleteVolunteer(volunteerId);
            Utils.Notify.success('Volunteer deleted successfully');
            
            // Trigger sync for deleted volunteer
            this.triggerDataSync('volunteers');
            
            if (this.currentView === 'volunteers') {
              this.updateVolunteersView();
            }
          } catch (error) {
            Utils.Notify.error('Error deleting volunteer: ' + error.message);
          }
        }
      );
      
    } catch (error) {
      Utils.Notify.error('Error loading volunteer: ' + error.message);
    }
  }
  
  // Edit event
  async editEvent(eventId) {
    try {
      const event = await Storage.getEvent(eventId);
      if (!event) {
        Utils.Notify.error('Event not found');
        return;
      }
      
      const form = UI.Form.create([
        { name: 'name', type: 'text', label: 'Event Name', required: true, value: event.name },
        { name: 'date', type: 'date', label: 'Date', required: true, value: event.date },
        { name: 'description', type: 'textarea', label: 'Description', value: event.description || '' },
        {
          name: 'status',
          type: 'select',
          label: 'Status',
          value: event.status,
          options: [
            { value: 'Active', text: 'Active' },
            { value: 'Inactive', text: 'Inactive' }
          ]
        }
      ], async (data) => {
        try {
          // Keep existing time values since we removed the time fields from the form
          data.startTime = event.startTime || '10:00';
          data.endTime = event.endTime || '12:00';
          
          await Storage.updateEvent(eventId, data);
          UI.Modal.hide();
          Utils.Notify.success('Event updated successfully');
          
          // Trigger sync for updated event
          this.triggerDataSync('events');
          if (this.currentView === 'events') {
            this.updateEventsView();
          }
          if (window.Scanner && typeof window.Scanner.loadCurrentEvent === 'function') {
            window.Scanner.loadCurrentEvent();
          }
        } catch (error) {
          Utils.Notify.error('Error updating event: ' + error.message);
        }
      });
      
      // Show modal with custom actions to ensure proper form submission
      UI.Modal.show('Edit Event', form.outerHTML, [
        {
          text: 'Cancel',
          class: 'btn-secondary',
          handler: () => UI.Modal.hide()
        },
        {
          text: 'Update Event',
          class: 'btn-primary',
          handler: () => {
            const modalForm = Utils.DOM.get('#modal form');
            if (modalForm && UI.Form.validate(modalForm)) {
              modalForm.dispatchEvent(new Event('submit'));
            }
          }
        }
      ]);
      
    } catch (error) {
      Utils.Notify.error('Error loading event: ' + error.message);
    }
  }
  
  // Delete event
  async deleteEvent(eventId) {
    try {
      const event = await Storage.getEvent(eventId);
      if (!event) {
        Utils.Notify.error('Event not found');
        return;
      }
      
      UI.Modal.confirm(
        'Delete Event',
        `Are you sure you want to delete "${event.name}"? This will also delete all attendance records for this event.`,
        async () => {
          try {
            await Storage.deleteEvent(eventId);
            Utils.Notify.success('Event deleted successfully');
            
            // Trigger sync for deleted event
            this.triggerDataSync('events');
            if (this.currentView === 'events') {
              this.updateEventsView();
            }
            if (window.Scanner && typeof window.Scanner.loadCurrentEvent === 'function') {
              window.Scanner.loadCurrentEvent();
            }
          } catch (error) {
            Utils.Notify.error('Error deleting event: ' + error.message);
          }
        }
      );
      
    } catch (error) {
      Utils.Notify.error('Error loading event: ' + error.message);
    }
  }
  
  // View attendance for event
  async viewAttendance(eventId) {
    try {
      const event = await Storage.getEvent(eventId);
      const attendance = await Storage.getAttendanceByEvent(eventId);
      
      if (!event) {
        Utils.Notify.error('Event not found');
        return;
      }
      
      const attendanceList = attendance.length > 0 ? 
        attendance.map(record => `
          <div class="attendance-record">
            <strong>${record.volunteerName}</strong>
            <span>${Utils.Date.format(record.dateTime, 'datetime')}</span>
          </div>
        `).join('') :
        '<div class="empty-state">No attendance records for this event</div>';
      
      const content = `
        <div class="event-attendance">
          <div class="event-info">
            <h4>${event.name}</h4>
            <p><strong>Date:</strong> ${Utils.Date.format(event.date, 'date')}</p>
            <p><strong>Time:</strong> ${event.startTime} - ${event.endTime}</p>
            <p><strong>Total Attendance:</strong> ${attendance.length}</p>
          </div>
          <div class="attendance-list">
            ${attendanceList}
          </div>
        </div>
      `;
      
      UI.Modal.show(`Attendance - ${event.name}`, content);
      
    } catch (error) {
      Utils.Notify.error('Error loading attendance: ' + error.message);
    }
  }

  // Clear Google credentials
  async clearGoogleCredentials() {
    try {
      await window.EnvironmentManager.clearStoredCredentials();
      
      // Clear form fields
      const apiKeyInput = document.getElementById('googleApiKey');
      const clientIdInput = document.getElementById('googleClientId');
      
      if (apiKeyInput) apiKeyInput.value = '';
      if (clientIdInput) clientIdInput.value = '';
      
      Utils.Notify.success('Credential override cleared');
      
    } catch (error) {
      Utils.Notify.error('Failed to clear credentials: ' + error.message);
    }
  }
  
  // Export all data
  async exportAllData() {
    try {
      await window.SyncManager.exportData();
    } catch (error) {
      Utils.Notify.error('Export failed: ' + error.message);
    }
  }
  
  // Import data
  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          await window.SyncManager.importData(file);
          this.refreshCurrentView();
        } catch (error) {
          Utils.Notify.error('Import failed: ' + error.message);
        }
      }
    };
    input.click();
  }
  
  // Clear all data
  clearAllData() {
    UI.Modal.confirm(
      'Clear All Data',
      'This will permanently delete all volunteers, events, and attendance records. This action cannot be undone. Are you sure?',
      async () => {
        try {
          Utils.Loading.show('Clearing all data...');
          await Storage.clearAll();
          Utils.Loading.hide();
          Utils.Notify.success('All data cleared successfully');
          
          // Reload the page to reset everything
          window.location.reload();
          
        } catch (error) {
          Utils.Loading.hide();
          Utils.Notify.error('Failed to clear data: ' + error.message);
        }
      }
    );
  }
  
  // Placeholder methods for future implementation
  editVolunteer(id) { Volunteers.edit(id); }
  deleteVolunteer(id) { Volunteers.delete(id); }
  editEvent(id) { Events.edit(id); }
  deleteEvent(id) { Events.delete(id); }
  viewAttendance(id) { Events.viewAttendance(id); }
  exportReport() { 
    const period = Utils.DOM.get('#reportPeriod')?.value || 'week';
    Reports.generateAttendanceReport(period).then(report => {
      Reports.exportToCSV(report);
    }).catch(error => {
      Utils.Notify.error('Export failed: ' + error.message);
    });
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new VolunteerApp();
});