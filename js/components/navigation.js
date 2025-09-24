/**
 * Shared Navigation Component
 * Provides consistent navigation across all pages
 */
window.NavigationComponent = {
  
  // Internal state
  _manuallyInitialized: false,
  
  // Navigation configuration
  config: {
    items: [
      { id: 'dashboard', icon: '🏠', text: 'Dashboard', href: 'index.html' },
      { id: 'volunteers', icon: '👥', text: 'Volunteers', href: 'index.html#volunteers' },
      { id: 'events', icon: '📅', text: 'Events', href: 'index.html#events' },
      { id: 'reports', icon: '📊', text: 'Reports', href: 'index.html#reports' },
      { id: 'settings', icon: '⚙️', text: 'Settings', href: 'settings.html' }
    ]
  },

  // Generate navigation HTML
  generateHTML(activeItem = 'dashboard') {
    const navItems = this.config.items.map(item => {
      const isActive = item.id === activeItem;
      const activeClass = isActive ? ' active' : '';
      
      // Determine if this is an internal view or external navigation
      const isInternalView = ['dashboard', 'volunteers', 'events', 'reports'].includes(item.id);
      const isCurrentPage = window.location.pathname.includes('index.html') || window.location.pathname === '/';
      
      let clickHandler;
      if (isInternalView && isCurrentPage) {
        // Use view switching for internal views on main page
        clickHandler = `NavigationComponent.switchToView('${item.id}')`;
      } else {
        // Use navigation for external pages or when not on main page
        clickHandler = `NavigationComponent.navigate('${item.href}')`;
      }
      
      return `
        <button class="nav-item${activeClass}" data-view="${item.id}" onclick="${clickHandler}">
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-text">${item.text}</span>
        </button>
      `;
    }).join('');

    return `
      <nav class="nav" id="nav">
        <div class="nav-left">
          ${navItems}
        </div>
        <div class="nav-right">
          <button class="btn-icon nav-sync" id="syncBtn" title="Sync">🔄</button>
        </div>
      </nav>
    `;
  },

  // Render navigation into a container
  render(containerId, activeItem = 'dashboard') {
    const container = window.UIUtils.DOM.get(`#${containerId}`) || window.UIUtils.DOM.get(containerId);
    if (container) {
      container.innerHTML = this.generateHTML(activeItem);
      this.setupEventListeners();
    } else {
      console.error('Navigation container not found:', containerId);
    }
  },

  // Replace existing navigation
  replace(activeItem = 'dashboard') {
    const existingNav = document.querySelector('.nav');
    if (existingNav) {
      existingNav.outerHTML = this.generateHTML(activeItem);
      this.setupEventListeners();
      this._manuallyInitialized = true;
    } else {
      console.error('Existing navigation not found');
    }
  },

  // Navigate to a page
  navigate(href) {
    if (href.includes('#')) {
      // Handle hash navigation for same page
      const [page, hash] = href.split('#');
      if (page === 'index.html' && window.location.pathname.includes('index.html')) {
        // Same page, just change hash
        window.location.hash = hash;
      } else {
        // Different page
        window.location.href = href;
      }
    } else {
      // Direct page navigation
      window.location.href = href;
    }
  },

  // Switch to internal view (for main app)
  switchToView(viewName) {
    // Use UI.Navigation if available for view switching
    if (window.UI && window.UI.Navigation && typeof window.UI.Navigation.switchView === 'function') {
      window.UI.Navigation.switchView(viewName);
    } else {
      // Fallback to hash navigation
      if (viewName === 'dashboard') {
        window.location.hash = '';
      } else {
        window.location.hash = viewName;
      }
    }
  },

  // Setup event listeners for sync button
  setupEventListeners() {
    const syncBtn = window.UIUtils.DOM.get('#syncBtn');
    if (syncBtn && !syncBtn.hasAttribute('data-listener-attached')) {
      window.UIUtils.Events.on(syncBtn, 'click', this.handleSync.bind(this));
      syncBtn.setAttribute('data-listener-attached', 'true');
    }
  },

  // Handle sync button click
  async handleSync() {
    try {
      // Check if we're on the main app or settings page
      const isMainApp = window.location.pathname.includes('index.html') || window.location.pathname === '/';
      const isSettingsPage = window.location.pathname.includes('settings.html');

      if (isMainApp && window.app && typeof window.app.handleSync === 'function') {
        // Use main app's sync handler
        await window.app.handleSync();
      } else if (isSettingsPage && window.settingsPage && typeof window.settingsPage.handleSync === 'function') {
        // Use settings page's sync handler
        await window.settingsPage.handleSync();
      } else {
        // Generic sync handler
        await this.genericSync();
      }
    } catch (error) {
      console.error('Sync error:', error);
      if (window.Utils && window.Utils.Notify) {
        window.Utils.Notify.error('Sync failed: ' + error.message);
      } else {
        alert('Sync failed: ' + error.message);
      }
    }
  },

  // Generic sync implementation
  async genericSync() {
    try {
      if (!window.Config || !window.Config.googleSheets.enabled) {
        this.showMessage('Google Sheets sync is disabled. Enable it in settings to sync data.', 'warning');
        return;
      }

      if (!window.AuthManager || !window.AuthManager.isAuthenticatedUser()) {
        this.showMessage('Please authenticate with Google first in settings.', 'warning');
        return;
      }

      this.showMessage('Syncing data...', 'info');
      
      if (window.Sync && !window.Sync.isEnabled) {
        await window.Sync.init();
      }

      const result = await window.Sync.performSync({ force: true });
      
      if (result.success) {
        this.showMessage('Sync completed successfully!', 'success');
      } else {
        this.showMessage('Sync failed: ' + (result.error || 'Unknown error'), 'error');
      }
      
    } catch (error) {
      this.showMessage('Sync failed: ' + error.message, 'error');
    }
  },

  // Show message (fallback if Utils.Notify not available)
  showMessage(message, type = 'info') {
    if (window.Utils && window.Utils.Notify) {
      switch (type) {
        case 'success':
          window.Utils.Notify.success(message);
          break;
        case 'warning':
          window.Utils.Notify.warning(message);
          break;
        case 'error':
          window.Utils.Notify.error(message);
          break;
        default:
          window.Utils.Notify.info(message);
      }
    } else {
      // Fallback to console and alert
      console.log(`[${type.toUpperCase()}] ${message}`);
      if (type === 'error') {
        alert(message);
      }
    }
  },

  // Update active navigation item
  setActive(activeItem) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.view === activeItem) {
        item.classList.add('active');
      }
    });
  },

  // Initialize navigation for a page
  init(activeItem = 'dashboard') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.replace(activeItem);
      });
    } else {
      this.replace(activeItem);
    }
  }
};

// Auto-initialize based on current page (only if not manually initialized)
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit to see if manual initialization happens
  setTimeout(() => {
    // Only auto-initialize if navigation exists and hasn't been manually initialized
    if (document.querySelector('.nav') && !window.NavigationComponent._manuallyInitialized) {
      // Determine active item based on current page
      let activeItem = 'dashboard';
      
      if (window.location.pathname.includes('settings.html')) {
        activeItem = 'settings';
      } else if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        if (['volunteers', 'events', 'reports'].includes(hash)) {
          activeItem = hash;
        }
      }
      
      window.NavigationComponent.replace(activeItem);
    }
  }, 200);
});