/**
 * Help Documentation Component
 * Provides comprehensive help and documentation for the application
 */
class HelpComponent {
  constructor() {
    this.currentSection = 'overview';
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  /**
   * Generate help documentation HTML
   */
  generateHTML() {
    return `
      <div class="help-container">
        <div class="help-sidebar">
          <h3>📚 Help Topics</h3>
          <nav class="help-nav">
            <button class="help-nav-item ${this.currentSection === 'overview' ? 'active' : ''}" 
                    onclick="helpComponent.showSection('overview')">
              📋 Overview
            </button>
            <button class="help-nav-item ${this.currentSection === 'validation-modes' ? 'active' : ''}" 
                    onclick="helpComponent.showSection('validation-modes')">
              🔒 Validation Modes
            </button>
            <button class="help-nav-item ${this.currentSection === 'scanning' ? 'active' : ''}" 
                    onclick="helpComponent.showSection('scanning')">
              📱 Scanning Guide
            </button>
            <button class="help-nav-item ${this.currentSection === 'troubleshooting' ? 'active' : ''}" 
                    onclick="helpComponent.showSection('troubleshooting')">
              🔧 Troubleshooting
            </button>
            <button class="help-nav-item ${this.currentSection === 'best-practices' ? 'active' : ''}" 
                    onclick="helpComponent.showSection('best-practices')">
              ⭐ Best Practices
            </button>
          </nav>
        </div>
        <div class="help-content">
          ${this.getContentForSection(this.currentSection)}
        </div>
      </div>
    `;
  }

  /**
   * Get content for specific help section
   */
  getContentForSection(section) {
    switch (section) {
      case 'overview':
        return this.getOverviewContent();
      case 'validation-modes':
        return this.getValidationModesContent();
      case 'scanning':
        return this.getScanningGuideContent();
      case 'troubleshooting':
        return this.getTroubleshootingContent();
      case 'best-practices':
        return this.getBestPracticesContent();
      default:
        return this.getOverviewContent();
    }
  }

  /**
   * Overview content
   */
  getOverviewContent() {
    return `
      <div class="help-section">
        <h2>📋 Application Overview</h2>
        <p>The Volunteer Attendance Tracker helps organizations efficiently manage volunteer check-ins using badge scanning technology.</p>
        
        <h3>Key Features</h3>
        <ul class="help-list">
          <li><strong>Badge Scanning:</strong> Quick volunteer check-in using ID badges</li>
          <li><strong>Validation Modes:</strong> Flexible validation options for different scenarios</li>
          <li><strong>Real-time Sync:</strong> Automatic synchronization with Google Sheets</li>
          <li><strong>Reporting:</strong> Comprehensive attendance reports and analytics</li>
          <li><strong>Event Management:</strong> Create and manage multiple events</li>
        </ul>

        <h3>Getting Started</h3>
        <ol class="help-list">
          <li>Configure your validation mode in Settings</li>
          <li>Set up Google Sheets integration (optional)</li>
          <li>Create or import volunteer records</li>
          <li>Create events for attendance tracking</li>
          <li>Start scanning volunteer badges</li>
        </ol>
      </div>
    `;
  }

  /**
   * Validation modes detailed content
   */
  getValidationModesContent() {
    return `
      <div class="help-section">
        <h2>🔒 Validation Modes Guide</h2>
        <p>The system offers three validation modes to handle different operational scenarios. Choose the mode that best fits your event requirements.</p>

        <div class="validation-mode-guide">
          <div class="mode-card strict-mode">
            <div class="mode-header">
              <span class="mode-icon">🔒</span>
              <h3>Strict Validation Mode</h3>
              <span class="mode-badge recommended">Recommended</span>
            </div>
            <div class="mode-content">
              <p><strong>What it does:</strong> Only allows scanning of pre-registered volunteers. Unknown IDs are rejected.</p>
              
              <h4>When to use:</h4>
              <ul class="help-list">
                <li>Regular events with pre-registered volunteers</li>
                <li>Security-sensitive environments</li>
                <li>When you need accurate attendance tracking</li>
                <li>Events with limited capacity or restricted access</li>
              </ul>

              <h4>Benefits:</h4>
              <ul class="help-list">
                <li>✅ Highest data accuracy</li>
                <li>✅ Prevents unauthorized access</li>
                <li>✅ Clean, reliable attendance records</li>
                <li>✅ Easy to audit and verify</li>
              </ul>

              <h4>Considerations:</h4>
              <ul class="help-list">
                <li>⚠️ Requires complete volunteer pre-registration</li>
                <li>⚠️ Cannot handle walk-in volunteers without manual intervention</li>
              </ul>
            </div>
          </div>

          <div class="mode-card create-mode">
            <div class="mode-header">
              <span class="mode-icon">➕</span>
              <h3>Create If Not Found Mode</h3>
              <span class="mode-badge flexible">Flexible</span>
            </div>
            <div class="mode-content">
              <p><strong>What it does:</strong> Checks for existing volunteers first, then prompts to register new ones when unknown IDs are scanned.</p>
              
              <h4>When to use:</h4>
              <ul class="help-list">
                <li>Events expecting walk-in volunteers</li>
                <li>Community events with open registration</li>
                <li>When building a volunteer database over time</li>
                <li>Mixed events with both pre-registered and new volunteers</li>
              </ul>

              <h4>Benefits:</h4>
              <ul class="help-list">
                <li>✅ Handles both registered and new volunteers</li>
                <li>✅ Streamlined registration during scanning</li>
                <li>✅ Builds comprehensive volunteer database</li>
                <li>✅ Maintains data integrity with validation status tracking</li>
              </ul>

              <h4>Considerations:</h4>
              <ul class="help-list">
                <li>⚠️ Requires staff training for registration process</li>
                <li>⚠️ Slightly slower scanning for new volunteers</li>
                <li>⚠️ Need to verify new volunteer information accuracy</li>
              </ul>
            </div>
          </div>

          <div class="mode-card no-validation-mode">
            <div class="mode-header">
              <span class="mode-icon">⚠️</span>
              <h3>No Validation Mode</h3>
              <span class="mode-badge caution">Use with Caution</span>
            </div>
            <div class="mode-content">
              <p><strong>What it does:</strong> Accepts any scanned ID without verification. Creates temporary attendance records.</p>
              
              <h4>When to use:</h4>
              <ul class="help-list">
                <li>Emergency situations or system failures</li>
                <li>Temporary events with unknown participant lists</li>
                <li>Testing or demonstration purposes</li>
                <li>When volunteer database is unavailable</li>
              </ul>

              <h4>Benefits:</h4>
              <ul class="help-list">
                <li>✅ Fastest scanning process</li>
                <li>✅ No setup required</li>
                <li>✅ Works with any ID format</li>
                <li>✅ Useful for emergency situations</li>
              </ul>

              <h4>Considerations:</h4>
              <ul class="help-list">
                <li>❌ No data validation or verification</li>
                <li>❌ Potential for duplicate or invalid entries</li>
                <li>❌ Requires manual cleanup afterward</li>
                <li>❌ Limited reporting capabilities</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="mode-switching-guide">
          <h3>🔄 Switching Between Modes</h3>
          <p>You can change validation modes at any time through the Settings page. The change takes effect immediately.</p>
          
          <div class="switching-tips">
            <h4>💡 Pro Tips:</h4>
            <ul class="help-list">
              <li>Start events in <strong>Strict Mode</strong> for best data quality</li>
              <li>Switch to <strong>Create Mode</strong> if you encounter many unregistered volunteers</li>
              <li>Use <strong>No Validation</strong> only as a last resort</li>
              <li>All mode changes are logged for audit purposes</li>
              <li>Validation status is tracked in all attendance records</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Scanning guide content
   */
  getScanningGuideContent() {
    return `
      <div class="help-section">
        <h2>📱 Scanning Guide</h2>
        
        <h3>Basic Scanning Process</h3>
        <ol class="help-list">
          <li>Ensure an event is selected in the dashboard</li>
          <li>Check the validation mode indicator</li>
          <li>Focus on the scanner input field</li>
          <li>Scan the volunteer's badge or manually enter ID</li>
          <li>Follow any prompts based on validation mode</li>
        </ol>

        <h3>Understanding Validation Status</h3>
        <div class="status-guide">
          <div class="status-item">
            <span class="status-badge id-found">ID Found</span>
            <p>Volunteer was pre-registered and successfully identified</p>
          </div>
          <div class="status-item">
            <span class="status-badge id-created">ID Created</span>
            <p>New volunteer was registered during scanning process</p>
          </div>
          <div class="status-item">
            <span class="status-badge no-validation">No Validation</span>
            <p>ID was accepted without verification (use with caution)</p>
          </div>
        </div>

        <h3>Scanner Input Tips</h3>
        <ul class="help-list">
          <li>The scanner input field automatically focuses after each scan</li>
          <li>Press Enter or scan to process the ID</li>
          <li>Use the clear button (✕) to reset the input</li>
          <li>Scanner works with keyboard input for manual entry</li>
        </ul>

        <h3>Handling Different Scenarios</h3>
        
        <h4>In Strict Mode:</h4>
        <ul class="help-list">
          <li>✅ Known volunteer: Attendance recorded immediately</li>
          <li>❌ Unknown volunteer: Error message displayed, no attendance recorded</li>
        </ul>

        <h4>In Create Mode:</h4>
        <ul class="help-list">
          <li>✅ Known volunteer: Attendance recorded immediately</li>
          <li>➕ Unknown volunteer: Registration form appears</li>
          <li>Complete the form with name and committee (required)</li>
          <li>Click "Register & Check In" to complete</li>
        </ul>

        <h4>In No Validation Mode:</h4>
        <ul class="help-list">
          <li>✅ Any ID: Attendance recorded immediately</li>
          <li>⚠️ No verification performed</li>
        </ul>
      </div>
    `;
  }

  /**
   * Troubleshooting content
   */
  getTroubleshootingContent() {
    return `
      <div class="help-section">
        <h2>🔧 Troubleshooting Guide</h2>

        <div class="troubleshooting-section">
          <h3>🔒 Validation Mode Issues</h3>
          
          <div class="issue-card">
            <h4>❌ "Volunteer not found" error in Strict Mode</h4>
            <div class="issue-content">
              <p><strong>Cause:</strong> The scanned ID doesn't match any registered volunteer.</p>
              <p><strong>Solutions:</strong></p>
              <ul class="help-list">
                <li>Verify the volunteer is registered in the system</li>
                <li>Check if the ID was entered correctly</li>
                <li>Switch to Create Mode to register the volunteer</li>
                <li>Manually add the volunteer in the Volunteers section</li>
              </ul>
            </div>
          </div>

          <div class="issue-card">
            <h4>➕ Registration form not appearing in Create Mode</h4>
            <div class="issue-content">
              <p><strong>Cause:</strong> JavaScript error or validation engine not properly initialized.</p>
              <p><strong>Solutions:</strong></p>
              <ul class="help-list">
                <li>Refresh the page and try again</li>
                <li>Check browser console for error messages</li>
                <li>Verify validation mode is properly set in Settings</li>
                <li>Clear browser cache and reload</li>
              </ul>
            </div>
          </div>

          <div class="issue-card">
            <h4>⚠️ Validation mode not changing</h4>
            <div class="issue-content">
              <p><strong>Cause:</strong> Settings not saving properly or browser storage issues.</p>
              <p><strong>Solutions:</strong></p>
              <ul class="help-list">
                <li>Check that settings are saved successfully</li>
                <li>Refresh the page after changing modes</li>
                <li>Clear browser local storage and reconfigure</li>
                <li>Check browser console for storage errors</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="troubleshooting-section">
          <h3>📱 Scanner Issues</h3>
          
          <div class="issue-card">
            <h4>Scanner input not responding</h4>
            <div class="issue-content">
              <p><strong>Solutions:</strong></p>
              <ul class="help-list">
                <li>Click on the scanner input field to focus it</li>
                <li>Check if an event is selected</li>
                <li>Refresh the page if input remains unresponsive</li>
                <li>Try using keyboard input instead of scanning</li>
              </ul>
            </div>
          </div>

          <div class="issue-card">
            <h4>Duplicate scans being recorded</h4>
            <div class="issue-content">
              <p><strong>Solutions:</strong></p>
              <ul class="help-list">
                <li>Wait for scan feedback before scanning again</li>
                <li>Check Recent Activity to verify attendance</li>
                <li>Use the clear button between scans</li>
                <li>Ensure scanner is not double-triggering</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="troubleshooting-section">
          <h3>💾 Data Issues</h3>
          
          <div class="issue-card">
            <h4>Attendance records missing validation status</h4>
            <div class="issue-content">
              <p><strong>Cause:</strong> Records created before validation status feature was implemented.</p>
              <p><strong>Solutions:</strong></p>
              <ul class="help-list">
                <li>Existing records are automatically marked as "ID Found"</li>
                <li>New scans will include proper validation status</li>
                <li>Check the audit log for validation mode history</li>
              </ul>
            </div>
          </div>

          <div class="issue-card">
            <h4>Google Sheets sync not including validation status</h4>
            <div class="issue-content">
              <p><strong>Solutions:</strong></p>
              <ul class="help-list">
                <li>Perform a full sync to update sheet structure</li>
                <li>Check that Google Sheets integration is properly configured</li>
                <li>Verify authentication with Google Sheets</li>
                <li>Check sync status in the dashboard</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="troubleshooting-section">
          <h3>🔍 Diagnostic Tools</h3>
          
          <div class="diagnostic-tools">
            <h4>Available Diagnostic Information:</h4>
            <ul class="help-list">
              <li><strong>Audit Log:</strong> View validation mode changes in Settings</li>
              <li><strong>Browser Console:</strong> Check for JavaScript errors</li>
              <li><strong>Sync Status:</strong> Monitor Google Sheets synchronization</li>
              <li><strong>Validation Indicators:</strong> Current mode display on dashboard</li>
            </ul>
          </div>

          <div class="emergency-procedures">
            <h4>🚨 Emergency Procedures:</h4>
            <ol class="help-list">
              <li>If scanning fails completely, switch to No Validation mode temporarily</li>
              <li>Record attendance manually and sync later</li>
              <li>Document any issues for later investigation</li>
              <li>Contact system administrator if problems persist</li>
            </ol>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Best practices content
   */
  getBestPracticesContent() {
    return `
      <div class="help-section">
        <h2>⭐ Best Practices</h2>

        <div class="best-practices-section">
          <h3>🔒 Validation Mode Selection</h3>
          
          <div class="practice-card">
            <h4>📋 Event Planning Phase</h4>
            <ul class="help-list">
              <li>Start with <strong>Strict Mode</strong> for maximum data accuracy</li>
              <li>Ensure all expected volunteers are pre-registered</li>
              <li>Test scanning setup before the event begins</li>
              <li>Train staff on validation mode procedures</li>
            </ul>
          </div>

          <div class="practice-card">
            <h4>🎯 During Events</h4>
            <ul class="help-list">
              <li>Monitor validation mode indicator regularly</li>
              <li>Switch to Create Mode if many unregistered volunteers arrive</li>
              <li>Use No Validation only in emergency situations</li>
              <li>Document any mode changes and reasons</li>
            </ul>
          </div>

          <div class="practice-card">
            <h4>📊 Post-Event Review</h4>
            <ul class="help-list">
              <li>Review attendance records by validation status</li>
              <li>Verify accuracy of newly created volunteer records</li>
              <li>Check audit log for any unexpected mode changes</li>
              <li>Update volunteer database with corrected information</li>
            </ul>
          </div>
        </div>

        <div class="best-practices-section">
          <h3>📱 Scanning Efficiency</h3>
          
          <div class="practice-card">
            <h4>⚡ Speed Optimization</h4>
            <ul class="help-list">
              <li>Keep scanner input field focused at all times</li>
              <li>Use Create Mode for events with expected walk-ins</li>
              <li>Pre-populate volunteer information when possible</li>
              <li>Train volunteers to have badges ready</li>
            </ul>
          </div>

          <div class="practice-card">
            <h4>🎯 Accuracy Maintenance</h4>
            <ul class="help-list">
              <li>Verify volunteer information during registration</li>
              <li>Use consistent ID formats across all badges</li>
              <li>Double-check attendance for VIP or critical volunteers</li>
              <li>Monitor for duplicate scans in busy periods</li>
            </ul>
          </div>
        </div>

        <div class="best-practices-section">
          <h3>💾 Data Management</h3>
          
          <div class="practice-card">
            <h4>🔄 Synchronization</h4>
            <ul class="help-list">
              <li>Enable automatic Google Sheets sync for real-time updates</li>
              <li>Perform manual sync before and after events</li>
              <li>Monitor sync status throughout the event</li>
              <li>Keep local backups of critical attendance data</li>
            </ul>
          </div>

          <div class="practice-card">
            <h4>📈 Reporting</h4>
            <ul class="help-list">
              <li>Use validation status filters for accurate reporting</li>
              <li>Export data regularly for external analysis</li>
              <li>Track validation mode usage patterns</li>
              <li>Generate reports by committee and event type</li>
            </ul>
          </div>
        </div>

        <div class="best-practices-section">
          <h3>🛡️ Security & Compliance</h3>
          
          <div class="practice-card">
            <h4>🔐 Access Control</h4>
            <ul class="help-list">
              <li>Restrict validation mode changes to authorized personnel</li>
              <li>Monitor audit logs for unauthorized changes</li>
              <li>Use Strict Mode for security-sensitive events</li>
              <li>Implement proper user authentication</li>
            </ul>
          </div>

          <div class="practice-card">
            <h4>📋 Audit Trail</h4>
            <ul class="help-list">
              <li>Regularly review audit logs for compliance</li>
              <li>Document reasons for validation mode changes</li>
              <li>Maintain records of system configuration changes</li>
              <li>Export audit data for long-term storage</li>
            </ul>
          </div>
        </div>

        <div class="recommendation-summary">
          <h3>🎯 Quick Reference</h3>
          <div class="quick-ref-grid">
            <div class="ref-card">
              <h4>🏢 Corporate Events</h4>
              <p>Use <strong>Strict Mode</strong> with pre-registered attendee lists</p>
            </div>
            <div class="ref-card">
              <h4>🎪 Community Events</h4>
              <p>Use <strong>Create Mode</strong> to handle walk-in volunteers</p>
            </div>
            <div class="ref-card">
              <h4>🚨 Emergency Situations</h4>
              <p>Use <strong>No Validation</strong> temporarily, clean up data later</p>
            </div>
            <div class="ref-card">
              <h4>🧪 Testing & Training</h4>
              <p>Use <strong>No Validation</strong> for demonstrations and testing</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Show specific help section
   */
  showSection(section) {
    this.currentSection = section;
    const container = document.querySelector('.help-content');
    if (container) {
      container.innerHTML = this.getContentForSection(section);
    }
    
    // Update navigation
    document.querySelectorAll('.help-nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[onclick="helpComponent.showSection('${section}')"]`)?.classList.add('active');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Event listeners are handled via onclick attributes in the HTML
  }

  /**
   * Render help component into container
   */
  render(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = this.generateHTML();
    }
  }
}

// Initialize global help component
window.helpComponent = new HelpComponent();