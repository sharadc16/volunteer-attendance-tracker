/**
 * Common UI Components and Interactions
 */
window.UI = {
  
  // Modal Management
  Modal: {
    current: null,
    
    show(title, content, actions = null) {
      const overlay = Utils.DOM.get('#modalOverlay');
      const modal = Utils.DOM.get('#modal');
      const titleEl = Utils.DOM.get('#modalTitle');
      const bodyEl = Utils.DOM.get('#modalBody');
      const footerEl = Utils.DOM.get('#modalFooter');
      
      if (!overlay || !modal) return;
      
      // Set content
      titleEl.textContent = title;
      bodyEl.innerHTML = content;
      
      // Set actions
      if (actions) {
        footerEl.innerHTML = '';
        actions.forEach(action => {
          const btn = Utils.DOM.create('button', {
            className: `btn ${action.class || 'btn-secondary'}`
          }, action.text);
          btn.onclick = action.handler;
          footerEl.appendChild(btn);
        });
      } else {
        // Default actions
        const cancelBtn = Utils.DOM.get('#modalCancel');
        const confirmBtn = Utils.DOM.get('#modalConfirm');
        if (cancelBtn) cancelBtn.style.display = '';
        if (confirmBtn) confirmBtn.style.display = '';
      }
      
      // Show modal
      Utils.DOM.addClass(overlay, 'active');
      this.current = overlay;
      
      // Focus first input if any
      const firstInput = bodyEl.querySelector('input, select, textarea');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    },
    
    hide() {
      if (this.current) {
        Utils.DOM.removeClass(this.current, 'active');
        this.current = null;
      }
    },
    
    confirm(title, message, onConfirm, onCancel = null) {
      this.show(title, `<p>${message}</p>`, [
        {
          text: 'Cancel',
          class: 'btn-secondary',
          handler: () => {
            this.hide();
            if (onCancel) onCancel();
          }
        },
        {
          text: 'Confirm',
          class: 'btn-primary',
          handler: () => {
            this.hide();
            onConfirm();
          }
        }
      ]);
    },
    
    alert(title, message, onClose = null) {
      this.show(title, `<p>${message}</p>`, [
        {
          text: 'Close',
          class: 'btn-primary',
          handler: () => {
            this.hide();
            if (onClose) onClose();
          }
        }
      ]);
    }
  },
  
  // Form Helpers
  Form: {
    create(fields, onSubmit) {
      const form = Utils.DOM.create('form', { className: 'form' });
      
      fields.forEach(field => {
        const group = Utils.DOM.create('div', { className: 'form-group' });
        
        // Label
        if (field.label) {
          const label = Utils.DOM.create('label', { className: 'form-label' }, field.label);
          if (field.required) label.innerHTML += ' <span class="required">*</span>';
          group.appendChild(label);
        }
        
        // Input
        let input;
        switch (field.type) {
          case 'select':
            input = Utils.DOM.create('select', { className: 'form-input' });
            field.options.forEach(option => {
              const opt = Utils.DOM.create('option', {});
              opt.value = option.value;
              opt.textContent = option.text;
              if (option.selected) opt.selected = true;
              input.appendChild(opt);
            });
            break;
          case 'textarea':
            input = Utils.DOM.create('textarea', { className: 'form-input' });
            input.rows = field.rows || 3;
            break;
          default:
            input = Utils.DOM.create('input', { className: 'form-input' });
            input.type = field.type || 'text';
        }
        
        input.name = field.name;
        input.placeholder = field.placeholder || '';
        input.required = field.required || false;
        if (field.value) input.value = field.value;
        
        group.appendChild(input);
        
        // Help text
        if (field.help) {
          const help = Utils.DOM.create('small', { className: 'form-help' }, field.help);
          group.appendChild(help);
        }
        
        form.appendChild(group);
      });
      
      // Submit handler
      form.onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        onSubmit(data);
      };
      
      return form;
    },
    
    validate(form) {
      const inputs = form.querySelectorAll('input, select, textarea');
      let isValid = true;
      
      inputs.forEach(input => {
        const value = input.value.trim();
        let error = '';
        
        // Required validation
        if (input.required && !value) {
          error = 'This field is required';
          isValid = false;
        }
        
        // Email validation
        if (input.type === 'email' && value && !Utils.Validate.email(value)) {
          error = 'Please enter a valid email address';
          isValid = false;
        }
        
        // Phone validation
        if (input.type === 'tel' && value && !Utils.Validate.phone(value)) {
          error = 'Please enter a valid phone number';
          isValid = false;
        }
        
        // Show/hide error
        this.showFieldError(input, error);
      });
      
      return isValid;
    },
    
    showFieldError(input, error) {
      // Remove existing error
      const existingError = input.parentNode.querySelector('.field-error');
      if (existingError) existingError.remove();
      
      // Add error class
      if (error) {
        Utils.DOM.addClass(input, 'error');
        const errorEl = Utils.DOM.create('div', { className: 'field-error' }, error);
        input.parentNode.appendChild(errorEl);
      } else {
        Utils.DOM.removeClass(input, 'error');
      }
    }
  },
  
  // Navigation (View switching only - navigation rendering handled by NavigationComponent)
  Navigation: {
    init() {
      // Setup view switching for navigation items (after NavigationComponent renders them)
      this.setupViewSwitching();
      
      // Handle browser back/forward buttons
      window.addEventListener('hashchange', () => {
        this.handleHashChange();
      });
      
      // Handle initial hash on page load
      this.handleHashChange();
    },

    // Setup view switching for navigation items
    setupViewSwitching() {
      // NavigationComponent now handles click events directly
      // This method is kept for compatibility but no longer sets up handlers
      console.log('View switching handled by NavigationComponent');
    },
    
    switchView(viewName, updateHash = true) {
      // Update navigation using NavigationComponent
      if (window.NavigationComponent) {
        window.NavigationComponent.setActive(viewName);
      } else {
        // Fallback to manual update
        Utils.DOM.getAll('.nav-item').forEach(item => {
          Utils.DOM.removeClass(item, 'active');
        });
        
        const activeNavItem = Utils.DOM.get(`[data-view="${viewName}"]`);
        if (activeNavItem) {
          Utils.DOM.addClass(activeNavItem, 'active');
        }
      }
      
      // Update views
      Utils.DOM.getAll('.view').forEach(view => {
        Utils.DOM.removeClass(view, 'active');
      });
      
      const activeView = Utils.DOM.get(`#${viewName}-view`);
      if (activeView) {
        Utils.DOM.addClass(activeView, 'active');
        
        // Update URL hash
        if (updateHash) {
          window.location.hash = viewName === 'dashboard' ? '' : viewName;
        }
        
        // Update page title
        document.title = `${Utils.String.capitalize(viewName)} - Gurukul Attendance`;
        
        // Emit view change event
        Utils.Event.emit('viewChanged', { view: viewName });
      }
    },
    
    handleHashChange() {
      const hash = window.location.hash.substring(1); // Remove #
      const view = hash || 'dashboard'; // Default to dashboard
      
      // Validate view exists
      const validViews = ['dashboard', 'volunteers', 'events', 'reports'];
      if (validViews.includes(view)) {
        this.switchView(view, false); // Don't update hash to avoid loop
      } else {
        // Invalid hash, redirect to dashboard
        this.switchView('dashboard');
      }
    }
  },
  
  // Cards and Lists
  Card: {
    create(title, content, actions = []) {
      const card = Utils.DOM.create('div', { className: 'card' });
      
      // Header
      if (title) {
        const header = Utils.DOM.create('div', { className: 'card-header' });
        const titleEl = Utils.DOM.create('h3', {}, title);
        header.appendChild(titleEl);
        
        if (actions.length > 0) {
          const actionsEl = Utils.DOM.create('div', { className: 'card-actions' });
          actions.forEach(action => {
            const btn = Utils.DOM.create('button', {
              className: `btn ${action.class || 'btn-secondary'}`
            }, action.text);
            btn.onclick = action.handler;
            actionsEl.appendChild(btn);
          });
          header.appendChild(actionsEl);
        }
        
        card.appendChild(header);
      }
      
      // Body
      const body = Utils.DOM.create('div', { className: 'card-body' });
      if (typeof content === 'string') {
        body.innerHTML = content;
      } else {
        body.appendChild(content);
      }
      card.appendChild(body);
      
      return card;
    }
  },
  
  // Loading States
  Loading: {
    show(container, message = 'Loading...') {
      if (typeof container === 'string') {
        container = Utils.DOM.get(container);
      }
      
      if (container) {
        container.innerHTML = `
          <div class="loading">
            <div class="spinner"></div>
            <p>${message}</p>
          </div>
        `;
      }
    },
    
    hide(container) {
      if (typeof container === 'string') {
        container = Utils.DOM.get(container);
      }
      
      if (container) {
        const loading = container.querySelector('.loading');
        if (loading) loading.remove();
      }
    }
  },
  
  // Empty States
  Empty: {
    show(container, icon, title, message, action = null) {
      if (typeof container === 'string') {
        container = Utils.DOM.get(container);
      }
      
      if (container) {
        let html = `
          <div class="empty-state">
            <span class="empty-icon">${icon}</span>
            <h3>${title}</h3>
            <p>${message}</p>
        `;
        
        if (action) {
          html += `<button class="btn btn-primary" onclick="${action.handler}">${action.text}</button>`;
        }
        
        html += '</div>';
        container.innerHTML = html;
      }
    }
  },
  
  // Feedback
  Feedback: {
    show(container, message, type = 'info') {
      if (typeof container === 'string') {
        container = Utils.DOM.get(container);
      }
      
      if (container) {
        container.innerHTML = `<div class="scan-feedback ${type}">${message}</div>`;
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
          if (container.innerHTML.includes(message)) {
            container.innerHTML = '';
          }
        }, 3000);
      }
    },
    
    clear(container) {
      if (typeof container === 'string') {
        container = Utils.DOM.get(container);
      }
      
      if (container) {
        container.innerHTML = '';
      }
    }
  }
};