/**
 * IndexedDB Storage Manager
 */
window.Storage = {
  db: null,
  isReady: false,

  // Initialize database
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(Config.database.name, Config.database.version);

      request.onerror = () => {
        console.error('Database error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        console.log('Database initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion;

        console.log(`Database upgrade: ${oldVersion} -> ${newVersion}`);

        // Create volunteers store
        if (!db.objectStoreNames.contains('volunteers')) {
          const volunteerStore = db.createObjectStore('volunteers', { keyPath: 'id' });
          volunteerStore.createIndex('name', 'name', { unique: false });
          volunteerStore.createIndex('email', 'email', { unique: false });
          volunteerStore.createIndex('committee', 'committee', { unique: false });
        } else if (oldVersion < 3) {
          // Migration from v2 to v3: Recreate volunteers store to make email non-unique
          console.log('Migrating volunteers store: making email non-unique');
          
          // Get existing data
          const transaction = event.target.transaction;
          const oldStore = transaction.objectStore('volunteers');
          const volunteers = [];
          
          oldStore.openCursor().onsuccess = (cursorEvent) => {
            const cursor = cursorEvent.target.result;
            if (cursor) {
              volunteers.push(cursor.value);
              cursor.continue();
            } else {
              // All data collected, now recreate store
              db.deleteObjectStore('volunteers');
              const newVolunteerStore = db.createObjectStore('volunteers', { keyPath: 'id' });
              newVolunteerStore.createIndex('name', 'name', { unique: false });
              newVolunteerStore.createIndex('email', 'email', { unique: false });
              newVolunteerStore.createIndex('committee', 'committee', { unique: false });
              
              // Re-add all volunteers
              volunteers.forEach(volunteer => {
                newVolunteerStore.add(volunteer);
              });
              
              console.log(`Migrated ${volunteers.length} volunteers with non-unique email index`);
            }
          };
        }

        // Create events store
        if (!db.objectStoreNames.contains('events')) {
          const eventStore = db.createObjectStore('events', { keyPath: 'id' });
          eventStore.createIndex('date', 'date', { unique: false });
          eventStore.createIndex('status', 'status', { unique: false });
        }

        // Create attendance store
        if (!db.objectStoreNames.contains('attendance')) {
          const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id' });
          attendanceStore.createIndex('volunteerId', 'volunteerId', { unique: false });
          attendanceStore.createIndex('eventId', 'eventId', { unique: false });
          attendanceStore.createIndex('date', 'date', { unique: false });
          attendanceStore.createIndex('dateTime', 'dateTime', { unique: false });
        }

        // Create configuration store
        if (!db.objectStoreNames.contains('config')) {
          const configStore = db.createObjectStore('config', { keyPath: 'key' });
        }

        console.log('Database schema created/updated');
      };
    });
  },

  // Generic CRUD operations
  async add(storeName, data) {
    if (!this.isReady) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      // Generate ID if not provided
      if (!data.id) {
        data.id = Utils.String.generateId();
      }

      const request = store.add(data);

      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  },

  async update(storeName, data) {
    if (!this.isReady) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      const request = store.put(data);

      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  },

  async get(storeName, id) {
    if (!this.isReady) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAll(storeName) {
    if (!this.isReady) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async delete(storeName, id) {
    if (!this.isReady) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  async query(storeName, indexName, value) {
    if (!this.isReady) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  // Volunteer-specific methods
  async addVolunteer(volunteer) {
    // Check for duplicate ID before adding
    if (volunteer.id) {
      const existing = await this.get('volunteers', volunteer.id);
      if (existing) {
        throw new Error(`Volunteer with ID '${volunteer.id}' already exists`);
      }
    }
    return this.add('volunteers', volunteer);
  },

  async updateVolunteer(volunteer) {
    return this.update('volunteers', volunteer);
  },

  async getVolunteer(id) {
    return this.get('volunteers', id);
  },

  async getAllVolunteers() {
    return this.getAll('volunteers');
  },

  async deleteVolunteer(id) {
    return this.delete('volunteers', id);
  },

  async findVolunteerByEmail(email) {
    const volunteers = await this.query('volunteers', 'email', email);
    return volunteers[0] || null;
  },

  // Event-specific methods
  async addEvent(event) {
    return this.add('events', event);
  },

  async updateEvent(event) {
    return this.update('events', event);
  },

  async getEvent(id) {
    return this.get('events', id);
  },

  async getAllEvents() {
    return this.getAll('events');
  },

  async deleteEvent(id) {
    return this.delete('events', id);
  },

  async getEventsByDate(date) {
    return this.query('events', 'date', date);
  },

  async getCurrentEvent() {
    const events = await this.getAllEvents();
    const today = Utils.Date.today();

    // Find today's event first
    let currentEvent = events.find(event =>
      event.date === today && event.status === 'Active'
    );

    if (currentEvent) return currentEvent;

    // Look for events within scanning window (7 days)
    const scanningWindow = Config.events.scanningWindowDays;
    const now = new Date();

    for (const event of events) {
      if (event.status !== 'Active') continue;

      const eventDate = new Date(event.date);
      const daysDiff = Utils.Date.daysBetween(eventDate, now);

      // Event is within scanning window (past 7 days)
      if (daysDiff >= 0 && daysDiff <= scanningWindow) {
        return event;
      }
    }

    return null;
  },

  // Attendance-specific methods
  async addAttendance(attendance) {
    return this.add('attendance', attendance);
  },

  async updateAttendance(attendance) {
    return this.update('attendance', attendance);
  },

  async getAttendance(id) {
    return this.get('attendance', id);
  },

  async getAllAttendance() {
    return this.getAll('attendance');
  },

  async deleteAttendance(id) {
    return this.delete('attendance', id);
  },

  async getAttendanceByVolunteer(volunteerId) {
    return this.query('attendance', 'volunteerId', volunteerId);
  },

  async getAttendanceByEvent(eventId) {
    return this.query('attendance', 'eventId', eventId);
  },

  async getTodayAttendance() {
    const today = Utils.Date.today();
    return this.query('attendance', 'date', today);
  },

  async recordAttendance(volunteerId, eventId = null) {
    // Get current event if not specified
    if (!eventId) {
      const currentEvent = await this.getCurrentEvent();
      if (!currentEvent) {
        throw new Error('No active event found for attendance recording');
      }
      eventId = currentEvent.id;
    }

    // Get volunteer info
    const volunteer = await this.getVolunteer(volunteerId);
    if (!volunteer) {
      throw new Error('Volunteer not found');
    }

    // Check for duplicate attendance today
    const todayAttendance = await this.getTodayAttendance();
    const existingAttendance = todayAttendance.find(record =>
      record.volunteerId === volunteerId && record.eventId === eventId
    );

    if (existingAttendance) {
      throw new Error('Volunteer already checked in for this event today');
    }

    // Create attendance record
    const attendance = {
      volunteerId,
      eventId,
      volunteerName: volunteer.name,
      committee: volunteer.committee,
      date: Utils.Date.today(),
      dateTime: new Date().toISOString()
    };

    return this.addAttendance(attendance);
  },

  // Statistics methods
  async getVolunteerCount() {
    const volunteers = await this.getAllVolunteers();
    return volunteers.length;
  },

  async getAttendanceStats(period = 'today') {
    const attendance = await this.getAllAttendance();
    const now = new Date();

    let filteredAttendance = attendance;

    switch (period) {
      case 'today':
        filteredAttendance = attendance.filter(record =>
          Utils.Date.isToday(record.date)
        );
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredAttendance = attendance.filter(record =>
          new Date(record.date) >= weekAgo
        );
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        filteredAttendance = attendance.filter(record =>
          new Date(record.date) >= monthAgo
        );
        break;
    }

    return {
      totalRecords: filteredAttendance.length,
      uniqueVolunteers: Utils.Array.unique(filteredAttendance, 'volunteerId').length,
      byCommittee: Utils.Array.groupBy(filteredAttendance, 'committee')
    };
  },

  // Clear all data
  async clearAll() {
    if (!this.isReady) await this.init();

    const stores = ['volunteers', 'events', 'attendance', 'config'];

    for (const storeName of stores) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    console.log('All data cleared');
  },

  // Clear specific data types (without config)
  async clearVolunteers() {
    if (!this.isReady) await this.init();
    const transaction = this.db.transaction(['volunteers'], 'readwrite');
    const store = transaction.objectStore('volunteers');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        console.log('Volunteers cleared');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },

  async clearEvents() {
    if (!this.isReady) await this.init();
    const transaction = this.db.transaction(['events'], 'readwrite');
    const store = transaction.objectStore('events');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        console.log('Events cleared');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },

  async clearAttendance() {
    if (!this.isReady) await this.init();
    const transaction = this.db.transaction(['attendance'], 'readwrite');
    const store = transaction.objectStore('attendance');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        console.log('Attendance cleared');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },

  // Configuration storage methods
  async setItem(key, value) {
    if (!this.isReady) await this.init();

    return new Promise((resolve, reject) => {
      try {
        // Check if config store exists
        if (!this.db.objectStoreNames.contains('config')) {
          console.warn('Config store not found, falling back to localStorage');
          localStorage.setItem(`gurukul_${key}`, JSON.stringify(value));
          resolve();
          return;
        }

        const transaction = this.db.transaction(['config'], 'readwrite');
        const store = transaction.objectStore('config');

        const data = {
          key: key,
          value: JSON.stringify(value),
          timestamp: Date.now()
        };

        const request = store.put(data);

        request.onsuccess = () => {
          console.log(`Configuration saved: ${key}`);
          resolve(request.result);
        };

        request.onerror = () => {
          console.error(`Error saving configuration: ${key}`, request.error);
          // Fallback to localStorage
          console.warn('Falling back to localStorage');
          localStorage.setItem(`gurukul_${key}`, JSON.stringify(value));
          resolve();
        };

        transaction.onerror = () => {
          console.error(`Transaction error saving configuration: ${key}`, transaction.error);
          // Fallback to localStorage
          console.warn('Falling back to localStorage');
          localStorage.setItem(`gurukul_${key}`, JSON.stringify(value));
          resolve();
        };

      } catch (error) {
        console.error(`Error in setItem: ${key}`, error);
        // Fallback to localStorage
        console.warn('Falling back to localStorage');
        try {
          localStorage.setItem(`gurukul_${key}`, JSON.stringify(value));
          resolve();
        } catch (localStorageError) {
          reject(localStorageError);
        }
      }
    });
  },

  async getItem(key) {
    if (!this.isReady) await this.init();

    return new Promise((resolve, reject) => {
      try {
        // Check if config store exists
        if (!this.db.objectStoreNames.contains('config')) {
          console.warn('Config store not found, falling back to localStorage');
          const value = localStorage.getItem(`gurukul_${key}`);
          if (value) {
            try {
              resolve(JSON.parse(value));
            } catch (error) {
              console.error(`Error parsing localStorage value: ${key}`, error);
              resolve(null);
            }
          } else {
            resolve(null);
          }
          return;
        }

        const transaction = this.db.transaction(['config'], 'readonly');
        const store = transaction.objectStore('config');
        const request = store.get(key);

        request.onsuccess = () => {
          if (request.result) {
            try {
              const value = JSON.parse(request.result.value);
              resolve(value);
            } catch (error) {
              console.error(`Error parsing configuration: ${key}`, error);
              resolve(null);
            }
          } else {
            // Try localStorage fallback
            const localValue = localStorage.getItem(`gurukul_${key}`);
            if (localValue) {
              try {
                resolve(JSON.parse(localValue));
              } catch (error) {
                console.error(`Error parsing localStorage value: ${key}`, error);
                resolve(null);
              }
            } else {
              resolve(null);
            }
          }
        };

        request.onerror = () => {
          console.error(`Error loading configuration: ${key}`, request.error);
          // Try localStorage fallback
          const localValue = localStorage.getItem(`gurukul_${key}`);
          if (localValue) {
            try {
              resolve(JSON.parse(localValue));
            } catch (error) {
              console.error(`Error parsing localStorage value: ${key}`, error);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        };

        transaction.onerror = () => {
          console.error(`Transaction error loading configuration: ${key}`, transaction.error);
          // Try localStorage fallback
          const localValue = localStorage.getItem(`gurukul_${key}`);
          if (localValue) {
            try {
              resolve(JSON.parse(localValue));
            } catch (error) {
              console.error(`Error parsing localStorage value: ${key}`, error);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        };

      } catch (error) {
        console.error(`Error in getItem: ${key}`, error);
        // Try localStorage fallback
        const localValue = localStorage.getItem(`gurukul_${key}`);
        if (localValue) {
          try {
            resolve(JSON.parse(localValue));
          } catch (parseError) {
            console.error(`Error parsing localStorage value: ${key}`, parseError);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      }
    });
  },

  async removeItem(key) {
    if (!this.isReady) await this.init();

    return new Promise((resolve, reject) => {
      try {
        // Check if config store exists
        if (!this.db.objectStoreNames.contains('config')) {
          console.warn('Config store not found, falling back to localStorage');
          localStorage.removeItem(`gurukul_${key}`);
          resolve();
          return;
        }

        const transaction = this.db.transaction(['config'], 'readwrite');
        const store = transaction.objectStore('config');
        const request = store.delete(key);

        request.onsuccess = () => {
          console.log(`Configuration removed: ${key}`);
          // Also remove from localStorage if it exists
          localStorage.removeItem(`gurukul_${key}`);
          resolve();
        };

        request.onerror = () => {
          console.error(`Error removing configuration: ${key}`, request.error);
          // Fallback to localStorage
          localStorage.removeItem(`gurukul_${key}`);
          resolve();
        };

        transaction.onerror = () => {
          console.error(`Transaction error removing configuration: ${key}`, transaction.error);
          // Fallback to localStorage
          localStorage.removeItem(`gurukul_${key}`);
          resolve();
        };

      } catch (error) {
        console.error(`Error in removeItem: ${key}`, error);
        // Fallback to localStorage
        localStorage.removeItem(`gurukul_${key}`);
        resolve();
      }
    });
  },

  async getAllConfig() {
    if (!this.isReady) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['config'], 'readonly');
      const store = transaction.objectStore('config');
      const request = store.getAll();

      request.onsuccess = () => {
        const config = {};
        request.result.forEach(item => {
          try {
            config[item.key] = JSON.parse(item.value);
          } catch (error) {
            console.error(`Error parsing configuration: ${item.key}`, error);
          }
        });
        resolve(config);
      };

      request.onerror = () => {
        console.error('Error loading all configuration', request.error);
        reject(request.error);
      };
    });
  }
};