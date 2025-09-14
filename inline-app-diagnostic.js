/**
 * Inline App Diagnostic - Run this in the browser console on the main app
 * Copy and paste this entire script into the browser console at https://dev--gurukul-attendance.netlify.app/
 */

(function() {
    'use strict';
    
    console.log('🔍 Starting inline app diagnostic...');
    
    // Create a floating diagnostic panel
    const diagnosticPanel = document.createElement('div');
    diagnosticPanel.id = 'diagnosticPanel';
    diagnosticPanel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 400px;
        max-height: 80vh;
        background: white;
        border: 2px solid #007bff;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 12px;
        overflow-y: auto;
    `;
    
    const header = document.createElement('div');
    header.style.cssText = `
        background: #007bff;
        color: white;
        padding: 10px;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    header.innerHTML = `
        <span>🔍 App Diagnostic</span>
        <button onclick="document.getElementById('diagnosticPanel').remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px;">×</button>
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `padding: 10px; max-height: 60vh; overflow-y: auto;`;
    
    diagnosticPanel.appendChild(header);
    diagnosticPanel.appendChild(content);
    document.body.appendChild(diagnosticPanel);
    
    function addResult(message, type = 'info') {
        const div = document.createElement('div');
        div.style.cssText = `
            margin: 5px 0;
            padding: 5px;
            border-radius: 4px;
            background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : type === 'warning' ? '#fff3cd' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : type === 'warning' ? '#856404' : '#0c5460'};
        `;
        div.textContent = message;
        content.appendChild(div);
        content.scrollTop = content.scrollHeight;
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    // Test 1: Check scripts
    addResult('📜 Checking script loading...', 'info');
    const scripts = document.querySelectorAll('script[src]');
    addResult(`Found ${scripts.length} script tags`, 'info');
    
    const expectedScripts = ['utils.js', 'storage.js', 'google-sheets.js', 'scanner.js', 'app.js'];
    expectedScripts.forEach(expected => {
        const found = Array.from(scripts).some(script => script.src.includes(expected));
        addResult(`${expected}: ${found ? '✅ Found' : '❌ Missing'}`, found ? 'success' : 'error');
    });
    
    // Test 2: Check DOM elements
    addResult('🏗️ Checking DOM elements...', 'info');
    const criticalElements = ['addEventBtn', 'modalOverlay', 'eventsView', 'dashboardView'];
    let foundElements = 0;
    
    criticalElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            addResult(`${id}: ✅ Found`, 'success');
            foundElements++;
        } else {
            addResult(`${id}: ❌ Missing`, 'error');
        }
    });
    
    // Test 3: Check global objects
    addResult('🌐 Checking global objects...', 'info');
    const globals = ['Utils', 'StorageManager', 'GoogleSheetsService', 'VolunteerAttendanceApp', 'app'];
    
    globals.forEach(globalName => {
        const exists = typeof window[globalName] !== 'undefined';
        addResult(`window.${globalName}: ${exists ? '✅ Exists' : '❌ Missing'}`, exists ? 'success' : 'error');
        
        if (globalName === 'app' && exists) {
            const app = window[globalName];
            addResult(`  - Initialized: ${app.isInitialized || false}`, 'info');
            addResult(`  - Current view: ${app.currentView || 'unknown'}`, 'info');
        }
    });
    
    // Test 4: Check for JavaScript errors
    addResult('⚠️ Checking for errors...', 'info');
    
    // Test 5: Test Add Event functionality
    addResult('🔧 Testing Add Event functionality...', 'info');
    
    const addEventBtn = document.getElementById('addEventBtn');
    if (addEventBtn) {
        addResult('Add Event button found', 'success');
        addResult(`Button visible: ${addEventBtn.offsetWidth > 0 && addEventBtn.offsetHeight > 0}`, 'info');
        addResult(`Button disabled: ${addEventBtn.disabled}`, 'info');
        
        // Check if app has the method
        if (window.app && typeof window.app.showAddEventModal === 'function') {
            addResult('showAddEventModal method exists', 'success');
            
            // Add a test button
            const testBtn = document.createElement('button');
            testBtn.textContent = '🧪 Test Add Event';
            testBtn.style.cssText = 'margin: 5px; padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;';
            testBtn.onclick = () => {
                try {
                    window.app.showAddEventModal();
                    addResult('✅ Add Event modal opened successfully!', 'success');
                } catch (error) {
                    addResult(`❌ Add Event failed: ${error.message}`, 'error');
                }
            };
            content.appendChild(testBtn);
            
        } else {
            addResult('showAddEventModal method missing', 'error');
        }
    } else {
        addResult('Add Event button not found', 'error');
        
        // Check current view
        if (window.app) {
            addResult(`Current view: ${window.app.currentView}`, 'info');
            if (window.app.currentView !== 'events') {
                addResult('Not on events view - button may be hidden', 'warning');
                
                // Add button to switch to events view
                const switchBtn = document.createElement('button');
                switchBtn.textContent = '📅 Switch to Events View';
                switchBtn.style.cssText = 'margin: 5px; padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;';
                switchBtn.onclick = () => {
                    window.app.switchView('events');
                    addResult('Switched to events view', 'success');
                    setTimeout(() => {
                        const btn = document.getElementById('addEventBtn');
                        if (btn) {
                            addResult('✅ Add Event button now visible!', 'success');
                        } else {
                            addResult('❌ Add Event button still not found', 'error');
                        }
                    }, 500);
                };
                content.appendChild(switchBtn);
            }
        }
    }
    
    // Test 6: Check current URL and context
    addResult('🌍 Context information...', 'info');
    addResult(`URL: ${window.location.href}`, 'info');
    addResult(`Page title: ${document.title}`, 'info');
    addResult(`DOM ready: ${document.readyState}`, 'info');
    
    addResult('✅ Diagnostic complete!', 'success');
    
    // Add refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '🔄 Refresh Diagnostic';
    refreshBtn.style.cssText = 'margin: 5px; padding: 5px 10px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;';
    refreshBtn.onclick = () => {
        content.innerHTML = '';
        setTimeout(() => {
            // Re-run the diagnostic
            window.location.reload();
        }, 100);
    };
    content.appendChild(refreshBtn);
    
})();