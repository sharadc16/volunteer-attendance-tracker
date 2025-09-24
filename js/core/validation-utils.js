/**
 * Reusable Validation Utilities
 * Common validation functions used across the application
 */
class ValidationUtils {
  
  /**
   * Email validation
   */
  static isValidEmail(email) {
    if (typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Date validation (supports multiple formats)
   */
  static isValidDate(dateValue) {
    if (!dateValue) return false;
    
    try {
      const date = new Date(dateValue);
      return !isNaN(date.getTime());
    } catch (error) {
      return false;
    }
  }

  /**
   * Time validation (HH:MM format)
   */
  static isValidTime(timeValue) {
    if (typeof timeValue !== 'string') return false;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeValue);
  }

  /**
   * DateTime validation (ISO format)
   */
  static isValidDateTime(dateTimeValue) {
    if (!dateTimeValue) return false;
    
    try {
      const date = new Date(dateTimeValue);
      return !isNaN(date.getTime()) && dateTimeValue.includes('T');
    } catch (error) {
      return false;
    }
  }

  /**
   * URL validation
   */
  static isValidUrl(url) {
    if (typeof url !== 'string') return false;
    
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Phone number validation (basic)
   */
  static isValidPhone(phone) {
    if (typeof phone !== 'string') return false;
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  /**
   * Required field validation
   */
  static isRequired(value) {
    return value !== null && value !== undefined && value !== '';
  }

  /**
   * String length validation
   */
  static isValidLength(value, minLength = 0, maxLength = Infinity) {
    if (typeof value !== 'string') return false;
    return value.length >= minLength && value.length <= maxLength;
  }

  /**
   * Numeric validation
   */
  static isValidNumber(value, min = -Infinity, max = Infinity) {
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
  }

  /**
   * Array validation
   */
  static isValidArray(value, minLength = 0, maxLength = Infinity) {
    return Array.isArray(value) && 
           value.length >= minLength && 
           value.length <= maxLength;
  }

  /**
   * Object validation
   */
  static isValidObject(value, requiredKeys = []) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }
    
    return requiredKeys.every(key => key in value);
  }

  /**
   * Validate multiple fields with rules
   */
  static validateFields(data, rules) {
    const result = {
      isValid: true,
      errors: {},
      warnings: {}
    };

    Object.keys(rules).forEach(field => {
      const value = data[field];
      const fieldRules = rules[field];
      const fieldResult = this.validateField(value, fieldRules, field);
      
      if (!fieldResult.isValid) {
        result.isValid = false;
        result.errors[field] = fieldResult.errors;
      }
      
      if (fieldResult.warnings.length > 0) {
        result.warnings[field] = fieldResult.warnings;
      }
    });

    return result;
  }

  /**
   * Validate single field with rules
   */
  static validateField(value, rules, fieldName = 'field') {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Required validation
    if (rules.required && !this.isRequired(value)) {
      result.isValid = false;
      result.errors.push(`${fieldName} is required`);
      return result; // Skip other validations if required field is missing
    }

    // Skip other validations if value is empty and not required
    if (!this.isRequired(value) && !rules.required) {
      return result;
    }

    // Type-specific validations
    if (rules.type) {
      switch (rules.type) {
        case 'email':
          if (!this.isValidEmail(value)) {
            result.isValid = false;
            result.errors.push(`${fieldName} must be a valid email address`);
          }
          break;
        case 'date':
          if (!this.isValidDate(value)) {
            result.isValid = false;
            result.errors.push(`${fieldName} must be a valid date`);
          }
          break;
        case 'time':
          if (!this.isValidTime(value)) {
            result.isValid = false;
            result.errors.push(`${fieldName} must be a valid time (HH:MM)`);
          }
          break;
        case 'datetime':
          if (!this.isValidDateTime(value)) {
            result.isValid = false;
            result.errors.push(`${fieldName} must be a valid datetime`);
          }
          break;
        case 'url':
          if (!this.isValidUrl(value)) {
            result.isValid = false;
            result.errors.push(`${fieldName} must be a valid URL`);
          }
          break;
        case 'phone':
          if (!this.isValidPhone(value)) {
            result.isValid = false;
            result.errors.push(`${fieldName} must be a valid phone number`);
          }
          break;
        case 'number':
          if (!this.isValidNumber(value, rules.min, rules.max)) {
            result.isValid = false;
            result.errors.push(`${fieldName} must be a valid number${rules.min !== undefined ? ` (min: ${rules.min})` : ''}${rules.max !== undefined ? ` (max: ${rules.max})` : ''}`);
          }
          break;
      }
    }

    // Length validation
    if (rules.minLength !== undefined || rules.maxLength !== undefined) {
      if (!this.isValidLength(value, rules.minLength, rules.maxLength)) {
        result.isValid = false;
        result.errors.push(`${fieldName} length must be between ${rules.minLength || 0} and ${rules.maxLength || 'unlimited'} characters`);
      }
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      result.isValid = false;
      result.errors.push(`${fieldName} format is invalid`);
    }

    // Custom validation function
    if (rules.custom && typeof rules.custom === 'function') {
      const customResult = rules.custom(value, fieldName);
      if (customResult !== true) {
        result.isValid = false;
        result.errors.push(customResult || `${fieldName} failed custom validation`);
      }
    }

    return result;
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(value) {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/[<>]/g, '');
  }

  /**
   * Normalize email
   */
  static normalizeEmail(email) {
    if (typeof email !== 'string') return '';
    return email.toLowerCase().trim();
  }

  /**
   * Format date for display
   */
  static formatDate(dateValue, format = 'YYYY-MM-DD') {
    if (!this.isValidDate(dateValue)) return '';
    
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    switch (format) {
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      default:
        return date.toLocaleDateString();
    }
  }

  /**
   * Format time for display
   */
  static formatTime(timeValue, format = '24h') {
    if (!timeValue) return '';
    
    try {
      const [hours, minutes] = timeValue.split(':');
      const hour24 = parseInt(hours);
      const min = parseInt(minutes);
      
      if (format === '12h') {
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
        const ampm = hour24 >= 12 ? 'PM' : 'AM';
        return `${hour12}:${String(min).padStart(2, '0')} ${ampm}`;
      } else {
        return `${String(hour24).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      }
    } catch (error) {
      return timeValue;
    }
  }
}

// Global access
window.ValidationUtils = ValidationUtils;

console.log('ValidationUtils initialized');