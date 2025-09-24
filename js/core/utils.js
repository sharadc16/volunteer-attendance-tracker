/**
 * Common Utility Functions
 * Extended utilities that complement UIUtils
 */
window.Utils = {
  
  // DOM Utilities - Use UIUtils.DOM instead, keeping only for backward compatibility
  DOM: window.UIUtils ? window.UIUtils.DOM : {
    get(selector) { return document.querySelector(selector); },
    getAll(selector) { return document.querySelectorAll(selector); },
    create(tag, className = '', content = '') {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (content) element.textContent = content;
      return element;
    },
    show(element) { if (element) element.style.display = ''; },
    hide(element) { if (element) element.style.display = 'none'; },
    addClass(element, className) { if (element) element.classList.add(className); },
    removeClass(element, className) { if (element) element.classList.remove(className); },
    toggleClass(element, className) { if (element) element.classList.toggle(className); }
  },
  
  // Date Utilities
  Date: {
    format(date, type = 'datetime') {
      if (!date) return '';
      
      const d = new Date(date);
      const options = {
        date: { year: 'numeric', month: '2-digit', day: '2-digit' },
        time: { hour: '2-digit', minute: '2-digit' },
        datetime: { 
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit' 
        }
      };
      
      return d.toLocaleDateString('en-US', options[type] || options.datetime);
    },
    
    today() {
      return new Date().toISOString().split('T')[0];
    },
    
    isToday(date) {
      return this.format(date, 'date') === this.today();
    },
    
    daysBetween(date1, date2) {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
    },
    
    isValid(dateString) {
      const date = new Date(dateString);
      return date instanceof Date && !isNaN(date);
    }
  },
  
  // String Utilities
  String: {
    capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    truncate(str, length = 50) {
      return str.length > length ? str.substring(0, length) + '...' : str;
    },
    
    sanitize(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },
    
    generateId() {
      return 'id_' + Math.random().toString(36).substr(2, 9);
    }
  },
  
  // Event Utilities - Use UIUtils.Events instead, keeping only for backward compatibility
  Event: window.UIUtils ? {
    debounce: window.UIUtils.Events.debounce,
    throttle: window.UIUtils.Events.throttle,
    emit(eventName, data = null) {
      const event = new CustomEvent(eventName, { detail: data });
      document.dispatchEvent(event);
    },
    on(eventName, callback) {
      document.addEventListener(eventName, callback);
    }
  } : {
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },
    throttle(func, limit) {
      let inThrottle;
      return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
          func.apply(context, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },
    emit(eventName, data = null) {
      const event = new CustomEvent(eventName, { detail: data });
      document.dispatchEvent(event);
    },
    on(eventName, callback) {
      document.addEventListener(eventName, callback);
    }
  },
  
  // Validation Utilities
  Validate: {
    email(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    },
    
    phone(phone) {
      const re = /^\+?[\d\s\-\(\)]{10,}$/;
      return re.test(phone);
    },
    
    required(value) {
      return value !== null && value !== undefined && value.toString().trim() !== '';
    },
    
    minLength(value, min) {
      return value && value.toString().length >= min;
    }
  },
  
  // Storage Utilities
  Storage: {
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.error('Storage set error:', e);
        return false;
      }
    },
    
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (e) {
        console.error('Storage get error:', e);
        return defaultValue;
      }
    },
    
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        console.error('Storage remove error:', e);
        return false;
      }
    },
    
    clear() {
      try {
        localStorage.clear();
        return true;
      } catch (e) {
        console.error('Storage clear error:', e);
        return false;
      }
    }
  },
  
  // Array Utilities
  Array: {
    unique(arr, key = null) {
      if (key) {
        const seen = new Set();
        return arr.filter(item => {
          const value = item[key];
          if (seen.has(value)) return false;
          seen.add(value);
          return true;
        });
      }
      return [...new Set(arr)];
    },
    
    sortBy(arr, key, direction = 'asc') {
      return arr.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        if (direction === 'desc') {
          return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
        }
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      });
    },
    
    groupBy(arr, key) {
      return arr.reduce((groups, item) => {
        const group = item[key];
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
      }, {});
    }
  },
  
  // Loading States with enhanced state tracking
  Loading: {
    _isShowing: false,
    _showCount: 0,
    _hideTimeout: null,
    
    show(message = 'Loading...') {
      // Clear any pending hide timeout
      if (this._hideTimeout) {
        clearTimeout(this._hideTimeout);
        this._hideTimeout = null;
      }
      
      const overlay = Utils.DOM.get('#loadingOverlay');
      if (overlay) {
        const text = overlay.querySelector('p');
        if (text) {
          text.textContent = message;
        }
        
        // Use both CSS class and inline styles with !important for maximum compatibility
        Utils.DOM.addClass(overlay, 'active');
        overlay.style.setProperty('display', 'flex', 'important');
        overlay.style.setProperty('visibility', 'visible', 'important');
        overlay.style.setProperty('opacity', '1', 'important');
        
        this._isShowing = true;
        this._showCount++;
        
        console.log(`🔄 Loading: ${message}`);
      } else {
        console.error(`❌ Loading overlay not found`);
      }
    },
    
    hide() {
      console.log(`🔄 Utils.Loading.hide() called`);
      console.log(`🔄 Current state before hide:`, this.getState());
      
      const overlay = Utils.DOM.get('#loadingOverlay');
      if (overlay) {
        console.log(`🔄 Loading overlay found, applying hide styles`);
        
        // Log current styles before hiding
        console.log(`🔄 Current overlay styles before hide:`, {
          display: overlay.style.display,
          visibility: overlay.style.visibility,
          opacity: overlay.style.opacity,
          hasActiveClass: overlay.classList.contains('active')
        });
        
        // Remove both CSS class and inline styles with !important to override CSS
        Utils.DOM.removeClass(overlay, 'active');
        overlay.style.setProperty('display', 'none', 'important');
        overlay.style.setProperty('visibility', 'hidden', 'important');
        overlay.style.setProperty('opacity', '0', 'important');
        
        this._isShowing = false;
        
        console.log(`✅ Loading hidden - internal state updated`);
        console.log(`✅ Final overlay styles after hide:`, {
          display: overlay.style.display,
          visibility: overlay.style.visibility,
          opacity: overlay.style.opacity,
          hasActiveClass: overlay.classList.contains('active')
        });
        
        // Verify the hide worked
        setTimeout(() => {
          const computedStyle = getComputedStyle(overlay);
          const isStillVisible = computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';
          if (isStillVisible) {
            console.error(`❌ HIDE FAILED! Loading is still visible after hide attempt`);
            console.error(`❌ Computed styles:`, {
              display: computedStyle.display,
              visibility: computedStyle.visibility,
              opacity: computedStyle.opacity
            });
            // Auto-trigger force hide if normal hide fails
            console.log(`🚨 Auto-triggering forceHide() due to hide failure`);
            this.forceHide();
          } else {
            console.log(`✅ Hide verification passed - loading is properly hidden`);
          }
        }, 100);
        
      } else {
        console.error(`❌ Loading overlay not found with selector '#loadingOverlay'`);
      }
    },
    
    // Hide with delay to prevent flicker
    hideDelayed(delay = 100) {
      if (this._hideTimeout) {
        clearTimeout(this._hideTimeout);
      }
      
      this._hideTimeout = setTimeout(() => {
        this.hide();
        this._hideTimeout = null;
      }, delay);
    },
    
    // Force hide method for emergency situations
    forceHide() {
      console.log(`🚨 Utils.Loading.forceHide() called - NUCLEAR OPTION`);
      
      // Clear any pending timeouts
      if (this._hideTimeout) {
        console.log(`🚨 Clearing hide timeout`);
        clearTimeout(this._hideTimeout);
        this._hideTimeout = null;
      }
      
      // Find all possible loading overlays
      const selectors = [
        '#loadingOverlay',
        '.loading-overlay',
        '.loading',
        '[class*="loading"]'
      ];
      
      let hiddenCount = 0;
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`🚨 Found ${elements.length} elements matching "${selector}"`);
        
        elements.forEach((element, index) => {
          console.log(`🚨 Force hiding element ${index + 1}:`, element);
          
          // Log current state
          const computedStyle = getComputedStyle(element);
          console.log(`🚨 Element ${index + 1} current state:`, {
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            hasActiveClass: element.classList.contains('active')
          });
          
          // Apply nuclear hide
          element.classList.remove('active');
          element.style.setProperty('display', 'none', 'important');
          element.style.setProperty('visibility', 'hidden', 'important');
          element.style.setProperty('opacity', '0', 'important');
          element.style.setProperty('pointer-events', 'none', 'important');
          
          // Additional nuclear options
          element.style.setProperty('position', 'absolute', 'important');
          element.style.setProperty('left', '-9999px', 'important');
          element.style.setProperty('top', '-9999px', 'important');
          element.style.setProperty('z-index', '-1', 'important');
          
          hiddenCount++;
          
          console.log(`🚨 Element ${index + 1} after force hide:`, {
            display: element.style.display,
            visibility: element.style.visibility,
            opacity: element.style.opacity,
            left: element.style.left,
            top: element.style.top
          });
        });
      });
      
      this._isShowing = false;
      this._showCount = 0;
      
      console.log(`🚨 Force hide completed - ${hiddenCount} elements processed`);
      
      // Add nuclear CSS override to document
      const nuclearStyle = document.createElement('style');
      nuclearStyle.id = 'nuclear-loading-override';
      nuclearStyle.textContent = `
        #loadingOverlay,
        .loading-overlay,
        .loading,
        [class*="loading"],
        [id*="loading"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          position: absolute !important;
          left: -9999px !important;
          top: -9999px !important;
          z-index: -1 !important;
        }
      `;
      document.head.appendChild(nuclearStyle);
      console.log(`🚨 Nuclear CSS override added to document head`);
    },
    
    // Get current state
    getState() {
      const overlay = Utils.DOM.get('#loadingOverlay');
      if (!overlay) return { exists: false };
      
      const computedStyle = getComputedStyle(overlay);
      return {
        exists: true,
        isShowing: this._isShowing,
        showCount: this._showCount,
        display: overlay.style.display,
        visibility: overlay.style.visibility,
        opacity: overlay.style.opacity,
        computedDisplay: computedStyle.display,
        computedVisibility: computedStyle.visibility,
        computedOpacity: computedStyle.opacity,
        hasActiveClass: overlay.classList.contains('active'),
        isVisible: computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden'
      };
    }
  },
  
  // Notifications
  Notify: {
    success(message) {
      this.show(message, 'success');
    },
    
    error(message) {
      this.show(message, 'error');
    },
    
    info(message) {
      this.show(message, 'info');
    },
    
    show(message, type = 'info') {
      // Simple console notification for now
      // Can be enhanced with toast notifications later
      console.log(`[${type.toUpperCase()}] ${message}`);
      
      // Emit event for other components to handle
      Utils.Event.emit('notification', { message, type });
    }
  }
};