/**
 * Reusable UI Utilities
 * Common UI functions and helpers used across components
 */
window.UIUtils = {
  
  /**
   * DOM manipulation utilities
   */
  DOM: {
    /**
     * Get element by selector
     */
    get(selector) {
      return document.querySelector(selector);
    },
    
    /**
     * Get all elements by selector
     */
    getAll(selector) {
      return document.querySelectorAll(selector);
    },
    
    /**
     * Create element with attributes
     */
    create(tag, attributes = {}, content = '') {
      const element = document.createElement(tag);
      
      Object.entries(attributes).forEach(([key, value]) => {
        try {
          if (key === 'className') {
            element.className = value || '';
          } else if (key === 'innerHTML') {
            element.innerHTML = value || '';
          } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
          } else if (value !== null && value !== undefined) {
            // Validate attribute name and value
            const validKey = String(key).replace(/[^a-zA-Z0-9\-_]/g, '');
            const validValue = String(value).replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
            if (validKey && validValue) {
              element.setAttribute(validKey, validValue);
            }
          }
        } catch (error) {
          console.warn(`Failed to set attribute ${key}=${value}:`, error);
        }
      });
      
      if (content) {
        element.textContent = content;
      }
      
      return element;
    },
    
    /**
     * Add class to element
     */
    addClass(element, className) {
      if (element && className) {
        element.classList.add(className);
      }
    },
    
    /**
     * Remove class from element
     */
    removeClass(element, className) {
      if (element && className) {
        element.classList.remove(className);
      }
    },
    
    /**
     * Toggle class on element
     */
    toggleClass(element, className) {
      if (element && className) {
        element.classList.toggle(className);
      }
    },
    
    /**
     * Check if element has class
     */
    hasClass(element, className) {
      return element && className && element.classList.contains(className);
    },
    
    /**
     * Show element
     */
    show(element) {
      if (element) {
        element.style.display = '';
        this.removeClass(element, 'hidden');
      }
    },
    
    /**
     * Hide element
     */
    hide(element) {
      if (element) {
        element.style.display = 'none';
        this.addClass(element, 'hidden');
      }
    },
    
    /**
     * Toggle element visibility
     */
    toggle(element) {
      if (element) {
        if (element.style.display === 'none' || this.hasClass(element, 'hidden')) {
          this.show(element);
        } else {
          this.hide(element);
        }
      }
    }
  },
  
  /**
   * Event handling utilities
   */
  Events: {
    /**
     * Add event listener with error handling
     */
    on(element, event, handler, options = {}) {
      if (element && event && handler) {
        const wrappedHandler = (e) => {
          try {
            handler(e);
          } catch (error) {
            console.error(`Error in ${event} handler:`, error);
          }
        };
        
        element.addEventListener(event, wrappedHandler, options);
        return wrappedHandler;
      }
    },
    
    /**
     * Remove event listener
     */
    off(element, event, handler, options = {}) {
      if (element && event && handler) {
        element.removeEventListener(event, handler, options);
      }
    },
    
    /**
     * Trigger custom event
     */
    trigger(element, eventName, detail = {}) {
      if (element && eventName) {
        const event = new CustomEvent(eventName, { detail });
        element.dispatchEvent(event);
      }
    },
    
    /**
     * Debounce function calls
     */
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },
    
    /**
     * Throttle function calls
     */
    throttle(func, limit) {
      let inThrottle;
      return function executedFunction(...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    }
  },
  
  /**
   * Animation utilities
   */
  Animation: {
    /**
     * Fade in element
     */
    fadeIn(element, duration = 300) {
      if (!element) return;
      
      element.style.opacity = '0';
      element.style.display = '';
      
      const start = performance.now();
      
      const animate = (currentTime) => {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        
        element.style.opacity = progress;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    },
    
    /**
     * Fade out element
     */
    fadeOut(element, duration = 300) {
      if (!element) return;
      
      const start = performance.now();
      const startOpacity = parseFloat(element.style.opacity) || 1;
      
      const animate = (currentTime) => {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        
        element.style.opacity = startOpacity * (1 - progress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          element.style.display = 'none';
        }
      };
      
      requestAnimationFrame(animate);
    },
    
    /**
     * Slide down element
     */
    slideDown(element, duration = 300) {
      if (!element) return;
      
      element.style.height = '0';
      element.style.overflow = 'hidden';
      element.style.display = '';
      
      const targetHeight = element.scrollHeight;
      const start = performance.now();
      
      const animate = (currentTime) => {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        
        element.style.height = (targetHeight * progress) + 'px';
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          element.style.height = '';
          element.style.overflow = '';
        }
      };
      
      requestAnimationFrame(animate);
    },
    
    /**
     * Slide up element
     */
    slideUp(element, duration = 300) {
      if (!element) return;
      
      const startHeight = element.offsetHeight;
      const start = performance.now();
      
      element.style.overflow = 'hidden';
      
      const animate = (currentTime) => {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        
        element.style.height = (startHeight * (1 - progress)) + 'px';
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          element.style.display = 'none';
          element.style.height = '';
          element.style.overflow = '';
        }
      };
      
      requestAnimationFrame(animate);
    }
  },
  
  /**
   * Form utilities
   */
  Form: {
    /**
     * Get form data as object
     */
    getData(form) {
      if (!form) return {};
      
      const formData = new FormData(form);
      const data = {};
      
      for (let [key, value] of formData.entries()) {
        if (data[key]) {
          // Handle multiple values (checkboxes, etc.)
          if (Array.isArray(data[key])) {
            data[key].push(value);
          } else {
            data[key] = [data[key], value];
          }
        } else {
          data[key] = value;
        }
      }
      
      return data;
    },
    
    /**
     * Set form data from object
     */
    setData(form, data) {
      if (!form || !data) return;
      
      Object.entries(data).forEach(([key, value]) => {
        const element = form.querySelector(`[name="${key}"]`);
        if (element) {
          if (element.type === 'checkbox' || element.type === 'radio') {
            element.checked = Boolean(value);
          } else {
            element.value = value;
          }
        }
      });
    },
    
    /**
     * Validate form field
     */
    validateField(field, rules = {}) {
      if (!field) return { valid: true, errors: [] };
      
      const errors = [];
      const value = field.value.trim();
      
      // Required validation
      if (rules.required && !value) {
        errors.push('This field is required');
      }
      
      // Min length validation
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`Minimum length is ${rules.minLength} characters`);
      }
      
      // Max length validation
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`Maximum length is ${rules.maxLength} characters`);
      }
      
      // Email validation
      if (rules.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push('Please enter a valid email address');
      }
      
      // Custom validation
      if (rules.custom && typeof rules.custom === 'function') {
        const customResult = rules.custom(value);
        if (customResult !== true) {
          errors.push(customResult || 'Invalid value');
        }
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    }
  },
  
  /**
   * Storage utilities
   */
  Storage: {
    /**
     * Get item from localStorage with JSON parsing
     */
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        // Only log detailed error for non-JSON parse errors
        if (error instanceof SyntaxError) {
          console.warn(`Corrupted data found in storage for key '${key}', cleaning up automatically`);
        } else {
          console.error(`Error getting storage item ${key}:`, error);
        }
        
        // Auto-cleanup corrupted data
        try {
          localStorage.removeItem(key);
          console.log(`Automatically removed corrupted storage item: ${key}`);
        } catch (cleanupError) {
          console.error(`Error cleaning up corrupted item ${key}:`, cleanupError);
        }
        
        return defaultValue;
      }
    },
    
    /**
     * Set item in localStorage with JSON stringification
     */
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error(`Error setting storage item ${key}:`, error);
        return false;
      }
    },
    
    /**
     * Remove item from localStorage
     */
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error(`Error removing storage item ${key}:`, error);
        return false;
      }
    },
    
    /**
     * Clear all localStorage
     */
    clear() {
      try {
        localStorage.clear();
        return true;
      } catch (error) {
        console.error('Error clearing storage:', error);
        return false;
      }
    }
  }
};