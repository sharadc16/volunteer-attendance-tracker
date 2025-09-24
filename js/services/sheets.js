/**
 * Google Sheets Manager
 * Handles Google Sheets API operations, spreadsheet creation, and data management
 */
class SheetsManager {
  constructor() {
    this.isInitialized = false;
    this.spreadsheetId = null;
    this.spreadsheetUrl = null;
    this.sheetsConfig = {
      volunteers: {
        name: 'Volunteers',
        headers: ['ID', 'Name', 'Email', 'Committee', 'Created', 'Updated', 'Synced'],
        range: 'A:G'
      },
      events: {
        name: 'Events',
        headers: ['ID', 'Name', 'Date', 'Start Time', 'End Time', 'Status', 'Description', 'Created', 'Updated', 'Synced'],
        range: 'A:J'
      },
      attendance: {
        name: 'Attendance',
        headers: ['ID', 'Volunteer ID', 'Event ID', 'Volunteer Name', 'Committee', 'Date', 'Time', 'Created', 'Updated', 'Synced'],
        range: 'A:J'
      }
    };
    
    // Bind methods
    this.handleApiError = this.handleApiError.bind(this);
  }

  /**
   * Initialize the sheets manager
   */
  async init() {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Check if AuthManager is initialized and authenticated
      if (!window.AuthManager || !window.AuthManager.isInitialized) {
        throw new Error('AuthManager not initialized');
      }

      if (!window.AuthManager.isAuthenticatedUser()) {
        throw new Error('User not authenticated');
      }

      // Load existing spreadsheet ID from storage (no auto-creation)
      await this.loadExistingSpreadsheet();
      
      this.isInitialized = true;
      console.log('SheetsManager initialized successfully');
      
      return true;
      
    } catch (error) {
      console.error('Failed to initialize SheetsManager:', error);
      this.handleApiError(error);
      return false;
    }
  }

  /**
   * Load existing spreadsheet from storage (no auto-creation)
   */
  async loadExistingSpreadsheet() {
    try {
      // Check if we have a stored spreadsheet ID
      const storedId = window.UIUtils.Storage.get('vat_spreadsheet_id');
      
      if (storedId) {
        // Validate existing spreadsheet
        const isValid = await this.validateSpreadsheet(storedId);
        if (isValid) {
          this.spreadsheetId = storedId;
          this.spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${storedId}`;
          console.log('Using existing spreadsheet:', this.spreadsheetId);
          return;
        } else {
          // Clear invalid spreadsheet ID
          window.UIUtils.Storage.remove('vat_spreadsheet_id');
          console.warn('Invalid spreadsheet ID removed from storage');
        }
      }

      // No spreadsheet configured - this is now expected behavior
      console.log('No spreadsheet configured - user must set one up in settings');
      
    } catch (error) {
      console.error('Error loading existing spreadsheet:', error);
      throw error;
    }
  }

  /**
   * Check if a spreadsheet is configured and valid
   */
  isSpreadsheetConfigured() {
    return !!(this.spreadsheetId && this.spreadsheetUrl);
  }

  /**
   * Get spreadsheet configuration status
   */
  getSpreadsheetStatus() {
    if (this.isSpreadsheetConfigured()) {
      return {
        configured: true,
        spreadsheetId: this.spreadsheetId,
        spreadsheetUrl: this.spreadsheetUrl
      };
    } else {
      return {
        configured: false,
        message: 'No Google Spreadsheet configured. Please set up a spreadsheet in Settings.'
      };
    }
  }

  /**
   * Manually set spreadsheet ID (for user configuration)
   */
  async setSpreadsheetId(spreadsheetId) {
    try {
      // Validate the provided spreadsheet ID
      const isValid = await this.validateSpreadsheet(spreadsheetId);
      
      if (isValid) {
        this.spreadsheetId = spreadsheetId;
        this.spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
        
        // Store in localStorage
        window.UIUtils.Storage.set('vat_spreadsheet_id', spreadsheetId);
        
        console.log('Spreadsheet configured successfully:', spreadsheetId);
        return { success: true, spreadsheetId, spreadsheetUrl: this.spreadsheetUrl };
      } else {
        throw new Error('Invalid spreadsheet ID or insufficient permissions');
      }
      
    } catch (error) {
      console.error('Error setting spreadsheet ID:', error);
      throw error;
    }
  }

  /**
   * Create a new spreadsheet (user-initiated only)
   */
  async createNewSpreadsheet() {
    try {
      const spreadsheetId = await this.createSpreadsheet();
      return {
        success: true,
        spreadsheetId,
        spreadsheetUrl: this.spreadsheetUrl
      };
    } catch (error) {
      console.error('Error creating new spreadsheet:', error);
      throw error;
    }
  }

  /**
   * Validate spreadsheet access and structure
   */
  async validateSpreadsheet(spreadsheetId, options = {}) {
    try {
      console.log('Validating spreadsheet:', spreadsheetId);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Spreadsheet validation timeout')), 10000); // 10 second timeout
      });
      
      const validationPromise = gapi.client.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
        includeGridData: false
      });
      
      const response = await Promise.race([validationPromise, timeoutPromise]);

      if (response.status === 200) {
        console.log('Spreadsheet access confirmed');
        
        // Check if required sheets exist
        const sheets = response.result.sheets || [];
        const sheetNames = sheets.map(sheet => sheet.properties.title);
        
        const requiredSheets = Object.keys(this.sheetsConfig);
        const hasAllSheets = requiredSheets.every(name => 
          sheetNames.includes(this.sheetsConfig[name].name)
        );

        if (!hasAllSheets) {
          console.warn('Spreadsheet missing required sheets');
          
          // Only setup structure if explicitly requested or during initialization
          if (options.setupStructure !== false) {
            console.log('Setting up missing sheets structure...');
            await this.setupSheetsStructure(spreadsheetId);
          }
        } else {
          console.log('All required sheets found');
        }

        return true;
      }

      return false;
      
    } catch (error) {
      if (error.message === 'Spreadsheet validation timeout') {
        console.warn('Spreadsheet validation timed out - assuming valid');
        return true; // Assume valid if timeout (better UX)
      }
      
      if (error.status === 404) {
        console.warn('Spreadsheet not found or no access:', spreadsheetId);
        return false;
      }
      
      if (error.status === 403) {
        console.warn('No access to spreadsheet:', spreadsheetId);
        return false;
      }
      
      console.error('Error validating spreadsheet:', error);
      return false;
    }
  }

  /**
   * Create new spreadsheet with proper structure
   */
  async createSpreadsheet() {
    try {
      console.log('Creating new Google Spreadsheet...');
      
      const spreadsheetTitle = `Gurukul Attendance Tracker - ${new Date().toLocaleDateString()}`;
      
      const response = await gapi.client.sheets.spreadsheets.create({
        properties: {
          title: spreadsheetTitle
        },
        sheets: [
          {
            properties: {
              title: this.sheetsConfig.volunteers.name,
              gridProperties: {
                rowCount: 1000,
                columnCount: this.sheetsConfig.volunteers.headers.length
              }
            }
          },
          {
            properties: {
              title: this.sheetsConfig.events.name,
              gridProperties: {
                rowCount: 1000,
                columnCount: this.sheetsConfig.events.headers.length
              }
            }
          },
          {
            properties: {
              title: this.sheetsConfig.attendance.name,
              gridProperties: {
                rowCount: 5000,
                columnCount: this.sheetsConfig.attendance.headers.length
              }
            }
          }
        ]
      });

      if (response.status === 200) {
        this.spreadsheetId = response.result.spreadsheetId;
        this.spreadsheetUrl = response.result.spreadsheetUrl;
        
        // Store spreadsheet ID using the proper storage utility
        window.UIUtils.Storage.set('vat_spreadsheet_id', this.spreadsheetId);
        
        console.log('Spreadsheet created successfully:', this.spreadsheetId);
        
        // Setup headers and formatting
        await this.setupSheetsStructure(this.spreadsheetId);
        
        // Make spreadsheet accessible to anyone with link (optional)
        await this.configureSpreadsheetPermissions();
        
        return this.spreadsheetId;
        
      } else {
        throw new Error('Failed to create spreadsheet');
      }
      
    } catch (error) {
      console.error('Error creating spreadsheet:', error);
      throw error;
    }
  }

  /**
   * Setup sheets structure with headers and formatting
   */
  async setupSheetsStructure(spreadsheetId) {
    try {
      console.log('Setting up sheets structure...');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Sheet structure setup timeout')), 15000); // 15 second timeout
      });
      
      const requests = [];
      
      // Setup each sheet
      for (const [key, config] of Object.entries(this.sheetsConfig)) {
        const sheetId = await this.getSheetId(spreadsheetId, config.name);
        
        if (sheetId !== null) {
          // Add header row
          requests.push({
            updateCells: {
              range: {
                sheetId: sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: config.headers.length
              },
              rows: [{
                values: config.headers.map(header => ({
                  userEnteredValue: { stringValue: header },
                  userEnteredFormat: {
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                    textFormat: { bold: true },
                    horizontalAlignment: 'CENTER'
                  }
                }))
              }],
              fields: 'userEnteredValue,userEnteredFormat'
            }
          });

          // Freeze header row
          requests.push({
            updateSheetProperties: {
              properties: {
                sheetId: sheetId,
                gridProperties: {
                  frozenRowCount: 1
                }
              },
              fields: 'gridProperties.frozenRowCount'
            }
          });

          // Auto-resize columns
          requests.push({
            autoResizeDimensions: {
              dimensions: {
                sheetId: sheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: config.headers.length
              }
            }
          });

          // Add data validation rules
          this.addDataValidationRules(requests, sheetId, key, config);

          // Add conditional formatting
          this.addConditionalFormatting(requests, sheetId, key, config);
        }
      }

      // Execute all requests in batch with timeout
      if (requests.length > 0) {
        console.log(`Executing ${requests.length} sheet structure requests...`);
        
        const batchPromise = gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId: spreadsheetId,
          requests: requests
        });
        
        await Promise.race([batchPromise, timeoutPromise]);
        console.log('Sheets structure setup completed');
      }

      // Setup sheet protection (separate API call) - skip if timeout risk
      try {
        await this.setupSheetProtection(spreadsheetId);
      } catch (error) {
        console.warn('Sheet protection setup failed, continuing:', error.message);
      }
      
    } catch (error) {
      if (error.message === 'Sheet structure setup timeout') {
        console.warn('Sheet structure setup timed out - continuing anyway');
        return; // Don't throw, just continue
      }
      
      console.error('Error setting up sheets structure:', error);
      throw error;
    }
  }

  /**
   * Add data validation rules to sheets
   */
  addDataValidationRules(requests, sheetId, sheetType, config) {
    switch (sheetType) {
      case 'volunteers':
        // Email validation for column C (index 2)
        requests.push({
          setDataValidation: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1, // Skip header
              startColumnIndex: 2, // Email column
              endColumnIndex: 3
            },
            rule: {
              condition: {
                type: 'CUSTOM_FORMULA',
                values: [{
                  userEnteredValue: '=OR(ISBLANK(C2), ISEMAIL(C2))'
                }]
              },
              inputMessage: 'Please enter a valid email address',
              showCustomUi: true,
              strict: false
            }
          }
        });

        // Committee validation for column D (index 3)
        requests.push({
          setDataValidation: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              startColumnIndex: 3, // Committee column
              endColumnIndex: 4
            },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: [
                  { userEnteredValue: 'Teaching' },
                  { userEnteredValue: 'Kitchen' },
                  { userEnteredValue: 'Cleaning' },
                  { userEnteredValue: 'Setup' },
                  { userEnteredValue: 'Other' }
                ]
              },
              inputMessage: 'Select a committee from the list',
              showCustomUi: true,
              strict: false
            }
          }
        });
        break;

      case 'events':
        // Status validation for column F (index 5)
        requests.push({
          setDataValidation: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              startColumnIndex: 5, // Status column
              endColumnIndex: 6
            },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: [
                  { userEnteredValue: 'Active' },
                  { userEnteredValue: 'Inactive' },
                  { userEnteredValue: 'Completed' },
                  { userEnteredValue: 'Cancelled' }
                ]
              },
              inputMessage: 'Select a status from the list',
              showCustomUi: true,
              strict: false
            }
          }
        });

        // Date validation for column C (index 2)
        requests.push({
          setDataValidation: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              startColumnIndex: 2, // Date column
              endColumnIndex: 3
            },
            rule: {
              condition: {
                type: 'DATE_IS_VALID'
              },
              inputMessage: 'Please enter a valid date',
              showCustomUi: true,
              strict: false
            }
          }
        });
        break;

      case 'attendance':
        // Date validation for column F (index 5)
        requests.push({
          setDataValidation: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              startColumnIndex: 5, // Date column
              endColumnIndex: 6
            },
            rule: {
              condition: {
                type: 'DATE_IS_VALID'
              },
              inputMessage: 'Please enter a valid date',
              showCustomUi: true,
              strict: false
            }
          }
        });
        break;
    }
  }

  /**
   * Add conditional formatting to sheets
   */
  addConditionalFormatting(requests, sheetId, sheetType, config) {
    switch (sheetType) {
      case 'events':
        // Highlight completed events in green
        requests.push({
          addConditionalFormatRule: {
            rule: {
              ranges: [{
                sheetId: sheetId,
                startRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: config.headers.length
              }],
              booleanRule: {
                condition: {
                  type: 'CUSTOM_FORMULA',
                  values: [{
                    userEnteredValue: '=$F2="Completed"'
                  }]
                },
                format: {
                  backgroundColor: { red: 0.8, green: 1.0, blue: 0.8 }
                }
              }
            },
            index: 0
          }
        });

        // Highlight cancelled events in red
        requests.push({
          addConditionalFormatRule: {
            rule: {
              ranges: [{
                sheetId: sheetId,
                startRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: config.headers.length
              }],
              booleanRule: {
                condition: {
                  type: 'CUSTOM_FORMULA',
                  values: [{
                    userEnteredValue: '=$F2="Cancelled"'
                  }]
                },
                format: {
                  backgroundColor: { red: 1.0, green: 0.8, blue: 0.8 }
                }
              }
            },
            index: 1
          }
        });
        break;

      case 'attendance':
        // Highlight recent attendance (last 7 days) in light blue
        requests.push({
          addConditionalFormatRule: {
            rule: {
              ranges: [{
                sheetId: sheetId,
                startRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: config.headers.length
              }],
              booleanRule: {
                condition: {
                  type: 'CUSTOM_FORMULA',
                  values: [{
                    userEnteredValue: '=AND(F2<>"", F2>=TODAY()-7)'
                  }]
                },
                format: {
                  backgroundColor: { red: 0.8, green: 0.9, blue: 1.0 }
                }
              }
            },
            index: 0
          }
        });
        break;
    }
  }

  /**
   * Setup sheet protection
   */
  async setupSheetProtection(spreadsheetId) {
    try {
      console.log('Setting up sheet protection...');
      
      const requests = [];
      
      // Protect header rows in all sheets
      for (const [key, config] of Object.entries(this.sheetsConfig)) {
        const sheetId = await this.getSheetId(spreadsheetId, config.name);
        
        if (sheetId !== null) {
          // For warningOnly protection, don't specify editors
          requests.push({
            addProtectedRange: {
              protectedRange: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: config.headers.length
                },
                description: `Protected header row for ${config.name}`,
                warningOnly: true
                // Don't set editors for warningOnly protection
              }
            }
          });
        }
      }

      if (requests.length > 0) {
        await gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId: spreadsheetId,
          requests: requests
        });
        
        console.log('Sheet protection setup completed');
      }
      
    } catch (error) {
      console.warn('Could not setup sheet protection:', error);
      // Non-critical error, continue
    }
  }

  /**
   * Create missing sheets if they don't exist
   */
  async ensureSheetsExist(spreadsheetId) {
    try {
      const response = await gapi.client.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
      });

      const existingSheets = response.result.sheets || [];
      const existingSheetNames = existingSheets.map(sheet => sheet.properties.title);
      
      const requests = [];
      
      // Check each required sheet
      for (const [key, config] of Object.entries(this.sheetsConfig)) {
        if (!existingSheetNames.includes(config.name)) {
          console.log(`Creating missing sheet: ${config.name}`);
          
          requests.push({
            addSheet: {
              properties: {
                title: config.name,
                gridProperties: {
                  rowCount: key === 'attendance' ? 5000 : 1000,
                  columnCount: config.headers.length
                }
              }
            }
          });
        }
      }

      if (requests.length > 0) {
        await gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId: spreadsheetId,
          requests: requests
        });
        
        console.log(`Created ${requests.length} missing sheets`);
        
        // Setup structure for new sheets
        await this.setupSheetsStructure(spreadsheetId);
      }
      
    } catch (error) {
      console.error('Error ensuring sheets exist:', error);
      throw error;
    }
  }

  /**
   * Repair sheet structure if corrupted
   */
  async repairSheetStructure(spreadsheetId) {
    try {
      console.log('Repairing sheet structure...');
      
      // Ensure all required sheets exist
      await this.ensureSheetsExist(spreadsheetId);
      
      // Validate and repair headers
      await this.validateAndRepairHeaders(spreadsheetId);
      
      // Re-apply formatting and validation
      await this.setupSheetsStructure(spreadsheetId);
      
      console.log('Sheet structure repair completed');
      
    } catch (error) {
      console.error('Error repairing sheet structure:', error);
      throw error;
    }
  }

  /**
   * Validate and repair sheet headers
   */
  async validateAndRepairHeaders(spreadsheetId) {
    try {
      for (const [key, config] of Object.entries(this.sheetsConfig)) {
        const data = await this.readSheet(config.name, `${config.name}!1:1`);
        
        if (data.length === 0 || !this.isHeaderRow(data[0], config.headers)) {
          console.log(`Repairing headers for ${config.name}`);
          
          // Clear first row and add correct headers
          await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: `${config.name}!1:1`,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [config.headers]
            }
          });
        }
      }
      
    } catch (error) {
      console.error('Error validating and repairing headers:', error);
      throw error;
    }
  }

  /**
   * Get sheet statistics
   */
  async getSheetStatistics() {
    if (!this.isInitialized || !this.spreadsheetId) {
      throw new Error('SheetsManager not initialized');
    }

    try {
      const results = await this.batchRead([
        { sheetName: 'Volunteers' },
        { sheetName: 'Events' },
        { sheetName: 'Attendance' }
      ]);

      const stats = {
        volunteers: {
          total: results['Volunteers']?.length || 0,
          committees: this.getUniqueValues(results['Volunteers'], 3) // Committee column
        },
        events: {
          total: results['Events']?.length || 0,
          active: this.countByValue(results['Events'], 5, 'Active'), // Status column
          completed: this.countByValue(results['Events'], 5, 'Completed'),
          cancelled: this.countByValue(results['Events'], 5, 'Cancelled')
        },
        attendance: {
          total: results['Attendance']?.length || 0,
          thisMonth: this.countThisMonth(results['Attendance'], 5), // Date column
          thisWeek: this.countThisWeek(results['Attendance'], 5)
        },
        lastUpdated: new Date().toISOString()
      };

      return stats;
      
    } catch (error) {
      console.error('Error getting sheet statistics:', error);
      throw error;
    }
  }

  /**
   * Get unique values from a column
   */
  getUniqueValues(data, columnIndex) {
    if (!data || data.length === 0) return [];
    
    const values = data
      .map(row => row[columnIndex])
      .filter(value => value && value.toString().trim() !== '');
    
    return [...new Set(values)];
  }

  /**
   * Count rows by column value
   */
  countByValue(data, columnIndex, value) {
    if (!data || data.length === 0) return 0;
    
    return data.filter(row => row[columnIndex] === value).length;
  }

  /**
   * Count rows from this month
   */
  countThisMonth(data, columnIndex) {
    if (!data || data.length === 0) return 0;
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    return data.filter(row => {
      const date = new Date(row[columnIndex]);
      return date >= thisMonth;
    }).length;
  }

  /**
   * Count rows from this week
   */
  countThisWeek(data, columnIndex) {
    if (!data || data.length === 0) return 0;
    
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
    thisWeek.setHours(0, 0, 0, 0);
    
    return data.filter(row => {
      const date = new Date(row[columnIndex]);
      return date >= thisWeek;
    }).length;
  }

  /**
   * Get sheet ID by name
   */
  async getSheetId(spreadsheetId, sheetName) {
    try {
      const response = await gapi.client.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
      });

      const sheets = response.result.sheets || [];
      const sheet = sheets.find(s => s.properties.title === sheetName);
      
      return sheet ? sheet.properties.sheetId : null;
      
    } catch (error) {
      console.error('Error getting sheet ID:', error);
      return null;
    }
  }

  /**
   * Configure spreadsheet permissions (optional)
   */
  async configureSpreadsheetPermissions() {
    try {
      // This would require Drive API to set permissions
      // For now, we'll skip this and rely on manual sharing
      console.log('Spreadsheet permissions: Manual sharing required');
      
    } catch (error) {
      console.warn('Could not configure spreadsheet permissions:', error);
      // Non-critical error, continue
    }
  }

  /**
   * Read data from a specific sheet range
   */
  async readSheet(sheetName, range = null) {
    if (!this.isInitialized || !this.spreadsheetId) {
      throw new Error('SheetsManager not initialized');
    }

    try {
      const config = this.getSheetConfig(sheetName);
      const fullRange = range || `${config.name}!${config.range}`;
      
      // Use ErrorHandler retry logic for API calls
      const response = await window.ErrorHandler.retryWithBackoff(
        () => gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: fullRange,
          valueRenderOption: 'UNFORMATTED_VALUE',
          dateTimeRenderOption: 'FORMATTED_STRING'
        }),
        { 
          operationId: `read_sheet_${sheetName}`,
          operation: 'read_sheet',
          sheetName,
          range: fullRange
        }
      );

      if (response.status === 200) {
        const values = response.result.values || [];
        
        // Remove header row if present
        if (values.length > 0 && this.isHeaderRow(values[0], config.headers)) {
          values.shift();
        }
        
        return values;
      }

      return [];
      
    } catch (error) {
      this.handleApiError(error, { 
        operation: 'read_sheet', 
        sheetName, 
        range 
      });
      throw error;
    }
  }

  /**
   * Write data to a specific sheet range
   */
  async writeSheet(sheetName, values, range = null) {
    if (!this.isInitialized || !this.spreadsheetId) {
      throw new Error('SheetsManager not initialized');
    }

    if (!values || values.length === 0) {
      console.warn('No data to write to sheet');
      return;
    }

    let backupId = null;

    try {
      const config = this.getSheetConfig(sheetName);
      
      // Create backup of existing data before writing
      if (window.DataBackupManager) {
        try {
          const existingData = await this.readSheet(sheetName);
          backupId = window.DataBackupManager.createAutoBackup(
            `write_sheet_${sheetName}`,
            { sheetName, data: existingData, range },
            { 
              operation: 'write_sheet',
              sheetName,
              rowCount: values.length,
              spreadsheetId: this.spreadsheetId
            }
          );
        } catch (backupError) {
          console.warn('Failed to create backup before write operation:', backupError);
          // Continue with write operation even if backup fails
        }
      }
      
      // Validate data before writing
      this.validateSheetData(values, config);
      
      // Determine range
      let writeRange;
      if (range) {
        writeRange = range;
      } else {
        // Find next empty row
        const existingData = await this.readSheet(sheetName);
        const nextRow = existingData.length + 2; // +1 for header, +1 for next row
        writeRange = `${config.name}!A${nextRow}:${this.getColumnLetter(config.headers.length)}${nextRow + values.length - 1}`;
      }

      // Use ErrorHandler retry logic for API calls
      const response = await window.ErrorHandler.retryWithBackoff(
        () => gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: writeRange,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: values
          }
        }),
        { 
          operationId: `write_sheet_${sheetName}`,
          operation: 'write_sheet',
          sheetName,
          range: writeRange,
          rowCount: values.length
        }
      );

      if (response.status === 200) {
        console.log(`Successfully wrote ${values.length} rows to ${sheetName}`);
        return response.result;
      }

      throw new Error('Failed to write to sheet');
      
    } catch (error) {
      this.handleApiError(error, { 
        operation: 'write_sheet', 
        sheetName, 
        rowCount: values.length 
      });
      throw error;
    }
  }

  /**
   * Append data to sheet
   */
  async appendToSheet(sheetName, values) {
    if (!this.isInitialized || !this.spreadsheetId) {
      throw new Error('SheetsManager not initialized');
    }

    if (!values || values.length === 0) {
      console.warn('No data to append to sheet');
      return;
    }

    try {
      const config = this.getSheetConfig(sheetName);
      
      // Validate data before writing
      this.validateSheetData(values, config);

      const response = await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${config.name}!A:A`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: values
        }
      });

      if (response.status === 200) {
        console.log(`Successfully appended ${values.length} rows to ${sheetName}`);
        return response.result;
      }

      throw new Error('Failed to append to sheet');
      
    } catch (error) {
      console.error('Error appending to sheet:', error);
      this.handleApiError(error);
      throw error;
    }
  }

  /**
   * Batch update multiple sheets
   */
  async batchUpdate(updates) {
    if (!this.isInitialized || !this.spreadsheetId) {
      throw new Error('SheetsManager not initialized');
    }

    if (!updates || updates.length === 0) {
      console.warn('No updates to perform');
      return;
    }

    // Define requests outside try block so it's accessible in catch
    let requests = [];
    
    try {
      for (const update of updates) {
        const { sheetName, values, range } = update;
        const config = this.getSheetConfig(sheetName);
        
        // Validate data
        this.validateSheetData(values, config);
        
        // Create update request
        requests.push({
          updateCells: {
            range: this.parseRange(range || `${config.name}!A2`, config),
            rows: values.map(row => ({
              values: row.map(cell => ({
                userEnteredValue: this.formatCellValue(cell)
              }))
            })),
            fields: 'userEnteredValue'
          }
        });
      }

      // Use ErrorHandler retry logic for batch operations
      const response = await window.ErrorHandler.retryWithBackoff(
        () => gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requests: requests
        }),
        { 
          operationId: `batch_update_${Date.now()}`,
          operation: 'batch_update',
          requestCount: requests.length,
          updateCount: updates.length
        }
      );

      if (response.status === 200) {
        console.log(`Successfully performed ${requests.length} batch updates`);
        return response.result;
      }

      throw new Error('Batch update failed');
      
    } catch (error) {
      this.handleApiError(error, { 
        operation: 'batch_update', 
        requestCount: requests.length,
        updateCount: updates.length 
      });
      throw error;
    }
  }

  /**
   * Batch read from multiple sheets
   */
  async batchRead(ranges) {
    if (!this.isInitialized || !this.spreadsheetId) {
      throw new Error('SheetsManager not initialized');
    }

    if (!ranges || ranges.length === 0) {
      console.warn('No ranges to read');
      return {};
    }

    try {
      // Prepare ranges array
      const rangeStrings = ranges.map(range => {
        if (typeof range === 'string') {
          return range;
        }
        
        const config = this.getSheetConfig(range.sheetName);
        return range.range || `${config.name}!${config.range}`;
      });

      const response = await gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId: this.spreadsheetId,
        ranges: rangeStrings,
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING'
      });

      if (response.status === 200) {
        const results = {};
        const valueRanges = response.result.valueRanges || [];
        
        valueRanges.forEach((valueRange, index) => {
          const range = ranges[index];
          const sheetName = typeof range === 'string' ? 
            range.split('!')[0] : range.sheetName;
          
          let values = valueRange.values || [];
          
          // Remove header row if present
          if (values.length > 0) {
            const config = Object.values(this.sheetsConfig).find(c => c.name === sheetName);
            if (config && this.isHeaderRow(values[0], config.headers)) {
              values.shift();
            }
          }
          
          results[sheetName] = values;
        });

        console.log(`Successfully read ${rangeStrings.length} ranges`);
        return results;
      }

      throw new Error('Batch read failed');
      
    } catch (error) {
      console.error('Error performing batch read:', error);
      this.handleApiError(error);
      throw error;
    }
  }

  /**
   * Update specific cells by row and column
   */
  async updateCells(sheetName, updates) {
    if (!this.isInitialized || !this.spreadsheetId) {
      throw new Error('SheetsManager not initialized');
    }

    if (!updates || updates.length === 0) {
      console.warn('No cell updates to perform');
      return;
    }

    try {
      const config = this.getSheetConfig(sheetName);
      const sheetId = await this.getSheetId(this.spreadsheetId, config.name);
      
      if (sheetId === null) {
        throw new Error(`Sheet ${sheetName} not found`);
      }

      const requests = updates.map(update => {
        const { row, column, value } = update;
        
        return {
          updateCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: row,
              endRowIndex: row + 1,
              startColumnIndex: column,
              endColumnIndex: column + 1
            },
            rows: [{
              values: [{
                userEnteredValue: this.formatCellValue(value)
              }]
            }],
            fields: 'userEnteredValue'
          }
        };
      });

      const response = await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requests: requests
      });

      if (response.status === 200) {
        console.log(`Successfully updated ${updates.length} cells in ${sheetName}`);
        return response.result;
      }

      throw new Error('Cell update failed');
      
    } catch (error) {
      console.error('Error updating cells:', error);
      this.handleApiError(error);
      throw error;
    }
  }

  /**
   * Find rows by criteria
   */
  async findRows(sheetName, criteria) {
    if (!this.isInitialized || !this.spreadsheetId) {
      throw new Error('SheetsManager not initialized');
    }

    try {
      const data = await this.readSheet(sheetName);
      const config = this.getSheetConfig(sheetName);
      
      const matchingRows = [];
      
      data.forEach((row, index) => {
        let matches = true;
        
        for (const [field, value] of Object.entries(criteria)) {
          const columnIndex = config.headers.indexOf(field);
          
          if (columnIndex === -1) {
            console.warn(`Field ${field} not found in ${sheetName} headers`);
            matches = false;
            break;
          }
          
          const cellValue = row[columnIndex];
          
          if (typeof value === 'function') {
            // Custom comparison function
            if (!value(cellValue)) {
              matches = false;
              break;
            }
          } else if (cellValue !== value) {
            matches = false;
            break;
          }
        }
        
        if (matches) {
          matchingRows.push({
            rowIndex: index + 2, // +2 because of header row and 0-based index
            data: row
          });
        }
      });

      console.log(`Found ${matchingRows.length} matching rows in ${sheetName}`);
      return matchingRows;
      
    } catch (error) {
      console.error('Error finding rows:', error);
      this.handleApiError(error);
      throw error;
    }
  }

  /**
   * Update rows by criteria
   */
  async updateRowsByCriteria(sheetName, criteria, updates) {
    if (!this.isInitialized || !this.spreadsheetId) {
      throw new Error('SheetsManager not initialized');
    }

    try {
      const matchingRows = await this.findRows(sheetName, criteria);
      
      if (matchingRows.length === 0) {
        console.log('No matching rows found to update');
        return { updatedRows: 0 };
      }

      const config = this.getSheetConfig(sheetName);
      const cellUpdates = [];
      
      matchingRows.forEach(({ rowIndex }) => {
        for (const [field, value] of Object.entries(updates)) {
          const columnIndex = config.headers.indexOf(field);
          
          if (columnIndex !== -1) {
            cellUpdates.push({
              row: rowIndex - 1, // Convert to 0-based index
              column: columnIndex,
              value: value
            });
          }
        }
      });

      if (cellUpdates.length > 0) {
        await this.updateCells(sheetName, cellUpdates);
      }

      console.log(`Updated ${matchingRows.length} rows in ${sheetName}`);
      return { updatedRows: matchingRows.length };
      
    } catch (error) {
      console.error('Error updating rows by criteria:', error);
      this.handleApiError(error);
      throw error;
    }
  }

  /**
   * Delete rows by criteria
   */
  async deleteRowsByCriteria(sheetName, criteria) {
    if (!this.isInitialized || !this.spreadsheetId) {
      throw new Error('SheetsManager not initialized');
    }

    try {
      const matchingRows = await this.findRows(sheetName, criteria);
      
      if (matchingRows.length === 0) {
        console.log('No matching rows found to delete');
        return { deletedRows: 0 };
      }

      const config = this.getSheetConfig(sheetName);
      const sheetId = await this.getSheetId(this.spreadsheetId, config.name);
      
      if (sheetId === null) {
        throw new Error(`Sheet ${sheetName} not found`);
      }

      // Sort by row index in descending order to delete from bottom up
      const sortedRows = matchingRows.sort((a, b) => b.rowIndex - a.rowIndex);
      
      const requests = sortedRows.map(({ rowIndex }) => ({
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1, // Convert to 0-based index
            endIndex: rowIndex
          }
        }
      }));

      const response = await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requests: requests
      });

      if (response.status === 200) {
        console.log(`Deleted ${matchingRows.length} rows from ${sheetName}`);
        return { deletedRows: matchingRows.length };
      }

      throw new Error('Row deletion failed');
      
    } catch (error) {
      console.error('Error deleting rows:', error);
      this.handleApiError(error);
      throw error;
    }
  }

  /**
   * Clear sheet data (keeping headers)
   */
  async clearSheet(sheetName) {
    if (!this.isInitialized || !this.spreadsheetId) {
      throw new Error('SheetsManager not initialized');
    }

    try {
      const config = this.getSheetConfig(sheetName);
      const range = `${config.name}!A2:${this.getColumnLetter(config.headers.length)}`;

      const response = await gapi.client.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: range
      });

      if (response.status === 200) {
        console.log(`Successfully cleared ${sheetName} sheet`);
        return response.result;
      }

      throw new Error('Failed to clear sheet');
      
    } catch (error) {
      console.error('Error clearing sheet:', error);
      this.handleApiError(error);
      throw error;
    }
  }

  /**
   * Get sheet configuration by name
   */
  getSheetConfig(sheetName) {
    const config = Object.values(this.sheetsConfig).find(c => c.name === sheetName);
    if (!config) {
      throw new Error(`Unknown sheet: ${sheetName}`);
    }
    return config;
  }

  /**
   * Validate sheet data
   */
  validateSheetData(values, config) {
    if (!Array.isArray(values)) {
      throw new Error('Values must be an array');
    }

    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      
      if (!Array.isArray(row)) {
        throw new Error(`Row ${i} must be an array`);
      }

      if (row.length > config.headers.length) {
        throw new Error(`Row ${i} has too many columns (${row.length} > ${config.headers.length})`);
      }

      // Validate required fields (first column is usually ID)
      if (row.length > 0 && (row[0] === null || row[0] === undefined || row[0] === '')) {
        throw new Error(`Row ${i} missing required ID field`);
      }

      // Perform field-specific validation
      this.validateRowData(row, config, i);
    }
  }

  /**
   * Validate individual row data based on sheet type
   */
  validateRowData(row, config, rowIndex) {
    const sheetType = Object.keys(this.sheetsConfig).find(key => 
      this.sheetsConfig[key].name === config.name
    );

    switch (sheetType) {
      case 'volunteers':
        this.validateVolunteerRow(row, rowIndex);
        break;
      case 'events':
        this.validateEventRow(row, rowIndex);
        break;
      case 'attendance':
        this.validateAttendanceRow(row, rowIndex);
        break;
    }
  }

  /**
   * Validate volunteer row data
   */
  validateVolunteerRow(row, rowIndex) {
    // Headers: ['ID', 'Name', 'Email', 'Committee', 'Created', 'Updated', 'Synced']
    
    if (row.length >= 2 && (!row[1] || row[1].toString().trim() === '')) {
      throw new Error(`Row ${rowIndex}: Volunteer name is required`);
    }

    if (row.length >= 3 && row[2] && !this.isValidEmail(row[2])) {
      throw new Error(`Row ${rowIndex}: Invalid email format`);
    }

    if (row.length >= 5 && row[4] && !this.isValidDate(row[4])) {
      throw new Error(`Row ${rowIndex}: Invalid created date format`);
    }

    if (row.length >= 6 && row[5] && !this.isValidDate(row[5])) {
      throw new Error(`Row ${rowIndex}: Invalid updated date format`);
    }
  }

  /**
   * Validate event row data
   */
  validateEventRow(row, rowIndex) {
    // Headers: ['ID', 'Name', 'Date', 'Start Time', 'End Time', 'Status', 'Description', 'Created', 'Updated', 'Synced']
    
    if (row.length >= 2 && (!row[1] || row[1].toString().trim() === '')) {
      throw new Error(`Row ${rowIndex}: Event name is required`);
    }

    if (row.length >= 3 && row[2] && !this.isValidDate(row[2])) {
      throw new Error(`Row ${rowIndex}: Invalid event date format`);
    }

    if (row.length >= 4 && row[3] && !this.isValidTime(row[3])) {
      throw new Error(`Row ${rowIndex}: Invalid start time format`);
    }

    if (row.length >= 5 && row[4] && !this.isValidTime(row[4])) {
      throw new Error(`Row ${rowIndex}: Invalid end time format`);
    }

    if (row.length >= 6 && row[5] && !['Active', 'Inactive', 'Completed', 'Cancelled'].includes(row[5])) {
      throw new Error(`Row ${rowIndex}: Invalid event status`);
    }
  }

  /**
   * Validate attendance row data
   */
  validateAttendanceRow(row, rowIndex) {
    // Headers: ['ID', 'Volunteer ID', 'Event ID', 'Volunteer Name', 'Committee', 'Date', 'Time', 'Created', 'Updated', 'Synced']
    
    if (row.length >= 2 && (!row[1] || row[1].toString().trim() === '')) {
      throw new Error(`Row ${rowIndex}: Volunteer ID is required`);
    }

    if (row.length >= 3 && (!row[2] || row[2].toString().trim() === '')) {
      throw new Error(`Row ${rowIndex}: Event ID is required`);
    }

    if (row.length >= 4 && (!row[3] || row[3].toString().trim() === '')) {
      throw new Error(`Row ${rowIndex}: Volunteer name is required`);
    }

    if (row.length >= 6 && row[5] && !this.isValidDate(row[5])) {
      throw new Error(`Row ${rowIndex}: Invalid attendance date format`);
    }

    if (row.length >= 7 && row[6] && !this.isValidDateTime(row[6])) {
      throw new Error(`Row ${rowIndex}: Invalid attendance time format`);
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate date format (YYYY-MM-DD or MM/DD/YYYY)
   */
  isValidDate(dateString) {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Validate time format (HH:MM or HH:MM:SS)
   */
  isValidTime(timeString) {
    if (!timeString) return false;
    
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    return timeRegex.test(timeString);
  }

  /**
   * Validate datetime format
   */
  isValidDateTime(dateTimeString) {
    if (!dateTimeString) return false;
    
    const dateTime = new Date(dateTimeString);
    return !isNaN(dateTime.getTime());
  }

  /**
   * Sanitize data before writing to sheets
   */
  sanitizeData(values) {
    return values.map(row => 
      row.map(cell => {
        if (cell === null || cell === undefined) {
          return '';
        }
        
        // Convert to string and sanitize
        let sanitized = cell.toString();
        
        // Remove or escape problematic characters
        sanitized = sanitized.replace(/[\r\n\t]/g, ' '); // Replace line breaks and tabs with spaces
        sanitized = sanitized.replace(/"/g, '""'); // Escape quotes
        sanitized = sanitized.trim(); // Remove leading/trailing whitespace
        
        return sanitized;
      })
    );
  }

  /**
   * Validate data integrity across sheets
   */
  async validateDataIntegrity() {
    if (!this.isInitialized || !this.spreadsheetId) {
      throw new Error('SheetsManager not initialized');
    }

    try {
      const results = await this.batchRead([
        { sheetName: 'Volunteers' },
        { sheetName: 'Events' },
        { sheetName: 'Attendance' }
      ]);

      const volunteers = results['Volunteers'] || [];
      const events = results['Events'] || [];
      const attendance = results['Attendance'] || [];

      const issues = [];

      // Check for duplicate IDs
      this.checkDuplicateIds(volunteers, 'Volunteers', issues);
      this.checkDuplicateIds(events, 'Events', issues);
      this.checkDuplicateIds(attendance, 'Attendance', issues);

      // Check referential integrity
      this.checkReferentialIntegrity(attendance, volunteers, events, issues);

      if (issues.length > 0) {
        console.warn('Data integrity issues found:', issues);
        return { valid: false, issues };
      }

      console.log('Data integrity validation passed');
      return { valid: true, issues: [] };
      
    } catch (error) {
      console.error('Error validating data integrity:', error);
      throw error;
    }
  }

  /**
   * Check for duplicate IDs in a sheet
   */
  checkDuplicateIds(data, sheetName, issues) {
    const ids = new Set();
    const duplicates = [];

    data.forEach((row, index) => {
      const id = row[0]; // First column is ID
      if (id && ids.has(id)) {
        duplicates.push({ id, row: index + 2 }); // +2 for header and 0-based index
      } else if (id) {
        ids.add(id);
      }
    });

    if (duplicates.length > 0) {
      issues.push({
        type: 'duplicate_ids',
        sheet: sheetName,
        duplicates
      });
    }
  }

  /**
   * Check referential integrity between sheets
   */
  checkReferentialIntegrity(attendance, volunteers, events, issues) {
    const volunteerIds = new Set(volunteers.map(row => row[0]).filter(id => id));
    const eventIds = new Set(events.map(row => row[0]).filter(id => id));

    const orphanedAttendance = [];

    attendance.forEach((row, index) => {
      const volunteerId = row[1]; // Volunteer ID column
      const eventId = row[2]; // Event ID column

      if (volunteerId && !volunteerIds.has(volunteerId)) {
        orphanedAttendance.push({
          row: index + 2,
          type: 'missing_volunteer',
          volunteerId
        });
      }

      if (eventId && !eventIds.has(eventId)) {
        orphanedAttendance.push({
          row: index + 2,
          type: 'missing_event',
          eventId
        });
      }
    });

    if (orphanedAttendance.length > 0) {
      issues.push({
        type: 'referential_integrity',
        sheet: 'Attendance',
        orphaned: orphanedAttendance
      });
    }
  }

  /**
   * Check if row is header row
   */
  isHeaderRow(row, expectedHeaders) {
    if (!Array.isArray(row) || row.length !== expectedHeaders.length) {
      return false;
    }

    return expectedHeaders.every((header, index) => 
      row[index] && row[index].toString().toLowerCase() === header.toLowerCase()
    );
  }

  /**
   * Format cell value for API
   */
  formatCellValue(value) {
    if (value === null || value === undefined) {
      return { stringValue: '' };
    }

    if (typeof value === 'number') {
      return { numberValue: value };
    }

    if (typeof value === 'boolean') {
      return { boolValue: value };
    }

    // Check if it's a date string
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return { stringValue: value };
    }

    return { stringValue: value.toString() };
  }

  /**
   * Parse range string to range object
   */
  parseRange(rangeString, config) {
    // Simple range parsing - can be enhanced
    const parts = rangeString.split('!');
    const sheetName = parts[0];
    const range = parts[1] || 'A1';
    
    return {
      sheetId: null, // Would need to look up sheet ID
      startRowIndex: 1, // Skip header
      endRowIndex: 1000,
      startColumnIndex: 0,
      endColumnIndex: config.headers.length
    };
  }

  /**
   * Get column letter from index (A, B, C, ...)
   */
  getColumnLetter(index) {
    let result = '';
    while (index > 0) {
      index--;
      result = String.fromCharCode(65 + (index % 26)) + result;
      index = Math.floor(index / 26);
    }
    return result;
  }

  /**
   * Handle API errors using ErrorHandler
   */
  handleApiError(error, context = {}) {
    // Use ErrorHandler for comprehensive error handling
    const errorResult = window.ErrorHandler.handleError(error, {
      ...context,
      component: 'SheetsManager',
      spreadsheetId: this.spreadsheetId
    });
    
    // Handle specific API error actions
    if (error.status === 401) {
      // Trigger re-authentication through AuthManager
      if (window.AuthManager) {
        window.AuthManager.handleAuthError(error, { 
          operation: context.operation || 'sheets_api_call' 
        });
      }
    } else if (error.status === 404) {
      // Clear stored spreadsheet ID if spreadsheet not found
      window.UIUtils.Storage.remove('vat_spreadsheet_id');
      this.spreadsheetId = null;
      this.spreadsheetUrl = null;
      
      // Emit event to notify UI that spreadsheet needs to be recreated
      window.dispatchEvent(new CustomEvent('spreadsheetNotFound', {
        detail: { errorInfo: errorResult.errorInfo }
      }));
    } else if (error.status === 429) {
      // Rate limit - activate offline mode temporarily
      window.dispatchEvent(new CustomEvent('rateLimitExceeded', {
        detail: { 
          errorInfo: errorResult.errorInfo,
          retryAfter: errorResult.recoveryStrategy.retryDelay 
        }
      }));
    }
    
    // Emit general sheets error event for UI handling
    window.dispatchEvent(new CustomEvent('sheetsError', {
      detail: { 
        error, 
        errorInfo: errorResult.errorInfo,
        recoveryStrategy: errorResult.recoveryStrategy
      }
    }));
    
    return errorResult;
  }

  /**
   * Get spreadsheet info
   */
  getSpreadsheetInfo() {
    return {
      id: this.spreadsheetId,
      url: this.spreadsheetUrl,
      isInitialized: this.isInitialized,
      sheets: Object.keys(this.sheetsConfig).map(key => ({
        key,
        name: this.sheetsConfig[key].name,
        headers: this.sheetsConfig[key].headers
      }))
    };
  }

  /**
   * Reset spreadsheet (for testing or reconfiguration)
   */
  async resetSpreadsheet() {
    try {
      // Clear stored spreadsheet ID
      window.UIUtils.Storage.remove('vat_spreadsheet_id');
      
      // Reset instance variables
      this.spreadsheetId = null;
      this.spreadsheetUrl = null;
      this.isInitialized = false;
      
      console.log('Spreadsheet reset - will create new one on next init');
      
    } catch (error) {
      console.error('Error resetting spreadsheet:', error);
      throw error;
    }
  }

  /**
   * Set custom spreadsheet ID
   */
  async setSpreadsheetId(spreadsheetId) {
    try {
      console.log('Setting custom spreadsheet ID:', spreadsheetId);
      
      // Quick validation without structure setup (for faster UX)
      const isValid = await this.validateSpreadsheet(spreadsheetId, { setupStructure: false });
      
      if (!isValid) {
        throw new Error('Invalid spreadsheet ID or no access');
      }

      // Store the new spreadsheet ID
      this.spreadsheetId = spreadsheetId;
      this.spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      window.UIUtils.Storage.set('vat_spreadsheet_id', spreadsheetId);
      
      console.log('Custom spreadsheet ID set:', spreadsheetId);
      
      // Setup structure in background (truly non-blocking using requestIdleCallback)
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          this.setupSheetsStructure(spreadsheetId).catch(error => {
            console.warn('Background structure setup failed:', error.message);
          });
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          this.setupSheetsStructure(spreadsheetId).catch(error => {
            console.warn('Background structure setup failed:', error.message);
          });
        }, 500); // Longer delay to ensure UI is responsive
      }
      
      return { success: true, spreadsheetId, spreadsheetUrl: this.spreadsheetUrl };
      
    } catch (error) {
      console.error('Error setting custom spreadsheet ID:', error);
      throw error;
    }
  }
}

// Global instance
window.SheetsManager = new SheetsManager();