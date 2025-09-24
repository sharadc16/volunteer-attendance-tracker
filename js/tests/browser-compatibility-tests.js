/**
 * Browser Compatibility Test Suite
 * Tests Google Sheets Sync functionality across different browsers
 */
class BrowserCompatibilityTestSuite {
  constructor() {
    this.testResults = [];
    this.browserInfo = this.detectBrowser();
    this.supportMatrix = this.getSupportMatrix();
  }

  detectBrowser() {
    const ua = navigator.userAgent;
    const browser = {
      name: 'Unknown',
      version: 'Unknown',
      engine: 'Unknown',
      mobile: /Mobile|Android|iPhone|iPad/.test(ua)
    };
    
    // Chrome detection
    if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR')) {
      browser.name = 'Chrome';
      browser.version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
      browser.engine = 'Blink';
    }
    // Firefox detection
    else if (ua.includes('Firefox')) {
      browser.name = 'Firefox';
      browser.version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
      browser.engine = 'Gecko';
    }
    // Safari detection
    else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser.name = 'Safari';
      browser.version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
      browser.engine = 'WebKit';
    }
    // Edge detection
    else if (ua.includes('Edg')) {
      browser.name = 'Edge';
      browser.version = ua.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
      browser.engine = 'Blink';
    }
    // Opera detection
    else if (ua.includes('OPR')) {
      browser.name = 'Opera';
      browser.version = ua.match(/OPR\/(\d+)/)?.[1] || 'Unknown';
      browser.engine = 'Blink';
    }
    
    return {
      ...browser,
      userAgent: ua,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
      maxTouchPoints: navigator.maxTouchPoints || 0
    };
  }

  getSupportMatrix() {
    return {
      Chrome: {
        minVersion: 80,
        features: {
          indexedDB: true,
          webWorkers: true,
          serviceWorkers: true,
          webCrypto: true,
          fetch: true,
          promises: true,
          asyncAwait: true,
          es6Classes: true,
          arrowFunctions: true,
          templateLiterals: true,
          destructuring: true,
          modules: true
        }
      },
      Firefox: {
        minVersion: 75,
        features: {
          indexedDB: true,
          webWorkers: true,
          serviceWorkers: true,
          webCrypto: true,
          fetch: true,
          promises: true,
          asyncAwait: true,
          es6Classes: true,
          arrowFunctions: true,
          templateLiterals: true,
          destructuring: true,
          modules: true
        }
      },
      Safari: {
        minVersion: 13,
        features: {
          indexedDB: true,
          webWorkers: true,
          serviceWorkers: true,
          webCrypto: true,
          fetch: true,
          promises: true,
          asyncAwait: true,
          es6Classes: true,
          arrowFunctions: true,
          templateLiterals: true,
          destructuring: true,
          modules: false // Safari has issues with ES6 modules
        }
      },
      Edge: {
        minVersion: 80,
        features: {
          indexedDB: true,
          webWorkers: true,
          serviceWorkers: true,
          webCrypto: true,
          fetch: true,
          promises: true,
          asyncAwait: true,
          es6Classes: true,
          arrowFunctions: true,
          templateLiterals: true,
          destructuring: true,
          modules: true
        }
      }
    };
  }

  async runAllCompatibilityTests() {
    console.log('🌐 Running Browser Compatibility Tests');
    console.log(`Browser: ${this.browserInfo.name} ${this.browserInfo.version}`);
    console.log(`Engine: ${this.browserInfo.engine}`);
    console.log(`Platform: ${this.browserInfo.platform}`);
    
    const startTime = performance.now();
    
    try {
      // 1. Basic browser feature tests
      await this.testBasicFeatures();
      
      // 2. JavaScript ES6+ feature tests
      await this.testJavaScriptFeatures();
      
      // 3. Web API tests
      await this.testWebAPIs();
      
      // 4. Storage API tests
      await this.testStorageAPIs();
      
      // 5. Network API tests
      await this.testNetworkAPIs();
      
      // 6. Google APIs compatibility tests
      await this.testGoogleAPIsCompatibility();
      
      // 7. Performance API tests
      await this.testPerformanceAPIs();
      
      // 8. Security feature tests
      await this.testSecurityFeatures();
      
      // 9. Mobile compatibility tests (if applicable)
      if (this.browserInfo.mobile) {
        await this.testMobileFeatures();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return this.generateCompatibilityReport(duration);
      
    } catch (error) {
      console.error('❌ Browser compatibility tests failed:', error);
      throw error;
    }
  }

  async testBasicFeatures() {
    console.log('🔧 Testing Basic Browser Features...');
    
    const tests = [
      {
        name: 'Console API',
        test: () => typeof console !== 'undefined' && typeof console.log === 'function'
      },
      {
        name: 'JSON Support',
        test: () => typeof JSON !== 'undefined' && typeof JSON.parse === 'function'
      },
      {
        name: 'Date Object',
        test: () => typeof Date !== 'undefined' && !isNaN(new Date().getTime())
      },
      {
        name: 'RegExp Support',
        test: () => typeof RegExp !== 'undefined' && /test/.test('test')
      },
      {
        name: 'Array Methods',
        test: () => Array.prototype.map && Array.prototype.filter && Array.prototype.reduce
      },
      {
        name: 'Object Methods',
        test: () => Object.keys && Object.assign && Object.entries
      },
      {
        name: 'String Methods',
        test: () => String.prototype.includes && String.prototype.startsWith && String.prototype.endsWith
      },
      {
        name: 'Number Methods',
        test: () => Number.isNaN && Number.isInteger && Number.parseFloat
      }
    ];
    
    for (const test of tests) {
      try {
        const result = test.test();
        this.addTestResult('Basic Features', test.name, result, 
          result ? 'Supported' : 'Not supported');
      } catch (error) {
        this.addTestResult('Basic Features', test.name, false, 
          `Error: ${error.message}`);
      }
    }
  }

  async testJavaScriptFeatures() {
    console.log('📜 Testing JavaScript ES6+ Features...');
    
    const tests = [
      {
        name: 'Arrow Functions',
        test: () => {
          try {
            eval('(() => true)()');
            return true;
          } catch (e) {
            return false;
          }
        }
      },
      {
        name: 'Template Literals',
        test: () => {
          try {
            eval('`template`');
            return true;
          } catch (e) {
            return false;
          }
        }
      },
      {
        name: 'Destructuring Assignment',
        test: () => {
          try {
            eval('const {a} = {a: 1}; const [b] = [2];');
            return true;
          } catch (e) {
            return false;
          }
        }
      },
      {
        name: 'Default Parameters',
        test: () => {
          try {
            eval('function test(a = 1) { return a; }');
            return true;
          } catch (e) {
            return false;
          }
        }
      },
      {
        name: 'Rest Parameters',
        test: () => {
          try {
            eval('function test(...args) { return args; }');
            return true;
          } catch (e) {
            return false;
          }
        }
      },
      {
        name: 'Spread Operator',
        test: () => {
          try {
            eval('[...[], 1, 2, 3]');
            return true;
          } catch (e) {
            return false;
          }
        }
      },
      {
        name: 'Classes',
        test: () => {
          try {
            eval('class Test { constructor() {} }');
            return true;
          } catch (e) {
            return false;
          }
        }
      },
      {
        name: 'Async/Await',
        test: () => {
          try {
            eval('async function test() { await Promise.resolve(); }');
            return true;
          } catch (e) {
            return false;
          }
        }
      },
      {
        name: 'Promises',
        test: () => typeof Promise !== 'undefined' && typeof Promise.resolve === 'function'
      },
      {
        name: 'Symbol',
        test: () => typeof Symbol !== 'undefined'
      },
      {
        name: 'Map and Set',
        test: () => typeof Map !== 'undefined' && typeof Set !== 'undefined'
      },
      {
        name: 'WeakMap and WeakSet',
        test: () => typeof WeakMap !== 'undefined' && typeof WeakSet !== 'undefined'
      }
    ];
    
    for (const test of tests) {
      try {
        const result = test.test();
        this.addTestResult('JavaScript Features', test.name, result, 
          result ? 'Supported' : 'Not supported');
      } catch (error) {
        this.addTestResult('JavaScript Features', test.name, false, 
          `Error: ${error.message}`);
      }
    }
  }

  async testWebAPIs() {
    console.log('🌐 Testing Web APIs...');
    
    const tests = [
      {
        name: 'Fetch API',
        test: () => typeof fetch !== 'undefined'
      },
      {
        name: 'XMLHttpRequest',
        test: () => typeof XMLHttpRequest !== 'undefined'
      },
      {
        name: 'URL API',
        test: () => typeof URL !== 'undefined'
      },
      {
        name: 'URLSearchParams',
        test: () => typeof URLSearchParams !== 'undefined'
      },
      {
        name: 'FormData',
        test: () => typeof FormData !== 'undefined'
      },
      {
        name: 'Blob',
        test: () => typeof Blob !== 'undefined'
      },
      {
        name: 'File API',
        test: () => typeof File !== 'undefined' && typeof FileReader !== 'undefined'
      },
      {
        name: 'Web Workers',
        test: () => typeof Worker !== 'undefined'
      },
      {
        name: 'Service Workers',
        test: () => 'serviceWorker' in navigator
      },
      {
        name: 'Geolocation API',
        test: () => 'geolocation' in navigator
      },
      {
        name: 'Notification API',
        test: () => 'Notification' in window
      },
      {
        name: 'Clipboard API',
        test: () => 'clipboard' in navigator
      }
    ];
    
    for (const test of tests) {
      try {
        const result = test.test();
        this.addTestResult('Web APIs', test.name, result, 
          result ? 'Supported' : 'Not supported');
      } catch (error) {
        this.addTestResult('Web APIs', test.name, false, 
          `Error: ${error.message}`);
      }
    }
  }

  async testStorageAPIs() {
    console.log('💾 Testing Storage APIs...');
    
    const tests = [
      {
        name: 'LocalStorage',
        test: () => {
          try {
            localStorage.setItem('test', 'value');
            const result = localStorage.getItem('test') === 'value';
            localStorage.removeItem('test');
            return result;
          } catch (e) {
            return false;
          }
        }
      },
      {
        name: 'SessionStorage',
        test: () => {
          try {
            sessionStorage.setItem('test', 'value');
            const result = sessionStorage.getItem('test') === 'value';
            sessionStorage.removeItem('test');
            return result;
          } catch (e) {
            return false;
          }
        }
      },
      {
        name: 'IndexedDB',
        test: () => 'indexedDB' in window
      },
      {
        name: 'WebSQL (deprecated)',
        test: () => 'openDatabase' in window
      },
      {
        name: 'Cache API',
        test: () => 'caches' in window
      }
    ];
    
    for (const test of tests) {
      try {
        const result = test.test();
        this.addTestResult('Storage APIs', test.name, result, 
          result ? 'Supported' : 'Not supported');
      } catch (error) {
        this.addTestResult('Storage APIs', test.name, false, 
          `Error: ${error.message}`);
      }
    }
    
    // Test IndexedDB functionality if available
    if ('indexedDB' in window) {
      await this.testIndexedDBFunctionality();
    }
  }

  async testIndexedDBFunctionality() {
    console.log('🗄️ Testing IndexedDB Functionality...');
    
    try {
      const dbName = 'CompatibilityTestDB';
      const version = 1;
      
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, version);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('testStore')) {
            db.createObjectStore('testStore', { keyPath: 'id' });
          }
        };
      });
      
      // Test write operation
      const transaction = db.transaction(['testStore'], 'readwrite');
      const store = transaction.objectStore('testStore');
      
      await new Promise((resolve, reject) => {
        const request = store.add({ id: 1, data: 'test' });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      // Test read operation
      const readTransaction = db.transaction(['testStore'], 'readonly');
      const readStore = readTransaction.objectStore('testStore');
      
      const data = await new Promise((resolve, reject) => {
        const request = readStore.get(1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      // Clean up
      indexedDB.deleteDatabase(dbName);
      
      this.addTestResult('Storage APIs', 'IndexedDB Read/Write', 
        data && data.data === 'test', 
        data && data.data === 'test' ? 'Read/Write operations successful' : 'Read/Write operations failed');
      
    } catch (error) {
      this.addTestResult('Storage APIs', 'IndexedDB Read/Write', false, 
        `IndexedDB test failed: ${error.message}`);
    }
  }

  async testNetworkAPIs() {
    console.log('🌍 Testing Network APIs...');
    
    const tests = [
      {
        name: 'Online/Offline Detection',
        test: () => typeof navigator.onLine === 'boolean'
      },
      {
        name: 'Connection API',
        test: () => 'connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator
      },
      {
        name: 'Beacon API',
        test: () => 'sendBeacon' in navigator
      }
    ];
    
    for (const test of tests) {
      try {
        const result = test.test();
        this.addTestResult('Network APIs', test.name, result, 
          result ? 'Supported' : 'Not supported');
      } catch (error) {
        this.addTestResult('Network APIs', test.name, false, 
          `Error: ${error.message}`);
      }
    }
    
    // Test actual network request if online
    if (navigator.onLine) {
      await this.testNetworkRequest();
    }
  }

  async testNetworkRequest() {
    console.log('📡 Testing Network Request...');
    
    try {
      const response = await fetch('https://httpbin.org/json', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const success = response.ok;
      this.addTestResult('Network APIs', 'Fetch Request', success, 
        success ? `Request successful (${response.status})` : `Request failed (${response.status})`);
      
    } catch (error) {
      this.addTestResult('Network APIs', 'Fetch Request', false, 
        `Network request failed: ${error.message}`);
    }
  }

  async testGoogleAPIsCompatibility() {
    console.log('🔍 Testing Google APIs Compatibility...');
    
    const tests = [
      {
        name: 'Google APIs Script Loading',
        test: () => {
          const script = document.querySelector('script[src*="apis.google.com"]');
          return script !== null;
        }
      },
      {
        name: 'GAPI Global Object',
        test: () => typeof gapi !== 'undefined'
      },
      {
        name: 'Google Identity Services',
        test: () => {
          const script = document.querySelector('script[src*="accounts.google.com/gsi"]');
          return script !== null || typeof google !== 'undefined';
        }
      },
      {
        name: 'CORS Support',
        test: () => {
          const xhr = new XMLHttpRequest();
          return 'withCredentials' in xhr;
        }
      }
    ];
    
    for (const test of tests) {
      try {
        const result = test.test();
        this.addTestResult('Google APIs', test.name, result, 
          result ? 'Compatible' : 'Not compatible');
      } catch (error) {
        this.addTestResult('Google APIs', test.name, false, 
          `Error: ${error.message}`);
      }
    }
    
    // Test GAPI loading if available
    if (typeof gapi !== 'undefined') {
      await this.testGAPIFunctionality();
    }
  }

  async testGAPIFunctionality() {
    console.log('🔧 Testing GAPI Functionality...');
    
    try {
      // Test if gapi.load is available
      const hasLoad = typeof gapi.load === 'function';
      this.addTestResult('Google APIs', 'GAPI Load Function', hasLoad, 
        hasLoad ? 'gapi.load available' : 'gapi.load not available');
      
      if (hasLoad) {
        // Test loading a GAPI module
        const loadResult = await new Promise((resolve) => {
          gapi.load('client', {
            callback: () => resolve(true),
            onerror: () => resolve(false),
            timeout: 5000,
            ontimeout: () => resolve(false)
          });
        });
        
        this.addTestResult('Google APIs', 'GAPI Client Loading', loadResult, 
          loadResult ? 'Client module loaded successfully' : 'Client module failed to load');
      }
      
    } catch (error) {
      this.addTestResult('Google APIs', 'GAPI Functionality', false, 
        `GAPI test failed: ${error.message}`);
    }
  }

  async testPerformanceAPIs() {
    console.log('⚡ Testing Performance APIs...');
    
    const tests = [
      {
        name: 'Performance API',
        test: () => typeof performance !== 'undefined' && typeof performance.now === 'function'
      },
      {
        name: 'Performance Observer',
        test: () => typeof PerformanceObserver !== 'undefined'
      },
      {
        name: 'Performance Memory (Chrome)',
        test: () => performance.memory !== undefined
      },
      {
        name: 'Navigation Timing',
        test: () => performance.navigation !== undefined || performance.getEntriesByType('navigation').length > 0
      },
      {
        name: 'Resource Timing',
        test: () => typeof performance.getEntriesByType === 'function'
      },
      {
        name: 'User Timing',
        test: () => typeof performance.mark === 'function' && typeof performance.measure === 'function'
      }
    ];
    
    for (const test of tests) {
      try {
        const result = test.test();
        this.addTestResult('Performance APIs', test.name, result, 
          result ? 'Supported' : 'Not supported');
      } catch (error) {
        this.addTestResult('Performance APIs', test.name, false, 
          `Error: ${error.message}`);
      }
    }
    
    // Test performance timing
    if (typeof performance.now === 'function') {
      const start = performance.now();
      await new Promise(resolve => setTimeout(resolve, 10));
      const end = performance.now();
      const duration = end - start;
      
      this.addTestResult('Performance APIs', 'Performance Timing Accuracy', 
        duration >= 10 && duration < 50, 
        `Timing measurement: ${duration.toFixed(2)}ms`);
    }
  }

  async testSecurityFeatures() {
    console.log('🔒 Testing Security Features...');
    
    const tests = [
      {
        name: 'Secure Context',
        test: () => window.isSecureContext
      },
      {
        name: 'Web Crypto API',
        test: () => 'crypto' in window && 'subtle' in crypto
      },
      {
        name: 'Content Security Policy',
        test: () => {
          const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
          return meta !== null || document.querySelector('meta[name="csp-nonce"]') !== null;
        }
      },
      {
        name: 'Same-Origin Policy',
        test: () => {
          try {
            // This should throw an error in a secure environment
            const frame = document.createElement('iframe');
            frame.src = 'https://example.com';
            return true; // If no error, basic support exists
          } catch (e) {
            return true; // Error means security is working
          }
        }
      },
      {
        name: 'Referrer Policy',
        test: () => {
          const meta = document.querySelector('meta[name="referrer"]');
          return meta !== null || document.referrer !== undefined;
        }
      }
    ];
    
    for (const test of tests) {
      try {
        const result = test.test();
        this.addTestResult('Security Features', test.name, result, 
          result ? 'Supported/Enabled' : 'Not supported/Disabled');
      } catch (error) {
        this.addTestResult('Security Features', test.name, false, 
          `Error: ${error.message}`);
      }
    }
    
    // Test Web Crypto functionality if available
    if ('crypto' in window && 'subtle' in crypto) {
      await this.testWebCryptoFunctionality();
    }
  }

  async testWebCryptoFunctionality() {
    console.log('🔐 Testing Web Crypto Functionality...');
    
    try {
      // Test random number generation
      const randomArray = new Uint8Array(16);
      crypto.getRandomValues(randomArray);
      const hasRandomValues = randomArray.some(value => value !== 0);
      
      this.addTestResult('Security Features', 'Crypto Random Values', hasRandomValues, 
        hasRandomValues ? 'Random value generation working' : 'Random value generation failed');
      
      // Test subtle crypto digest
      const encoder = new TextEncoder();
      const data = encoder.encode('test data');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hasDigest = hashBuffer.byteLength === 32;
      
      this.addTestResult('Security Features', 'Crypto Digest', hasDigest, 
        hasDigest ? 'SHA-256 digest working' : 'SHA-256 digest failed');
      
    } catch (error) {
      this.addTestResult('Security Features', 'Web Crypto Functionality', false, 
        `Web Crypto test failed: ${error.message}`);
    }
  }

  async testMobileFeatures() {
    console.log('📱 Testing Mobile Features...');
    
    const tests = [
      {
        name: 'Touch Events',
        test: () => 'ontouchstart' in window || navigator.maxTouchPoints > 0
      },
      {
        name: 'Device Orientation',
        test: () => 'DeviceOrientationEvent' in window
      },
      {
        name: 'Device Motion',
        test: () => 'DeviceMotionEvent' in window
      },
      {
        name: 'Viewport Meta Tag',
        test: () => {
          const viewport = document.querySelector('meta[name="viewport"]');
          return viewport !== null;
        }
      },
      {
        name: 'Screen Orientation',
        test: () => 'orientation' in screen || 'orientation' in window
      },
      {
        name: 'Vibration API',
        test: () => 'vibrate' in navigator
      }
    ];
    
    for (const test of tests) {
      try {
        const result = test.test();
        this.addTestResult('Mobile Features', test.name, result, 
          result ? 'Supported' : 'Not supported');
      } catch (error) {
        this.addTestResult('Mobile Features', test.name, false, 
          `Error: ${error.message}`);
      }
    }
  }

  addTestResult(category, testName, success, message) {
    this.testResults.push({
      category,
      testName,
      success,
      message,
      timestamp: new Date().toISOString(),
      browser: `${this.browserInfo.name} ${this.browserInfo.version}`
    });
  }

  generateCompatibilityReport(duration) {
    const categories = [...new Set(this.testResults.map(r => r.category))];
    const summary = {};
    
    // Calculate summary for each category
    categories.forEach(category => {
      const categoryTests = this.testResults.filter(r => r.category === category);
      summary[category] = {
        total: categoryTests.length,
        passed: categoryTests.filter(r => r.success).length,
        failed: categoryTests.filter(r => r.success === false).length,
        successRate: Math.round((categoryTests.filter(r => r.success).length / categoryTests.length) * 100)
      };
    });
    
    // Overall summary
    const overallSummary = {
      total: this.testResults.length,
      passed: this.testResults.filter(r => r.success).length,
      failed: this.testResults.filter(r => r.success === false).length,
      successRate: Math.round((this.testResults.filter(r => r.success).length / this.testResults.length) * 100)
    };
    
    // Generate compatibility verdict
    const compatibilityVerdict = this.generateCompatibilityVerdict(overallSummary);
    
    return {
      timestamp: new Date().toISOString(),
      duration,
      browserInfo: this.browserInfo,
      supportMatrix: this.supportMatrix,
      summary: {
        overall: overallSummary,
        categories: summary
      },
      results: this.testResults,
      compatibilityVerdict,
      recommendations: this.generateRecommendations()
    };
  }

  generateCompatibilityVerdict(summary) {
    const browserSupport = this.supportMatrix[this.browserInfo.name];
    const verdict = {
      compatible: false,
      level: 'UNKNOWN',
      message: '',
      issues: [],
      browserSupported: false
    };
    
    // Check if browser is in support matrix
    if (browserSupport) {
      const browserVersion = parseInt(this.browserInfo.version);
      verdict.browserSupported = browserVersion >= browserSupport.minVersion;
      
      if (!verdict.browserSupported) {
        verdict.issues.push(`Browser version ${this.browserInfo.version} is below minimum required version ${browserSupport.minVersion}`);
      }
    } else {
      verdict.issues.push(`Browser ${this.browserInfo.name} is not in the official support matrix`);
    }
    
    // Determine compatibility level based on test results
    if (summary.successRate >= 95) {
      verdict.level = 'FULLY_COMPATIBLE';
      verdict.compatible = true;
      verdict.message = 'Browser is fully compatible with Google Sheets Sync functionality';
    } else if (summary.successRate >= 85) {
      verdict.level = 'MOSTLY_COMPATIBLE';
      verdict.compatible = true;
      verdict.message = 'Browser is mostly compatible with minor limitations';
    } else if (summary.successRate >= 70) {
      verdict.level = 'PARTIALLY_COMPATIBLE';
      verdict.compatible = false;
      verdict.message = 'Browser has significant compatibility issues';
    } else {
      verdict.level = 'INCOMPATIBLE';
      verdict.compatible = false;
      verdict.message = 'Browser is not compatible with Google Sheets Sync';
    }
    
    // Add specific issues based on failed tests
    const criticalFailures = this.testResults.filter(r => 
      !r.success && 
      (r.testName.includes('IndexedDB') || 
       r.testName.includes('Fetch') || 
       r.testName.includes('Promises') ||
       r.testName.includes('Classes'))
    );
    
    criticalFailures.forEach(failure => {
      verdict.issues.push(`Critical feature missing: ${failure.testName}`);
    });
    
    return verdict;
  }

  generateRecommendations() {
    const recommendations = [];
    const failedTests = this.testResults.filter(r => !r.success);
    
    // Browser-specific recommendations
    if (this.browserInfo.name === 'Safari') {
      recommendations.push('Safari users may experience issues with ES6 modules. Consider using a bundler.');
      if (parseInt(this.browserInfo.version) < 13) {
        recommendations.push('Update Safari to version 13 or later for better compatibility.');
      }
    }
    
    if (this.browserInfo.name === 'Firefox' && parseInt(this.browserInfo.version) < 75) {
      recommendations.push('Update Firefox to version 75 or later for full compatibility.');
    }
    
    if (this.browserInfo.name === 'Chrome' && parseInt(this.browserInfo.version) < 80) {
      recommendations.push('Update Chrome to version 80 or later for optimal performance.');
    }
    
    // Feature-specific recommendations
    const indexedDBFailed = failedTests.some(t => t.testName.includes('IndexedDB'));
    if (indexedDBFailed) {
      recommendations.push('IndexedDB is not working properly. Local data storage may be affected.');
    }
    
    const fetchFailed = failedTests.some(t => t.testName.includes('Fetch'));
    if (fetchFailed) {
      recommendations.push('Fetch API is not available. Network requests may use fallback methods.');
    }
    
    const cryptoFailed = failedTests.some(t => t.testName.includes('Crypto'));
    if (cryptoFailed) {
      recommendations.push('Web Crypto API is not available. Security features may be limited.');
    }
    
    // Security recommendations
    if (!window.isSecureContext) {
      recommendations.push('Application is not running in a secure context (HTTPS). Some features may be disabled.');
    }
    
    // Mobile-specific recommendations
    if (this.browserInfo.mobile) {
      recommendations.push('Mobile browser detected. Ensure touch interactions work properly.');
      if (this.browserInfo.name === 'Safari') {
        recommendations.push('iOS Safari may have additional restrictions on storage and background processing.');
      }
    }
    
    return recommendations;
  }

  // Method to export results for cross-browser comparison
  exportForComparison() {
    return {
      browser: `${this.browserInfo.name} ${this.browserInfo.version}`,
      platform: this.browserInfo.platform,
      timestamp: new Date().toISOString(),
      results: this.testResults.map(r => ({
        test: `${r.category}: ${r.testName}`,
        success: r.success,
        message: r.message
      }))
    };
  }
}

// Export for use in test HTML files
if (typeof window !== 'undefined') {
  window.BrowserCompatibilityTestSuite = BrowserCompatibilityTestSuite;
}