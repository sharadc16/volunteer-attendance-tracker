/**
 * Events Component - Handles event management
 */
window.Events = {
  
  // Initialize events component
  init() {
    console.log('Events component initialized');
  },
  
  // Add new event
  async add(eventData) {
    try {
      // Validate required fields
      if (!eventData.name || !eventData.date) {
        throw new Error('Name and date are required');
      }
      
      // Validate date format
      if (!Utils.Date.isValid(eventData.date)) {
        throw new Error('Invalid date format');
      }
      
      // Set default values
      const event = {
        name: eventData.name,
        date: eventData.date,
        startTime: eventData.startTime || '10:00',
        endTime: eventData.endTime || '12:00',
        status: eventData.status || 'Active',
        description: eventData.description || '',
        ...eventData
      };
      
      // Add event
      const savedEvent = await Storage.addEvent(event);
      
      Utils.Notify.success('Event added successfully');
      Utils.Event.emit('eventAdded', savedEvent);
      
      return savedEvent;
      
    } catch (error) {
      Utils.Notify.error('Error adding event: ' + error.message);
      throw error;
    }
  },
  
  // Edit event
  async edit(eventId) {
    try {
      const event = await Storage.getEvent(eventId);
      if (!event) {
        Utils.Notify.error('Event not found');
        return;
      }
      
      const form = UI.Form.create([
        { 
          name: 'name', 
          type: 'text', 
          label: 'Event Name', 
          value: event.name, 
          required: true 
        },
        { 
          name: 'date', 
          type: 'date', 
          label: 'Date', 
          value: event.date, 
          required: true 
        },
        { 
          name: 'description', 
          type: 'textarea', 
          label: 'Description', 
          value: event.description || '' 
        },
        {
          name: 'status',
          type: 'select',
          label: 'Status',
          options: [
            { value: 'Active', text: 'Active', selected: event.status === 'Active' },
            { value: 'Inactive', text: 'Inactive', selected: event.status === 'Inactive' },
            { value: 'Cancelled', text: 'Cancelled', selected: event.status === 'Cancelled' }
          ]
        }
      ], async (data) => {
        try {
          // Keep existing time values since we removed time fields from the form
          const updatedEvent = { 
            ...event, 
            ...data,
            startTime: event.startTime || '10:00',
            endTime: event.endTime || '12:00'
          };
          
          await Storage.updateEvent(updatedEvent);
          
          UI.Modal.hide();
          Utils.Notify.success('Event updated successfully');
          Utils.Event.emit('eventUpdated', updatedEvent);
          
          // Refresh view if on events page
          if (window.app && window.app.currentView === 'events') {
            window.app.updateEventsView();
          }
          
          // Reload current event for scanner
          if (Scanner) {
            Scanner.loadCurrentEvent();
          }
          
        } catch (error) {
          Utils.Notify.error('Error updating event: ' + error.message);
        }
      });
      
      // Create form HTML manually to avoid losing event handlers
      const formHTML = `
        <form class="form">
          <div class="form-group">
            <label class="form-label">Event Name <span class="required">*</span></label>
            <input class="form-input" type="text" name="name" value="${event.name}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Date <span class="required">*</span></label>
            <input class="form-input" type="date" name="date" value="${event.date}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-input" name="description" rows="3">${event.description || ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-input" name="status">
              <option value="Active" ${event.status === 'Active' ? 'selected' : ''}>Active</option>
              <option value="Inactive" ${event.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
              <option value="Cancelled" ${event.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>
        </form>
      `;
      
      // Show modal with custom actions
      UI.Modal.show('Edit Event', formHTML, [
        {
          text: 'Cancel',
          class: 'btn-secondary',
          handler: () => UI.Modal.hide()
        },
        {
          text: 'Update Event',
          class: 'btn-primary',
          handler: async () => {
            const modalForm = Utils.DOM.get('#modal form');
            if (modalForm && UI.Form.validate(modalForm)) {
              try {
                // Get form data
                const formData = new FormData(modalForm);
                const data = Object.fromEntries(formData.entries());
                
                // Keep existing time values since we removed time fields from the form
                const updatedEvent = { 
                  ...event, 
                  ...data,
                  startTime: event.startTime || '10:00',
                  endTime: event.endTime || '12:00'
                };
                
                await Storage.updateEvent(updatedEvent);
                
                UI.Modal.hide();
                Utils.Notify.success('Event updated successfully');
                Utils.Event.emit('eventUpdated', updatedEvent);
                
                // Refresh view if on events page
                if (window.app && window.app.currentView === 'events') {
                  window.app.updateEventsView();
                }
                
                // Reload current event for scanner
                if (Scanner) {
                  Scanner.loadCurrentEvent();
                }
                
              } catch (error) {
                Utils.Notify.error('Error updating event: ' + error.message);
              }
            }
          }
        }
      ]);
      
    } catch (error) {
      Utils.Notify.error('Error loading event: ' + error.message);
    }
  },
  
  // Delete event
  async delete(eventId) {
    try {
      const event = await Storage.getEvent(eventId);
      if (!event) {
        Utils.Notify.error('Event not found');
        return;
      }
      
      // Check if event has attendance records
      const attendance = await Storage.getAttendanceByEvent(eventId);
      
      let message = `Are you sure you want to delete "${event.name}"?`;
      if (attendance.length > 0) {
        message += `\n\nThis event has ${attendance.length} attendance record(s) that will also be deleted.`;
      }
      message += '\n\nThis action cannot be undone.';
      
      UI.Modal.confirm(
        'Delete Event',
        message,
        async () => {
          try {
            // Delete attendance records first
            for (const record of attendance) {
              await Storage.deleteAttendance(record.id);
            }
            
            // Delete event
            await Storage.deleteEvent(eventId);
            
            Utils.Notify.success('Event deleted successfully');
            Utils.Event.emit('eventDeleted', event);
            
            // Refresh view if on events page
            if (window.app && window.app.currentView === 'events') {
              window.app.updateEventsView();
            }
            
            // Reload current event for scanner
            if (Scanner) {
              Scanner.loadCurrentEvent();
            }
            
          } catch (error) {
            Utils.Notify.error('Error deleting event: ' + error.message);
          }
        }
      );
      
    } catch (error) {
      Utils.Notify.error('Error loading event: ' + error.message);
    }
  },
  
  // View event attendance
  async viewAttendance(eventId) {
    try {
      const event = await Storage.getEvent(eventId);
      const attendance = await Storage.getAttendanceByEvent(eventId);
      
      if (!event) {
        Utils.Notify.error('Event not found');
        return;
      }
      
      // Sort attendance by check-in time
      attendance.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
      
      let content = `
        <div class="event-attendance">
          <div class="attendance-header">
            <h4>${event.name}</h4>
            <p><strong>Date:</strong> ${Utils.Date.format(event.date, 'date')}</p>
            <p><strong>Time:</strong> ${event.startTime} - ${event.endTime}</p>
            <p><strong>Total Attendance:</strong> ${attendance.length}</p>
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
          <div class="attendance-list">
            <div class="attendance-table">
              <div class="table-header">
                <span>Volunteer</span>
                <span>Committee</span>
                <span>Check-in Time</span>
              </div>
              ${attendance.map(record => `
                <div class="table-row">
                  <span class="volunteer-name">${record.volunteerName}</span>
                  <span class="volunteer-committee">${record.committee || 'Unknown'}</span>
                  <span class="check-in-time">${Utils.Date.format(record.dateTime, 'time')}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      
      content += '</div>';
      
      UI.Modal.show(`${event.name} - Attendance`, content, [
        {
          text: 'Export CSV',
          class: 'btn-secondary',
          handler: () => this.exportAttendanceCSV(event, attendance)
        },
        {
          text: 'Close',
          class: 'btn-primary',
          handler: () => UI.Modal.hide()
        }
      ]);
      
    } catch (error) {
      Utils.Notify.error('Error loading event attendance: ' + error.message);
    }
  },
  
  // Export event attendance to CSV
  async exportAttendanceCSV(event, attendance) {
    try {
      if (attendance.length === 0) {
        Utils.Notify.info('No attendance records to export');
        return;
      }
      
      // Create CSV content
      const headers = ['Volunteer Name', 'Volunteer ID', 'Committee', 'Check-in Date', 'Check-in Time'];
      const csvContent = [
        headers.join(','),
        ...attendance.map(record => [
          record.volunteerName,
          record.volunteerId,
          record.committee || '',
          Utils.Date.format(record.dateTime, 'date'),
          Utils.Date.format(record.dateTime, 'time')
        ].join(','))
      ].join('\n');
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event.name}_${event.date}_attendance.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      Utils.Notify.success('Attendance exported successfully');
      
    } catch (error) {
      Utils.Notify.error('Export failed: ' + error.message);
    }
  },
  
  // Create Sunday events for a period
  async createSundayEvents(startDate, count = 12) {
    try {
      const events = [];
      let currentDate = new Date(startDate);
      
      // Ensure we start on a Sunday
      while (currentDate.getDay() !== 0) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Create events for each Sunday
      for (let i = 0; i < count; i++) {
        const eventDate = new Date(currentDate);
        eventDate.setDate(currentDate.getDate() + (i * 7));
        
        const event = {
          name: 'Sunday Class',
          date: eventDate.toISOString().split('T')[0],
          startTime: '10:00',
          endTime: '12:00',
          status: 'Active',
          description: 'Regular Sunday class session'
        };
        
        events.push(event);
      }
      
      // Add events to database
      const savedEvents = [];
      for (const eventData of events) {
        try {
          const savedEvent = await Storage.addEvent(eventData);
          savedEvents.push(savedEvent);
        } catch (error) {
          console.warn(`Skipped event for ${eventData.date}:`, error.message);
        }
      }
      
      Utils.Notify.success(`Created ${savedEvents.length} Sunday events`);
      Utils.Event.emit('eventsCreated', savedEvents);
      
      return savedEvents;
      
    } catch (error) {
      Utils.Notify.error('Error creating Sunday events: ' + error.message);
      throw error;
    }
  },
  
  // Get events by date range
  async getEventsByDateRange(startDate, endDate) {
    try {
      const allEvents = await Storage.getAllEvents();
      
      return allEvents.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= new Date(startDate) && eventDate <= new Date(endDate);
      });
      
    } catch (error) {
      console.error('Error getting events by date range:', error);
      return [];
    }
  },
  
  // Get upcoming events
  async getUpcomingEvents(limit = 5) {
    try {
      const allEvents = await Storage.getAllEvents();
      const today = new Date();
      
      return allEvents
        .filter(event => new Date(event.date) >= today && event.status === 'Active')
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, limit);
        
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      return [];
    }
  },
  
  // Get past events
  async getPastEvents(limit = 10) {
    try {
      const allEvents = await Storage.getAllEvents();
      const today = new Date();
      
      return allEvents
        .filter(event => new Date(event.date) < today)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
        
    } catch (error) {
      console.error('Error getting past events:', error);
      return [];
    }
  },
  
  // Duplicate event
  async duplicate(eventId, newDate) {
    try {
      const originalEvent = await Storage.getEvent(eventId);
      if (!originalEvent) {
        throw new Error('Original event not found');
      }
      
      const duplicatedEvent = {
        ...originalEvent,
        id: undefined, // Let storage generate new ID
        date: newDate,
        name: `${originalEvent.name} (Copy)`,
        createdAt: undefined,
        updatedAt: undefined
      };
      
      const savedEvent = await Storage.addEvent(duplicatedEvent);
      
      Utils.Notify.success('Event duplicated successfully');
      Utils.Event.emit('eventDuplicated', { original: originalEvent, duplicate: savedEvent });
      
      return savedEvent;
      
    } catch (error) {
      Utils.Notify.error('Error duplicating event: ' + error.message);
      throw error;
    }
  }
};