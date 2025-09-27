/**
 * Volunteers Component - Handles volunteer management
 */
window.Volunteers = {
  
  currentLayout: 'table', // Default to table view for better performance
  initialized: false,
  
  // Initialize volunteers component
  init() {
    if (this.initialized) return;
    
    this.setupSearch();
    this.setupLayoutControls();
    this.initialized = true;
    console.log('Volunteers component initialized');
  },
  
  // Setup volunteer search
  setupSearch() {
    const searchInput = Utils.DOM.get('#volunteerSearch');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.Event.debounce((e) => {
        this.filterVolunteers(e.target.value);
      }, 300));
    }
  },
  
  // Setup layout controls
  setupLayoutControls() {
    const layoutBtns = document.querySelectorAll('.layout-btn');
    layoutBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const layout = e.target.dataset.layout;
        this.setLayout(layout);
      });
    });
  },
  
  // Set volunteer layout
  setLayout(layout) {
    this.currentLayout = layout;
    
    // Update active button
    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.layout === layout);
    });
    
    // Re-render with current data
    const searchInput = Utils.DOM.get('#volunteerSearch');
    const searchTerm = searchInput ? searchInput.value : '';
    this.filterVolunteers(searchTerm);
  },
  
  // Filter volunteers by search term
  async filterVolunteers(searchTerm) {
    const container = Utils.DOM.get('#volunteersContainer');
    if (!container) return;
    
    try {
      const volunteers = await Storage.getAllVolunteers();
      
      if (!searchTerm.trim()) {
        this.renderVolunteers(volunteers);
        return;
      }
      
      const filtered = volunteers.filter(volunteer => 
        volunteer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        volunteer.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (volunteer.email && volunteer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (volunteer.committee && volunteer.committee.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      
      this.renderVolunteers(filtered);
      
    } catch (error) {
      console.error('Error filtering volunteers:', error);
    }
  },
  
  // Render volunteers in selected layout
  renderVolunteers(volunteers) {
    const container = Utils.DOM.get('#volunteersContainer');
    if (!container) return;
    
    if (volunteers.length === 0) {
      UI.Empty.show(container, '🔍', 'No Results', 'No volunteers match your search');
      return;
    }
    
    switch (this.currentLayout) {
      case 'table':
        container.innerHTML = this.createTableView(volunteers);
        break;
      case 'dense':
        container.innerHTML = `<div class="content-grid dense">${volunteers.map(v => this.createDenseCard(v)).join('')}</div>`;
        break;
      case 'list':
        container.innerHTML = this.createListView(volunteers);
        break;
      case 'cards':
      default:
        container.innerHTML = `<div class="content-grid">${volunteers.map(v => this.createVolunteerCard(v)).join('')}</div>`;
        break;
    }
  },
  
  // Create table view (most efficient for large datasets)
  createTableView(volunteers) {
    return `
      <div class="volunteers-table">
        <div class="volunteers-table-header">
          <div class="volunteer-id-cell">ID</div>
          <div class="volunteer-name-cell">Name</div>
          <div class="volunteer-committee-cell">Committee</div>
          <div class="volunteer-actions-cell">Actions</div>
        </div>
        ${volunteers.map(volunteer => `
          <div class="volunteers-table-row" data-id="${volunteer.id}" onclick="Volunteers.quickView('${volunteer.id}')">
            <div class="volunteer-id-cell">${volunteer.id}</div>
            <div class="volunteer-name-cell">${volunteer.name}</div>
            <div class="volunteer-committee-cell">${volunteer.committee || 'Not assigned'}</div>
            <div class="volunteer-actions-cell" onclick="event.stopPropagation()">
              <button class="action-btn" onclick="Volunteers.edit('${volunteer.id}')" title="Edit">✏️</button>
              <button class="action-btn" onclick="Volunteers.viewHistory('${volunteer.id}')" title="History">📊</button>
              <button class="action-btn" onclick="Volunteers.delete('${volunteer.id}')" title="Delete">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },
  
  // Create dense card view
  createDenseCard(volunteer) {
    return `
      <div class="card volunteer-card dense" data-id="${volunteer.id}" onclick="Volunteers.quickView('${volunteer.id}')">
        <div class="card-body">
          <div class="volunteer-header">
            <div class="volunteer-name">${volunteer.name}</div>
            <div class="volunteer-id">${volunteer.id}</div>
          </div>
          <div class="volunteer-actions" onclick="event.stopPropagation()">
            <button class="btn btn-small btn-secondary" onclick="Volunteers.edit('${volunteer.id}')" title="Edit">✏️</button>
            <button class="btn btn-small btn-secondary" onclick="Volunteers.viewHistory('${volunteer.id}')" title="History">📊</button>
            <button class="btn btn-small btn-warning" onclick="Volunteers.delete('${volunteer.id}')" title="Delete">🗑️</button>
          </div>
        </div>
      </div>
    `;
  },
  
  // Create list view
  createListView(volunteers) {
    return `
      <div class="volunteers-list">
        ${volunteers.map(volunteer => `
          <div class="volunteer-list-item" data-id="${volunteer.id}" onclick="Volunteers.quickView('${volunteer.id}')">
            <div class="volunteer-avatar">${volunteer.name.charAt(0).toUpperCase()}</div>
            <div class="volunteer-list-info">
              <div class="volunteer-list-name">${volunteer.name}</div>
              <div class="volunteer-list-meta">${volunteer.id} • ${volunteer.committee || 'No committee'}</div>
            </div>
            <div class="volunteer-list-actions" onclick="event.stopPropagation()">
              <button class="action-btn" onclick="Volunteers.edit('${volunteer.id}')" title="Edit">✏️</button>
              <button class="action-btn" onclick="Volunteers.viewHistory('${volunteer.id}')" title="History">📊</button>
              <button class="action-btn" onclick="Volunteers.delete('${volunteer.id}')" title="Delete">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },
  
  // Create volunteer card HTML (original full card)
  createVolunteerCard(volunteer) {
    return `
      <div class="card volunteer-card" data-id="${volunteer.id}">
        <div class="card-body">
          <div class="volunteer-header">
            <h4 class="volunteer-name">${volunteer.name}</h4>
            <span class="volunteer-id">${volunteer.id}</span>
          </div>
          
          <div class="volunteer-details">
            <div class="detail-item">
              <span class="detail-label">Email:</span>
              <span class="detail-value">${volunteer.email || 'Not provided'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Committee:</span>
              <span class="detail-value">${volunteer.committee || 'Not assigned'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Joined:</span>
              <span class="detail-value">${Utils.Date.format(volunteer.createdAt, 'date')}</span>
            </div>
          </div>
          
          <div class="volunteer-actions">
            <button class="btn btn-small btn-secondary" onclick="Volunteers.edit('${volunteer.id}')">
              ✏️ Edit
            </button>
            <button class="btn btn-small btn-secondary" onclick="Volunteers.viewHistory('${volunteer.id}')">
              📊 History
            </button>
            <button class="btn btn-small btn-warning" onclick="Volunteers.delete('${volunteer.id}')">
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    `;
  },
  
  // Quick view volunteer details (for compact layouts)
  async quickView(volunteerId) {
    try {
      const volunteer = await Storage.getVolunteer(volunteerId);
      if (!volunteer) {
        Utils.Notify.error('Volunteer not found');
        return;
      }
      
      const content = `
        <div class="volunteer-quick-view">
          <div class="quick-view-header">
            <div class="volunteer-avatar large">${volunteer.name.charAt(0).toUpperCase()}</div>
            <div class="quick-view-info">
              <h3>${volunteer.name}</h3>
              <p class="volunteer-id">ID: ${volunteer.id}</p>
            </div>
          </div>
          
          <div class="quick-view-details">
            <div class="detail-row">
              <span class="detail-label">Email:</span>
              <span class="detail-value">${volunteer.email || 'Not provided'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Committee:</span>
              <span class="detail-value">${volunteer.committee || 'Not assigned'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Joined:</span>
              <span class="detail-value">${Utils.Date.format(volunteer.createdAt, 'datetime')}</span>
            </div>
          </div>
        </div>
      `;
      
      UI.Modal.show(`${volunteer.name}`, content, [
        {
          text: 'Edit',
          class: 'btn-secondary',
          handler: () => {
            UI.Modal.hide();
            this.edit(volunteerId);
          }
        },
        {
          text: 'View History',
          class: 'btn-secondary',
          handler: () => {
            UI.Modal.hide();
            this.viewHistory(volunteerId);
          }
        },
        {
          text: 'Close',
          class: 'btn-primary',
          handler: () => UI.Modal.hide()
        }
      ]);
      
    } catch (error) {
      Utils.Notify.error('Error loading volunteer: ' + error.message);
    }
  },
  
  // Add new volunteer
  async add(volunteerData) {
    try {
      // Validate required fields
      if (!volunteerData.id || !volunteerData.name) {
        throw new Error('ID and name are required');
      }
      
      // Check for duplicate ID
      const existing = await Storage.getVolunteer(volunteerData.id);
      if (existing) {
        throw new Error('Volunteer ID already exists');
      }
      
      // Check for duplicate email
      if (volunteerData.email) {
        const existingEmail = await Storage.findVolunteerByEmail(volunteerData.email);
        if (existingEmail) {
          throw new Error('Email already exists');
        }
      }
      
      // Add volunteer
      const volunteer = await Storage.addVolunteer(volunteerData);
      
      Utils.Notify.success('Volunteer added successfully');
      Utils.Event.emit('volunteerAdded', volunteer);
      
      return volunteer;
      
    } catch (error) {
      Utils.Notify.error('Error adding volunteer: ' + error.message);
      throw error;
    }
  },
  
  // Edit volunteer
  async edit(volunteerId) {
    try {
      const volunteer = await Storage.getVolunteer(volunteerId);
      if (!volunteer) {
        Utils.Notify.error('Volunteer not found');
        return;
      }
      
      const form = UI.Form.create([
        { 
          name: 'id', 
          type: 'text', 
          label: 'Volunteer ID', 
          value: volunteer.id, 
          required: true,
          readonly: true 
        },
        { 
          name: 'name', 
          type: 'text', 
          label: 'Full Name', 
          value: volunteer.name, 
          required: true 
        },
        { 
          name: 'email', 
          type: 'email', 
          label: 'Email', 
          value: volunteer.email || '' 
        },
        {
          name: 'committee',
          type: 'select',
          label: 'Committee',
          value: volunteer.committee,
          options: [
            { value: '', text: 'Select Committee' },
            { value: 'Teaching', text: 'Teaching', selected: volunteer.committee === 'Teaching' },
            { value: 'Administration', text: 'Administration', selected: volunteer.committee === 'Administration' },
            { value: 'Events', text: 'Events', selected: volunteer.committee === 'Events' },
            { value: 'Maintenance', text: 'Maintenance', selected: volunteer.committee === 'Maintenance' },
            { value: 'Other', text: 'Other', selected: volunteer.committee === 'Other' }
          ]
        }
      ], async (data) => {
        try {
          const updatedVolunteer = { ...volunteer, ...data };
          await Storage.updateVolunteer(updatedVolunteer);
          
          UI.Modal.hide();
          Utils.Notify.success('Volunteer updated successfully');
          Utils.Event.emit('volunteerUpdated', updatedVolunteer);
          
          // Refresh view if on volunteers page
          if (window.app && window.app.currentView === 'volunteers') {
            window.app.updateVolunteersView();
          }
          
        } catch (error) {
          Utils.Notify.error('Error updating volunteer: ' + error.message);
        }
      });
      
      // Create form HTML manually to avoid losing event handlers
      const formHTML = `
        <form class="form">
          <div class="form-group">
            <label class="form-label">Volunteer ID <span class="required">*</span></label>
            <input class="form-input" type="text" name="id" value="${volunteer.id}" readonly required>
          </div>
          <div class="form-group">
            <label class="form-label">Full Name <span class="required">*</span></label>
            <input class="form-input" type="text" name="name" value="${volunteer.name}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" name="email" value="${volunteer.email || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Committee</label>
            <select class="form-input" name="committee">
              <option value="">Select Committee</option>
              <option value="Teaching" ${volunteer.committee === 'Teaching' ? 'selected' : ''}>Teaching</option>
              <option value="Administration" ${volunteer.committee === 'Administration' ? 'selected' : ''}>Administration</option>
              <option value="Events" ${volunteer.committee === 'Events' ? 'selected' : ''}>Events</option>
              <option value="Maintenance" ${volunteer.committee === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
              <option value="Other" ${volunteer.committee === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
        </form>
      `;
      
      // Show modal with custom actions
      UI.Modal.show('Edit Volunteer', formHTML, [
        {
          text: 'Cancel',
          class: 'btn-secondary',
          handler: () => UI.Modal.hide()
        },
        {
          text: 'Update Volunteer',
          class: 'btn-primary',
          handler: async () => {
            const modalForm = Utils.DOM.get('#modal form');
            if (modalForm && UI.Form.validate(modalForm)) {
              try {
                // Get form data
                const formData = new FormData(modalForm);
                const data = Object.fromEntries(formData.entries());
                
                const updatedVolunteer = { ...volunteer, ...data };
                await Storage.updateVolunteer(updatedVolunteer);
                
                UI.Modal.hide();
                Utils.Notify.success('Volunteer updated successfully');
                Utils.Event.emit('volunteerUpdated', updatedVolunteer);
                
                // Refresh view if on volunteers page
                if (window.app && window.app.currentView === 'volunteers') {
                  window.app.updateVolunteersView();
                }
                
              } catch (error) {
                Utils.Notify.error('Error updating volunteer: ' + error.message);
              }
            }
          }
        }
      ]);
      
    } catch (error) {
      Utils.Notify.error('Error loading volunteer: ' + error.message);
    }
  },
  
  // Delete volunteer
  async delete(volunteerId) {
    try {
      const volunteer = await Storage.getVolunteer(volunteerId);
      if (!volunteer) {
        Utils.Notify.error('Volunteer not found');
        return;
      }
      
      UI.Modal.confirm(
        'Delete Volunteer',
        `Are you sure you want to delete "${volunteer.name}"? This action cannot be undone.`,
        async () => {
          try {
            await Storage.deleteVolunteer(volunteerId);
            
            Utils.Notify.success('Volunteer deleted successfully');
            Utils.Event.emit('volunteerDeleted', volunteer);
            
            // Refresh view if on volunteers page
            if (window.app && window.app.currentView === 'volunteers') {
              window.app.updateVolunteersView();
            }
            
          } catch (error) {
            Utils.Notify.error('Error deleting volunteer: ' + error.message);
          }
        }
      );
      
    } catch (error) {
      Utils.Notify.error('Error loading volunteer: ' + error.message);
    }
  },
  
  // View volunteer attendance history
  async viewHistory(volunteerId) {
    try {
      const volunteer = await Storage.getVolunteer(volunteerId);
      const attendance = await Storage.getAttendanceByVolunteer(volunteerId);
      
      if (!volunteer) {
        Utils.Notify.error('Volunteer not found');
        return;
      }
      
      // Sort attendance by date (most recent first)
      attendance.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
      
      let content = `
        <div class="volunteer-history">
          <div class="history-header">
            <h4>${volunteer.name}</h4>
            <p>Total check-ins: ${attendance.length}</p>
          </div>
      `;
      
      if (attendance.length === 0) {
        content += `
          <div class="empty-state">
            <span class="empty-icon">📋</span>
            <p>No attendance records found</p>
          </div>
        `;
      } else {
        content += `
          <div class="history-list">
            ${attendance.map(record => `
              <div class="history-item">
                <div class="history-date">${Utils.Date.format(record.dateTime, 'datetime')}</div>
                <div class="history-event">${record.eventName || 'Unknown Event'}</div>
              </div>
            `).join('')}
          </div>
        `;
      }
      
      content += '</div>';
      
      UI.Modal.show(`${volunteer.name} - Attendance History`, content, [
        {
          text: 'Close',
          class: 'btn-primary',
          handler: () => UI.Modal.hide()
        }
      ]);
      
    } catch (error) {
      Utils.Notify.error('Error loading attendance history: ' + error.message);
    }
  },
  
  // Import volunteers from CSV
  async importFromCSV(csvData) {
    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Validate headers
      const requiredHeaders = ['id', 'name'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
      }
      
      const volunteers = [];
      const errors = [];
      
      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        
        if (values.length !== headers.length) {
          errors.push(`Row ${i + 1}: Column count mismatch`);
          continue;
        }
        
        const volunteer = {};
        headers.forEach((header, index) => {
          volunteer[header] = values[index];
        });
        
        // Validate required fields
        if (!volunteer.id || !volunteer.name) {
          errors.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }
        
        volunteers.push(volunteer);
      }
      
      if (errors.length > 0) {
        throw new Error(`Import errors:\n${errors.join('\n')}`);
      }
      
      // Import volunteers
      let imported = 0;
      let skipped = 0;
      
      for (const volunteerData of volunteers) {
        try {
          await this.add(volunteerData);
          imported++;
        } catch (error) {
          console.warn(`Skipped volunteer ${volunteerData.id}:`, error.message);
          skipped++;
        }
      }
      
      Utils.Notify.success(`Import completed: ${imported} imported, ${skipped} skipped`);
      
      // Refresh view
      if (window.app && window.app.currentView === 'volunteers') {
        window.app.updateVolunteersView();
      }
      
      return { imported, skipped };
      
    } catch (error) {
      Utils.Notify.error('Import failed: ' + error.message);
      throw error;
    }
  },
  
  // Export volunteers to CSV
  async exportToCSV() {
    try {
      const volunteers = await Storage.getAllVolunteers();
      
      if (volunteers.length === 0) {
        Utils.Notify.info('No volunteers to export');
        return;
      }
      
      // Create CSV content
      const headers = ['id', 'name', 'email', 'committee', 'createdAt'];
      const csvContent = [
        headers.join(','),
        ...volunteers.map(volunteer => 
          headers.map(header => volunteer[header] || '').join(',')
        )
      ].join('\n');
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `volunteers_${Utils.Date.format(new Date(), 'date')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      Utils.Notify.success('Volunteers exported successfully');
      
    } catch (error) {
      Utils.Notify.error('Export failed: ' + error.message);
    }
  }
};