/**
 * Shared Layout Component
 * Provides consistent layout structure across all pages
 */
window.LayoutComponent = {
  
  // Generate complete layout HTML
  generateHTML(options = {}) {
    const {
      title = 'Gurukul Attendance',
      activeNav = 'dashboard',
      includeModals = true,
      includeLoading = true
    } = options;

    const modalsHTML = includeModals ? `
      <!-- Modal -->
      <div class="modal-overlay" id="modalOverlay">
        <div class="modal" id="modal">
          <div class="modal-header">
            <h3 id="modalTitle">Modal</h3>
            <button class="modal-close" id="modalClose">×</button>
          </div>
          <div class="modal-body" id="modalBody"></div>
          <div class="modal-footer" id="modalFooter">
            <button class="btn btn-secondary" id="modalCancel">Cancel</button>
            <button class="btn btn-primary" id="modalConfirm">Confirm</button>
          </div>
        </div>
      </div>
    ` : '';

    const loadingHTML = includeLoading ? `
      <!-- Loading -->
      <div class="loading-overlay" id="loadingOverlay">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    ` : '';

    return `
      <div class="app">
        ${window.HeaderComponent.generateHTML(title)}
        ${window.NavigationComponent.generateHTML(activeNav)}
        <main class="main" id="main">
          <!-- Main content will be inserted here -->
        </main>
        ${modalsHTML}
        ${loadingHTML}
      </div>
    `;
  },

  // Initialize complete layout
  init(options = {}) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.render(options);
      });
    } else {
      this.render(options);
    }
  },

  // Render layout
  render(options = {}) {
    // Replace entire body content with layout
    document.body.innerHTML = this.generateHTML(options);
    
    // Setup event listeners for navigation and header
    window.NavigationComponent.setupEventListeners();
    
    // Setup modal handlers if modals are included
    if (options.includeModals !== false) {
      this.setupModalHandlers();
    }
  },

  // Setup modal event handlers
  setupModalHandlers() {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');
    
    // Close modal handlers
    [modalClose, modalCancel].forEach(btn => {
      if (btn) {
        btn.onclick = () => {
          if (window.UI && window.UI.Modal) {
            window.UI.Modal.hide();
          }
        };
      }
    });
    
    // Close on overlay click
    if (modalOverlay) {
      modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay && window.UI && window.UI.Modal) {
          window.UI.Modal.hide();
        }
      };
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && window.UI && window.UI.Modal && window.UI.Modal.current) {
        window.UI.Modal.hide();
      }
    });
  },

  // Update main content
  setMainContent(html) {
    const mainElement = document.getElementById('main');
    if (mainElement) {
      mainElement.innerHTML = html;
    }
  },

  // Append to main content
  appendToMain(html) {
    const mainElement = document.getElementById('main');
    if (mainElement) {
      mainElement.innerHTML += html;
    }
  }
};