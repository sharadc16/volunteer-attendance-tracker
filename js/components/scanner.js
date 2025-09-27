/**
 * Scanner Component - Handles badge scanning functionality
 */
window.Scanner = {
  isEnabled: false,
  currentEvent: null,
  
  // Initialize scanner
  async init() {
    this.setupInput();
    await this.loadCurrentEvent();
    this.updateStatus();
    
    // Listen for events
    Utils.Event.on('viewChanged', (e) => {
      if (e.detail.view === 'dashboard') {
        this.focus();
      }
    });
    
    // Listen for settings changes
    Utils.Event.on('settingsSaved', () => {
      this.updateStatus();
    });
    
    console.log('Scanner initialized');
  },
  
  // Setup scanner input
  setupInput() {
    const input = Utils.DOM.get('#scannerInput');
    const clearBtn = Utils.DOM.get('#clearBtn');
    
    if (!input) return;
    
    // Input event handlers
    input.addEventListener('input', Utils.Event.debounce((e) => {
      this.handleInput(e.target.value);
    }, 300));
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.processScan(input.value.trim());
      }
    });
    
    // Clear button
    if (clearBtn) {
      clearBtn.onclick = () => {
        input.value = '';
        input.focus();
        UI.Feedback.clear('#scanFeedback');
      };
    }
    
    // Auto-focus
    if (Config.scanner.autoFocus) {
      this.focus();
    }
  },
  
  // Handle input changes
  handleInput(value) {
    if (!value) {
      UI.Feedback.clear('#scanFeedback');
      return;
    }
    
    // Remove prefix/suffix if configured
    let cleanValue = value;
    if (Config.scanner.prefix && cleanValue.startsWith(Config.scanner.prefix)) {
      cleanValue = cleanValue.substring(Config.scanner.prefix.length);
    }
    if (Config.scanner.suffix && cleanValue.endsWith(Config.scanner.suffix)) {
      cleanValue = cleanValue.substring(0, cleanValue.length - Config.scanner.suffix.length);
    }
    
    // Update input with clean value
    if (cleanValue !== value) {
      const input = Utils.DOM.get('#scannerInput');
      if (input) input.value = cleanValue;
    }
  },
  
  // Process scanned badge
  async processScan(volunteerId) {
    if (!volunteerId) {
      UI.Feedback.show('#scanFeedback', 'Please scan a badge or enter volunteer ID', 'error');
      return;
    }
    
    if (!this.currentEvent) {
      UI.Feedback.show('#scanFeedback', 'No active event found for scanning', 'error');
      return;
    }
    
    try {
      UI.Feedback.show('#scanFeedback', 'Processing...', 'info');
      
      // Check if volunteer exists
      let volunteer = await Storage.getVolunteer(volunteerId);
      
      if (!volunteer) {
        // Try to find by email or create new
        volunteer = await this.handleUnknownVolunteer(volunteerId);
        if (!volunteer) return;
      }
      
      // Record attendance
      await Storage.recordAttendance(volunteer.id, this.currentEvent.id);
      
      // Success feedback
      UI.Feedback.show('#scanFeedback', 
        `✅ ${volunteer.name} checked in successfully!`, 'success');
      
      // Clear input
      const input = Utils.DOM.get('#scannerInput');
      if (input) {
        input.value = '';
        input.focus();
      }
      
      // Update dashboard
      this.updateStats();
      Utils.Event.emit('attendanceRecorded', { volunteer, event: this.currentEvent });
      
      // Trigger sync for attendance data
      if (window.app && window.app.triggerDataSync) {
        window.app.triggerDataSync('attendance');
      }
      
      // Play sound if enabled
      if (Config.ui.playSound) {
        this.playSuccessSound();
      }
      
    } catch (error) {
      console.error('Scan processing error:', error);
      UI.Feedback.show('#scanFeedback', error.message || 'Error processing scan', 'error');
    }
  },
  
  // Handle unknown volunteer
  async handleUnknownVolunteer(volunteerId) {
    return new Promise((resolve) => {
      const form = UI.Form.create([
        {
          name: 'id',
          type: 'text',
          label: 'Volunteer ID',
          value: volunteerId,
          required: true,
          readonly: true
        },
        {
          name: 'name',
          type: 'text',
          label: 'Full Name',
          required: true,
          placeholder: 'Enter volunteer name'
        },
        {
          name: 'email',
          type: 'email',
          label: 'Email',
          placeholder: 'volunteer@example.com'
        },
        {
          name: 'committee',
          type: 'select',
          label: 'Committee',
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
          const volunteer = await Storage.addVolunteer(data);
          UI.Modal.hide();
          
          // Trigger sync for new volunteer
          if (window.app && window.app.triggerDataSync) {
            window.app.triggerDataSync('volunteers');
          }
          
          resolve(volunteer);
        } catch (error) {
          UI.Feedback.show('#scanFeedback', 'Error creating volunteer: ' + error.message, 'error');
          resolve(null);
        }
      });
      
      // Create form HTML manually to avoid losing event handlers
      const formHTML = `
        <form class="form">
          <div class="form-group">
            <label class="form-label">Volunteer ID <span class="required">*</span></label>
            <input class="form-input" type="text" name="id" value="${volunteerId}" readonly required>
          </div>
          <div class="form-group">
            <label class="form-label">Full Name <span class="required">*</span></label>
            <input class="form-input" type="text" name="name" placeholder="Enter volunteer name" required>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" name="email" placeholder="volunteer@example.com">
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
      
      UI.Modal.show('New Volunteer', formHTML, [
        {
          text: 'Cancel',
          class: 'btn-secondary',
          handler: () => {
            UI.Modal.hide();
            resolve(null);
          }
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
                
                const volunteer = await Storage.addVolunteer(data);
                UI.Modal.hide();
                
                // Trigger sync for new volunteer
                if (window.app && window.app.triggerDataSync) {
                  window.app.triggerDataSync('volunteers');
                }
                
                resolve(volunteer);
              } catch (error) {
                UI.Feedback.show('#scanFeedback', 'Error creating volunteer: ' + error.message, 'error');
                resolve(null);
              }
            }
          }
        }
      ]);
    });
  },
  
  // Load current event
  async loadCurrentEvent() {
    try {
      this.currentEvent = await Storage.getCurrentEvent();
      this.updateCurrentEventDisplay();
      this.updateStatus(); // Update scanner status after loading event
    } catch (error) {
      console.error('Error loading current event:', error);
    }
  },
  
  // Update current event display
  updateCurrentEventDisplay() {
    const eventEl = Utils.DOM.get('#currentEvent');
    if (!eventEl) return;
    
    if (this.currentEvent) {
      const today = Utils.Date.today();
      const isToday = this.currentEvent.date === today;
      
      if (isToday) {
        eventEl.textContent = `📅 ${this.currentEvent.name}`;
        eventEl.className = 'stat-value current';
      } else {
        const daysDiff = Utils.Date.daysBetween(new Date(this.currentEvent.date), new Date());
        eventEl.textContent = `🔄 ${this.currentEvent.name} (${daysDiff}d ago)`;
        eventEl.className = 'stat-value backfill';
      }
    } else {
      eventEl.textContent = 'No Active Event';
      eventEl.className = 'stat-value inactive';
    }
  },
  
  // Update scanner status
  updateStatus() {
    // Scanner is enabled only if:
    // 1. Scanner is enabled in config
    // 2. There's an active event
    // 3. Google Sheets sync is enabled (needed to save attendance data)
    const syncEnabled = Config.googleSheets?.enabled || false;
    this.isEnabled = Config.scanner.enabled && this.currentEvent !== null && syncEnabled;
    
    // Debug logging
    console.log('Scanner status update:', {
      configEnabled: Config.scanner.enabled,
      currentEvent: this.currentEvent,
      syncEnabled: syncEnabled,
      isEnabled: this.isEnabled
    });
    
    const input = Utils.DOM.get('#scannerInput');
    const scannerCard = Utils.DOM.get('.scanner-card');
    
    if (input) {
      input.disabled = !this.isEnabled;
      
      if (this.isEnabled) {
        input.placeholder = 'Scan badge or enter volunteer ID...';
      } else {
        // Provide specific reason why scanner is disabled
        if (!syncEnabled) {
          input.placeholder = 'Scanner disabled - Google Sheets sync required';
        } else if (!this.currentEvent) {
          input.placeholder = 'Scanner disabled - No active event';
        } else if (!Config.scanner.enabled) {
          input.placeholder = 'Scanner disabled in settings';
        } else {
          input.placeholder = 'Scanner disabled';
        }
      }
    }
    
    // Update scanner card visual state
    if (scannerCard) {
      if (this.isEnabled) {
        Utils.DOM.removeClass(scannerCard, 'disabled');
      } else {
        Utils.DOM.addClass(scannerCard, 'disabled');
      }
    }
  },
  
  // Update statistics
  async updateStats() {
    try {
      const todayAttendance = await Storage.getTodayAttendance();
      const totalVolunteers = await Storage.getVolunteerCount();
      
      // Update today's scans
      const todayScansEl = Utils.DOM.get('#todayScans');
      if (todayScansEl) {
        todayScansEl.textContent = todayAttendance.length;
      }
      
      // Update summary stats
      const checkedInEl = Utils.DOM.get('#checkedIn');
      const totalVolunteersEl = Utils.DOM.get('#totalVolunteers');
      const attendanceRateEl = Utils.DOM.get('#attendanceRate');
      
      if (checkedInEl) checkedInEl.textContent = todayAttendance.length;
      if (totalVolunteersEl) totalVolunteersEl.textContent = totalVolunteers;
      
      if (attendanceRateEl) {
        const rate = totalVolunteers > 0 ? Math.round((todayAttendance.length / totalVolunteers) * 100) : 0;
        attendanceRateEl.textContent = `${rate}%`;
      }
      
      // Update recent activity
      this.updateRecentActivity(todayAttendance);
      
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  },
  
  // Update recent activity list
  updateRecentActivity(attendance) {
    const activityList = Utils.DOM.get('#activityList');
    if (!activityList) return;
    
    if (attendance.length === 0) {
      UI.Empty.show(activityList, '📋', 'No check-ins yet', 'Start scanning badges to see activity');
      return;
    }
    
    // Sort by most recent first
    const recentAttendance = attendance
      .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))
      .slice(0, Config.ui.recentAttendanceLimit);
    
    const html = recentAttendance.map(record => `
      <div class="activity-item">
        <div class="volunteer-info">
          <div class="volunteer-name">${record.volunteerName}</div>
          <div class="volunteer-committee">${record.committee || 'Unknown'}</div>
        </div>
        <div class="check-in-time">${Utils.Date.format(record.dateTime, 'time')}</div>
      </div>
    `).join('');
    
    activityList.innerHTML = html;
  },
  
  // Focus scanner input
  focus() {
    const input = Utils.DOM.get('#scannerInput');
    if (input && !input.disabled) {
      setTimeout(() => input.focus(), 100);
    }
  },
  
  // Play success sound
  playSuccessSound() {
    try {
      // Create a simple beep sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // Ignore audio errors
      console.log('Audio not available');
    }
  },
  
  // Test scanner functionality
  test() {
    UI.Modal.confirm(
      'Test Scanner',
      'This will simulate scanning a test volunteer badge. Continue?',
      () => {
        this.processScan('TEST001');
      }
    );
  },
  
  // Force enable scanner (for debugging)
  forceEnable() {
    const input = Utils.DOM.get('#scannerInput');
    if (input) {
      input.disabled = false;
      input.placeholder = 'Scan badge or enter volunteer ID...';
      this.focus();
      console.log('Scanner force enabled');
    }
  }
};