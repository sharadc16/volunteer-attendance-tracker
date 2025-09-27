/**
 * Performance Dashboard Component
 * Displays real-time performance metrics and bottleneck identification
 * Requirements: 1.4, 6.3, 10.4
 */
window.PerformanceDashboard = {
  isVisible: false,
  updateInterval: null,
  refreshRate: 5000, // 5 seconds
  
  // Initialize performance dashboard
  async init() {
    console.log('🚀 Initializing Performance Dashboard...');
    
    // Create dashboard HTML if it doesn't exist
    this.createDashboardHTML();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Start periodic updates
    this.startPeriodicUpdates();
    
    console.log('✅ Performance Dashboard initialized');
  },

  // Create dashboard HTML structure
  createDashboardHTML() {
    const existingDashboard = Utils.DOM.get('#performanceDashboard');
    if (existingDashboard) {
      return; // Already exists
    }

    const dashboardHTML = `
      <div id="performanceDashboard" class="performance-dashboard hidden">
        <div class="dashboard-header">
          <h3>📊 Performance Monitor</h3>
          <button id="closePerfDashboard" class="btn-close">×</button>
        </div>
        
        <div class="dashboard-content">
          <!-- System Overview -->
          <div class="perf-section">
            <h4>🎯 System Overview</h4>
            <div class="perf-grid">
              <div class="perf-card">
                <div class="perf-label">Scanning Rate</div>
                <div id="scanningRate" class="perf-value">0 /min</div>
              </div>
              <div class="perf-card">
                <div class="perf-label">Queue Status</div>
                <div id="queueStatus" class="perf-value">0 / 0</div>
              </div>
              <div class="perf-card">
                <div class="perf-label">Memory Usage</div>
                <div id="memoryUsage" class="perf-value">0 MB</div>
              </div>
              <div class="perf-card">
                <div class="perf-label">Cache Hit Rate</div>
                <div id="cacheHitRate" class="perf-value">0%</div>
              </div>
            </div>
          </div>

          <!-- Data Index Performance -->
          <div class="perf-section">
            <h4>🔍 Data Index Performance</h4>
            <div class="perf-metrics" id="dataIndexMetrics">
              <div class="metric-row">
                <span>Average Lookup Time:</span>
                <span id="avgLookupTime">0ms</span>
              </div>
              <div class="metric-row">
                <span>Total Lookups:</span>
                <span id="totalLookups">0</span>
              </div>
              <div class="metric-row">
                <span>Index Sizes:</span>
                <span id="indexSizes">Loading...</span>
              </div>
            </div>
          </div>

          <!-- Batch Processing Performance -->
          <div class="perf-section">
            <h4>⚡ Batch Processing</h4>
            <div class="perf-metrics" id="batchMetrics">
              <div class="metric-row">
                <span>Batches Processed:</span>
                <span id="batchesProcessed">0</span>
              </div>
              <div class="metric-row">
                <span>Average Batch Size:</span>
                <span id="avgBatchSize">0</span>
              </div>
              <div class="metric-row">
                <span>Processing Time:</span>
                <span id="avgProcessingTime">0ms</span>
              </div>
              <div class="metric-row">
                <span>Queue Overflows:</span>
                <span id="queueOverflows">0</span>
              </div>
            </div>
          </div>

          <!-- UI Update Performance -->
          <div class="perf-section">
            <h4>🖥️ UI Updates</h4>
            <div class="perf-metrics" id="uiMetrics">
              <div class="metric-row">
                <span>Updates Processed:</span>
                <span id="uiUpdatesProcessed">0</span>
              </div>
              <div class="metric-row">
                <span>Average Update Time:</span>
                <span id="avgUiUpdateTime">0ms</span>
              </div>
              <div class="metric-row">
                <span>Skipped Updates:</span>
                <span id="skippedUpdates">0</span>
              </div>
            </div>
          </div>

          <!-- Connectivity Performance -->
          <div class="perf-section">
            <h4>🌐 Connectivity</h4>
            <div class="perf-metrics" id="connectivityMetrics">
              <div class="metric-row">
                <span>Validation Checks:</span>
                <span id="validationChecks">0</span>
              </div>
              <div class="metric-row">
                <span>Average Check Time:</span>
                <span id="avgCheckTime">0ms</span>
              </div>
              <div class="metric-row">
                <span>Cache Hit Rate:</span>
                <span id="connectivityCacheHitRate">0%</span>
              </div>
            </div>
          </div>

          <!-- Performance Alerts -->
          <div class="perf-section">
            <h4>🚨 Performance Alerts</h4>
            <div id="performanceAlerts" class="perf-alerts">
              <div class="no-alerts">No performance issues detected</div>
            </div>
          </div>

          <!-- Recommendations -->
          <div class="perf-section">
            <h4>💡 Recommendations</h4>
            <div id="performanceRecommendations" class="perf-recommendations">
              <div class="no-recommendations">System is performing optimally</div>
            </div>
          </div>

          <!-- Actions -->
          <div class="perf-section">
            <h4>🔧 Actions</h4>
            <div class="perf-actions">
              <button id="clearCaches" class="btn btn-secondary">Clear Caches</button>
              <button id="forceGC" class="btn btn-secondary">Force Cleanup</button>
              <button id="resetMetrics" class="btn btn-secondary">Reset Metrics</button>
              <button id="exportMetrics" class="btn btn-primary">Export Metrics</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add to body
    document.body.insertAdjacentHTML('beforeend', dashboardHTML);

    // Add CSS styles
    this.addDashboardStyles();
  },

  // Add dashboard CSS styles
  addDashboardStyles() {
    const existingStyles = document.getElementById('performanceDashboardStyles');
    if (existingStyles) {
      return; // Already added
    }

    const styles = `
      <style id="performanceDashboardStyles">
        .performance-dashboard {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 800px;
          max-height: 80vh;
          background: white;
          border: 2px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          z-index: 10000;
          overflow-y: auto;
        }

        .performance-dashboard.hidden {
          display: none;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background: #f8f9fa;
          border-bottom: 1px solid #ddd;
          border-radius: 6px 6px 0 0;
        }

        .dashboard-header h3 {
          margin: 0;
          color: #333;
        }

        .btn-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-close:hover {
          color: #000;
          background: #eee;
          border-radius: 50%;
        }

        .dashboard-content {
          padding: 20px;
        }

        .perf-section {
          margin-bottom: 25px;
        }

        .perf-section h4 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 16px;
          border-bottom: 2px solid #eee;
          padding-bottom: 5px;
        }

        .perf-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin-bottom: 15px;
        }

        .perf-card {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          text-align: center;
          border: 1px solid #e9ecef;
        }

        .perf-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
          font-weight: 500;
        }

        .perf-value {
          font-size: 18px;
          font-weight: bold;
          color: #333;
        }

        .perf-metrics {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #e9ecef;
        }

        .metric-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px solid #eee;
        }

        .metric-row:last-child {
          border-bottom: none;
        }

        .perf-alerts, .perf-recommendations {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #e9ecef;
          min-height: 60px;
        }

        .alert-item {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 10px;
          margin-bottom: 10px;
          border-radius: 4px;
          border-left: 4px solid #f39c12;
        }

        .alert-item.error {
          background: #f8d7da;
          border-color: #f5c6cb;
          border-left-color: #dc3545;
        }

        .alert-item.warning {
          background: #fff3cd;
          border-color: #ffeaa7;
          border-left-color: #f39c12;
        }

        .recommendation-item {
          background: #d1ecf1;
          border: 1px solid #bee5eb;
          padding: 10px;
          margin-bottom: 10px;
          border-radius: 4px;
          border-left: 4px solid #17a2b8;
        }

        .perf-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .perf-actions .btn {
          padding: 8px 16px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: #f8f9fa;
          cursor: pointer;
          font-size: 14px;
        }

        .perf-actions .btn:hover {
          background: #e9ecef;
        }

        .perf-actions .btn-primary {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }

        .perf-actions .btn-primary:hover {
          background: #0056b3;
        }

        .no-alerts, .no-recommendations {
          color: #666;
          font-style: italic;
          text-align: center;
          padding: 20px;
        }

        @media (max-width: 600px) {
          .performance-dashboard {
            width: 95%;
            max-height: 90vh;
          }
          
          .perf-grid {
            grid-template-columns: 1fr 1fr;
          }
          
          .perf-actions {
            flex-direction: column;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  },

  // Set up event listeners
  setupEventListeners() {
    // Close button
    const closeBtn = Utils.DOM.get('#closePerfDashboard');
    if (closeBtn) {
      closeBtn.onclick = () => this.hide();
    }

    // Action buttons
    const clearCachesBtn = Utils.DOM.get('#clearCaches');
    if (clearCachesBtn) {
      clearCachesBtn.onclick = () => this.clearCaches();
    }

    const forceGCBtn = Utils.DOM.get('#forceGC');
    if (forceGCBtn) {
      forceGCBtn.onclick = () => this.forceCleanup();
    }

    const resetMetricsBtn = Utils.DOM.get('#resetMetrics');
    if (resetMetricsBtn) {
      resetMetricsBtn.onclick = () => this.resetMetrics();
    }

    const exportMetricsBtn = Utils.DOM.get('#exportMetrics');
    if (exportMetricsBtn) {
      exportMetricsBtn.onclick = () => this.exportMetrics();
    }

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  },

  // Show performance dashboard
  show() {
    const dashboard = Utils.DOM.get('#performanceDashboard');
    if (dashboard) {
      dashboard.classList.remove('hidden');
      this.isVisible = true;
      
      // Update immediately
      this.updateMetrics();
      
      console.log('📊 Performance Dashboard shown');
    }
  },

  // Hide performance dashboard
  hide() {
    const dashboard = Utils.DOM.get('#performanceDashboard');
    if (dashboard) {
      dashboard.classList.add('hidden');
      this.isVisible = false;
      
      console.log('📊 Performance Dashboard hidden');
    }
  },

  // Toggle dashboard visibility
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  },

  // Start periodic updates
  startPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      if (this.isVisible) {
        this.updateMetrics();
      }
    }, this.refreshRate);
  },

  // Update all metrics
  async updateMetrics() {
    try {
      // Update system overview
      await this.updateSystemOverview();
      
      // Update data index metrics
      await this.updateDataIndexMetrics();
      
      // Update batch processing metrics
      await this.updateBatchMetrics();
      
      // Update UI metrics
      await this.updateUIMetrics();
      
      // Update connectivity metrics
      await this.updateConnectivityMetrics();
      
      // Update alerts and recommendations
      await this.updateAlertsAndRecommendations();
      
    } catch (error) {
      console.error('❌ Error updating performance metrics:', error);
    }
  },

  // Update system overview
  async updateSystemOverview() {
    // Calculate scanning rate (scans per minute)
    const scanningRate = this.calculateScanningRate();
    const scanningRateEl = Utils.DOM.get('#scanningRate');
    if (scanningRateEl) {
      scanningRateEl.textContent = `${scanningRate} /min`;
    }

    // Queue status
    let queueStatus = '0 / 0';
    if (window.BatchProcessor) {
      const queueInfo = window.BatchProcessor.getQueueStatus();
      queueStatus = `${queueInfo.queueLength} / ${queueInfo.maxQueueSize}`;
    }
    const queueStatusEl = Utils.DOM.get('#queueStatus');
    if (queueStatusEl) {
      queueStatusEl.textContent = queueStatus;
    }

    // Memory usage
    const memoryUsage = this.getMemoryUsage();
    const memoryUsageEl = Utils.DOM.get('#memoryUsage');
    if (memoryUsageEl) {
      memoryUsageEl.textContent = `${memoryUsage} MB`;
    }

    // Cache hit rate (average across all systems)
    const cacheHitRate = this.calculateOverallCacheHitRate();
    const cacheHitRateEl = Utils.DOM.get('#cacheHitRate');
    if (cacheHitRateEl) {
      cacheHitRateEl.textContent = `${cacheHitRate}%`;
    }
  },

  // Update data index metrics
  async updateDataIndexMetrics() {
    if (!window.DataIndex || !window.DataIndex.isInitialized) {
      return;
    }

    const metrics = window.DataIndex.getPerformanceMetrics();
    
    const avgLookupTimeEl = Utils.DOM.get('#avgLookupTime');
    if (avgLookupTimeEl) {
      avgLookupTimeEl.textContent = `${metrics.averageLookupTime.toFixed(2)}ms`;
    }

    const totalLookupsEl = Utils.DOM.get('#totalLookups');
    if (totalLookupsEl) {
      totalLookupsEl.textContent = metrics.totalLookups.toString();
    }

    const indexSizesEl = Utils.DOM.get('#indexSizes');
    if (indexSizesEl) {
      const sizes = metrics.indexSizes;
      indexSizesEl.textContent = `V:${sizes.volunteers.byId} A:${sizes.attendance.byDate} E:${sizes.events.byId}`;
    }
  },

  // Update batch processing metrics
  async updateBatchMetrics() {
    if (!window.BatchProcessor) {
      return;
    }

    const metrics = window.BatchProcessor.getMetrics();
    
    const batchesProcessedEl = Utils.DOM.get('#batchesProcessed');
    if (batchesProcessedEl) {
      batchesProcessedEl.textContent = metrics.batchesProcessed.toString();
    }

    const avgBatchSizeEl = Utils.DOM.get('#avgBatchSize');
    if (avgBatchSizeEl) {
      avgBatchSizeEl.textContent = metrics.averageBatchSize.toFixed(1);
    }

    const avgProcessingTimeEl = Utils.DOM.get('#avgProcessingTime');
    if (avgProcessingTimeEl) {
      avgProcessingTimeEl.textContent = `${metrics.averageProcessingTime.toFixed(2)}ms`;
    }

    const queueOverflowsEl = Utils.DOM.get('#queueOverflows');
    if (queueOverflowsEl) {
      queueOverflowsEl.textContent = metrics.queueOverflows.toString();
    }
  },

  // Update UI metrics
  async updateUIMetrics() {
    if (!window.UIUpdateManager) {
      return;
    }

    const metrics = window.UIUpdateManager.getMetrics();
    
    const uiUpdatesProcessedEl = Utils.DOM.get('#uiUpdatesProcessed');
    if (uiUpdatesProcessedEl) {
      uiUpdatesProcessedEl.textContent = metrics.totalUpdates.toString();
    }

    const avgUiUpdateTimeEl = Utils.DOM.get('#avgUiUpdateTime');
    if (avgUiUpdateTimeEl) {
      avgUiUpdateTimeEl.textContent = `${metrics.averageUpdateTime.toFixed(2)}ms`;
    }

    const skippedUpdatesEl = Utils.DOM.get('#skippedUpdates');
    if (skippedUpdatesEl) {
      skippedUpdatesEl.textContent = metrics.skippedUpdates.toString();
    }
  },

  // Update connectivity metrics
  async updateConnectivityMetrics() {
    if (!window.FastConnectivityValidator) {
      return;
    }

    const metrics = window.FastConnectivityValidator.getMetrics();
    
    const validationChecksEl = Utils.DOM.get('#validationChecks');
    if (validationChecksEl) {
      validationChecksEl.textContent = metrics.totalChecks.toString();
    }

    const avgCheckTimeEl = Utils.DOM.get('#avgCheckTime');
    if (avgCheckTimeEl) {
      avgCheckTimeEl.textContent = `${metrics.averageCheckTime.toFixed(2)}ms`;
    }

    const connectivityCacheHitRateEl = Utils.DOM.get('#connectivityCacheHitRate');
    if (connectivityCacheHitRateEl) {
      connectivityCacheHitRateEl.textContent = `${metrics.cacheHitRate.toFixed(1)}%`;
    }
  },

  // Update alerts and recommendations
  async updateAlertsAndRecommendations() {
    // Collect alerts from all systems
    const alerts = await this.collectPerformanceAlerts();
    this.displayAlerts(alerts);

    // Collect recommendations from all systems
    const recommendations = await this.collectRecommendations();
    this.displayRecommendations(recommendations);
  },

  // Collect performance alerts
  async collectPerformanceAlerts() {
    const alerts = [];

    // Check batch processor alerts
    if (window.BatchProcessor) {
      const metrics = window.BatchProcessor.getMetrics();
      if (metrics.queueOverflows > 0) {
        alerts.push({
          type: 'warning',
          message: `${metrics.queueOverflows} queue overflows detected in batch processor`,
          source: 'BatchProcessor'
        });
      }
    }

    // Check UI update manager alerts
    if (window.UIUpdateManager) {
      const metrics = window.UIUpdateManager.getMetrics();
      if (metrics.queueUtilization > 80) {
        alerts.push({
          type: 'warning',
          message: `UI update queue is ${metrics.queueUtilization.toFixed(1)}% full`,
          source: 'UIUpdateManager'
        });
      }
    }

    // Check memory usage
    const memoryUsage = this.getMemoryUsageBytes();
    if (memoryUsage > 100 * 1024 * 1024) { // 100MB
      alerts.push({
        type: 'error',
        message: `High memory usage: ${(memoryUsage / 1024 / 1024).toFixed(1)}MB`,
        source: 'System'
      });
    }

    return alerts;
  },

  // Collect recommendations
  async collectRecommendations() {
    const recommendations = [];

    // Get recommendations from all systems
    if (window.BatchProcessor) {
      const batchRecs = window.BatchProcessor.getPerformanceRecommendations();
      recommendations.push(...batchRecs);
    }

    if (window.FastConnectivityValidator) {
      const connRecs = window.FastConnectivityValidator.getPerformanceRecommendations();
      recommendations.push(...connRecs);
    }

    return recommendations;
  },

  // Display alerts
  displayAlerts(alerts) {
    const alertsContainer = Utils.DOM.get('#performanceAlerts');
    if (!alertsContainer) return;

    if (alerts.length === 0) {
      alertsContainer.innerHTML = '<div class="no-alerts">No performance issues detected</div>';
      return;
    }

    const alertsHTML = alerts.map(alert => `
      <div class="alert-item ${alert.type}">
        <strong>${alert.source}:</strong> ${alert.message}
      </div>
    `).join('');

    alertsContainer.innerHTML = alertsHTML;
  },

  // Display recommendations
  displayRecommendations(recommendations) {
    const recsContainer = Utils.DOM.get('#performanceRecommendations');
    if (!recsContainer) return;

    if (recommendations.length === 0) {
      recsContainer.innerHTML = '<div class="no-recommendations">System is performing optimally</div>';
      return;
    }

    const recsHTML = recommendations.map(rec => `
      <div class="recommendation-item">
        <strong>${rec.type}:</strong> ${rec.message}
        <span class="priority">(${rec.priority} priority)</span>
      </div>
    `).join('');

    recsContainer.innerHTML = recsHTML;
  },

  // Calculate scanning rate
  calculateScanningRate() {
    if (!window.BatchProcessor) {
      return 0;
    }

    const metrics = window.BatchProcessor.getMetrics();
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // This is a simplified calculation
    // In a real implementation, you'd track scans with timestamps
    return Math.round(metrics.averageBatchSize * (metrics.batchesProcessed / 10)); // Rough estimate
  },

  // Get memory usage
  getMemoryUsage() {
    const bytes = this.getMemoryUsageBytes();
    return (bytes / 1024 / 1024).toFixed(1);
  },

  // Get memory usage in bytes
  getMemoryUsageBytes() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    
    // Fallback estimation
    let size = 0;
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          size += localStorage[key].length + key.length;
        }
      }
    } catch (e) {
      // Ignore errors
    }
    
    return size * 2; // Rough multiplier
  },

  // Calculate overall cache hit rate
  calculateOverallCacheHitRate() {
    let totalHits = 0;
    let totalRequests = 0;

    // Data index cache
    if (window.DataIndex) {
      const metrics = window.DataIndex.getPerformanceMetrics();
      totalHits += metrics.cacheHits;
      totalRequests += metrics.cacheHits + metrics.cacheMisses;
    }

    // Connectivity validator cache
    if (window.FastConnectivityValidator) {
      const metrics = window.FastConnectivityValidator.getMetrics();
      totalHits += metrics.cacheHits;
      totalRequests += metrics.totalChecks;
    }

    if (totalRequests === 0) {
      return 0;
    }

    return Math.round((totalHits / totalRequests) * 100);
  },

  // Clear all caches
  async clearCaches() {
    let clearedCount = 0;

    if (window.DataIndex) {
      await window.DataIndex.forceRebuild();
      clearedCount++;
    }

    if (window.FastConnectivityValidator) {
      clearedCount += window.FastConnectivityValidator.clearCache();
    }

    if (window.UIUpdateManager) {
      clearedCount += window.UIUpdateManager.clearQueue();
    }

    alert(`Cleared caches and queues. ${clearedCount} operations performed.`);
    this.updateMetrics();
  },

  // Force cleanup
  async forceCleanup() {
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }

    // Clear old metrics
    if (window.PerformanceMonitor) {
      window.PerformanceMonitor.cleanupOldMetrics();
    }

    // Force process queues
    if (window.BatchProcessor) {
      await window.BatchProcessor.forceProcessQueue();
    }

    if (window.UIUpdateManager) {
      await window.UIUpdateManager.forceProcessQueue();
    }

    alert('Forced cleanup completed.');
    this.updateMetrics();
  },

  // Reset metrics
  resetMetrics() {
    if (window.PerformanceMonitor) {
      window.PerformanceMonitor.resetMetrics();
    }

    alert('Performance metrics reset.');
    this.updateMetrics();
  },

  // Export metrics
  async exportMetrics() {
    const exportData = {
      timestamp: new Date().toISOString(),
      dataIndex: window.DataIndex ? window.DataIndex.getPerformanceMetrics() : null,
      batchProcessor: window.BatchProcessor ? window.BatchProcessor.getMetrics() : null,
      uiUpdateManager: window.UIUpdateManager ? window.UIUpdateManager.getMetrics() : null,
      connectivityValidator: window.FastConnectivityValidator ? window.FastConnectivityValidator.getMetrics() : null,
      performanceMonitor: window.PerformanceMonitor ? window.PerformanceMonitor.exportPerformanceData() : null
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
};

// Add keyboard shortcut to toggle performance dashboard
document.addEventListener('keydown', (e) => {
  // Ctrl+Shift+P to toggle performance dashboard
  if (e.ctrlKey && e.shiftKey && e.key === 'P') {
    e.preventDefault();
    if (!window.PerformanceDashboard.isVisible) {
      window.PerformanceDashboard.init();
    }
    window.PerformanceDashboard.toggle();
  }
});