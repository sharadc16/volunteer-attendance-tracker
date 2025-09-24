/**
 * Shared Header Component
 * Provides consistent header across all pages
 */
window.HeaderComponent = {
  
  // Header configuration
  config: {
    logo: {
      src: 'https://gurukulweb.azurewebsites.net/Images/GurukulLogoShadow.png',
      alt: 'Gurukul'
    },
    defaultTitle: 'Gurukul Attendance'
  },

  // Generate header HTML
  generateHTML(title = null) {
    const pageTitle = title || this.config.defaultTitle;
    
    return `
      <header class="header">
        <button class="menu-btn" id="menuBtn" aria-label="Toggle menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
        
        <div class="header-title">
          <img src="${this.config.logo.src}" alt="${this.config.logo.alt}" class="logo">
          <h1>${pageTitle}</h1>
        </div>
        
        <div class="header-actions">
          <!-- Header actions removed - moved to nav -->
        </div>
      </header>
    `;
  },

  // Render header into a container
  render(containerId, title = null) {
    const container = document.getElementById(containerId) || document.querySelector(containerId);
    if (container) {
      container.innerHTML = this.generateHTML(title);
    } else {
      console.error('Header container not found:', containerId);
    }
  },

  // Replace existing header
  replace(title = null) {
    const existingHeader = document.querySelector('.header');
    if (existingHeader) {
      existingHeader.outerHTML = this.generateHTML(title);
    } else {
      console.error('Existing header not found');
    }
  },

  // Update header title
  updateTitle(title) {
    const titleElement = document.querySelector('.header-title h1');
    if (titleElement) {
      titleElement.textContent = title;
    }
  },

  // Initialize header for a page
  init(title = null) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.replace(title);
      });
    } else {
      this.replace(title);
    }
  }
};