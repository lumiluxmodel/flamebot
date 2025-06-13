// public/js/workflowUI.js - Enhanced Workflow UI Management
class WorkflowUI {
  constructor() {
    this.API_BASE = window.location.origin + "/api/workflows";
    this.currentTab = "dashboard";
    this.refreshInterval = null;
    this.selectedWorkflows = new Set();
    this.filters = {
      workflowType: "",
      status: "",
      page: 1,
      limit: 20,
    };
    this.lastRefresh = null;
    this.isInitialized = false; // Add this flag

    console.log("🎨 Workflow UI initialized");
  }

  /**
   * Initialize the workflow UI - FIXED VERSION
   */
  init() {
    if (this.isInitialized) {
      console.log("⚠️ Workflow UI already initialized");
      return;
    }

    console.log("🚀 Initializing Workflow UI...");

    // Wait for DOM to be fully loaded
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.doInit();
      });
    } else {
      this.doInit();
    }
  }

  /**
   * Actual initialization after DOM is ready
   */
  doInit() {
    try {
      this.setupEventListeners();
      this.setupTabNavigation();
      this.startAutoRefresh();
      this.loadDashboardData();

      this.isInitialized = true;
      console.log("✅ Workflow UI initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing Workflow UI:", error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Control buttons
    const pauseBtn = document.getElementById("pause-all-btn");
    const resumeBtn = document.getElementById("resume-all-btn");
    const refreshBtn = document.getElementById("refresh-btn");

    if (pauseBtn)
      pauseBtn.addEventListener("click", () => this.pauseAllWorkflows());
    if (resumeBtn)
      resumeBtn.addEventListener("click", () => this.resumeAllWorkflows());
    if (refreshBtn)
      refreshBtn.addEventListener("click", () => this.refreshCurrentTab());

    // Workflow controls
    const typeFilter = document.getElementById("workflow-type-filter");
    const statusFilter = document.getElementById("workflow-status-filter");

    if (typeFilter) {
      typeFilter.addEventListener("change", (e) => {
        this.filters.workflowType = e.target.value;
        this.filters.page = 1;
        this.loadActiveWorkflows();
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener("change", (e) => {
        this.filters.status = e.target.value;
        this.filters.page = 1;
        this.loadActiveWorkflows();
      });
    }

    // Other event listeners
    const refreshWorkflows = document.getElementById("refresh-workflows");
    const bulkStop = document.getElementById("bulk-stop");
    const viewAllAlerts = document.getElementById("view-all-alerts");
    const refreshActivity = document.getElementById("refresh-activity");
    const acknowledgeAll = document.getElementById("acknowledge-all");
    const filterCritical = document.getElementById("filter-critical");
    const modalClose = document.getElementById("modal-close");

    if (refreshWorkflows)
      refreshWorkflows.addEventListener("click", () =>
        this.loadActiveWorkflows()
      );
    if (bulkStop)
      bulkStop.addEventListener("click", () => this.bulkStopWorkflows());
    if (viewAllAlerts)
      viewAllAlerts.addEventListener("click", () =>
        this.switchTab("monitoring")
      );
    if (refreshActivity)
      refreshActivity.addEventListener("click", () =>
        this.loadRecentActivity()
      );
    if (acknowledgeAll)
      acknowledgeAll.addEventListener("click", () =>
        this.acknowledgeAllAlerts()
      );
    if (filterCritical)
      filterCritical.addEventListener("click", () =>
        this.filterCriticalAlerts()
      );
    if (modalClose)
      modalClose.addEventListener("click", () => this.closeModal());
  }

  // Add missing methods
  async bulkStopWorkflows() {
    if (this.selectedWorkflows.size === 0) {
      this.showNotification("No workflows selected", "warning");
      return;
    }

    if (!confirm(`Stop ${this.selectedWorkflows.size} selected workflows?`))
      return;

    const results = { successful: 0, failed: 0 };

    for (const accountId of this.selectedWorkflows) {
      try {
        await this.stopWorkflow(accountId);
        results.successful++;
      } catch (error) {
        results.failed++;
      }
    }

    this.showNotification(
      `Bulk stop completed: ${results.successful} successful, ${results.failed} failed`,
      "info"
    );
    this.selectedWorkflows.clear();
    this.loadActiveWorkflows();
  }

  async acknowledgeAllAlerts() {
    try {
      const alertsResponse = await fetch(
        `${this.API_BASE}/monitoring/alerts?unacknowledged=true`
      );
      const alertsData = await alertsResponse.json();

      if (!alertsData.success || alertsData.data.alerts.length === 0) {
        this.showNotification("No unacknowledged alerts to process", "info");
        return;
      }

      for (const alert of alertsData.data.alerts) {
        await this.acknowledgeAlert(alert.id);
      }

      this.showNotification(
        `Acknowledged ${alertsData.data.alerts.length} alerts`,
        "success"
      );
      this.loadMonitoringData();
    } catch (error) {
      console.error("Error acknowledging all alerts:", error);
      this.showNotification("Failed to acknowledge all alerts", "error");
    }
  }

  filterCriticalAlerts() {
    // This would filter the alerts table to show only critical
    console.log("Filtering critical alerts...");
    // Implementation depends on your alerts table structure
  }

  async loadRecentActivity() {
    // Reload the recent activity section
    await this.loadDashboardData();
  }

  showNotification(message, type = "info") {
    if (typeof terminal !== "undefined" && terminal.showNotification) {
      terminal.showNotification(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
      // Create a simple notification if terminal is not available
      const notification = document.createElement("div");
      notification.className = `notification ${type}`;
      notification.textContent = message;
      notification.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 9999;
                padding: 15px 20px; background: var(--bg-secondary);
                border: 1px solid var(--terminal-green); color: var(--terminal-green);
                font-size: 12px; border-radius: 4px;
            `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    }
  }

  /**
   * Setup tab navigation - FIXED VERSION
   */
  setupTabNavigation() {
    console.log("🔧 Setting up tab navigation...");

    const tabButtons = document.querySelectorAll(".nav-tab");
    const tabContents = document.querySelectorAll(".tab-content");

    console.log(
      `Found ${tabButtons.length} tab buttons and ${tabContents.length} tab contents`
    );

    if (tabButtons.length === 0) {
      console.error("❌ No tab buttons found!");
      return;
    }

    tabButtons.forEach((button, index) => {
      const tabId = button.getAttribute("data-tab");
      console.log(`Setting up tab button ${index}: ${tabId}`);

      // Remove any existing listeners
      button.replaceWith(button.cloneNode(true));
      const newButton = document.querySelectorAll(".nav-tab")[index];

      newButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`🖱️ Tab clicked: ${tabId}`);
        this.switchTab(tabId);
      });
    });

    console.log("✅ Tab navigation setup complete");
  }

  /**
   * Switch to a specific tab - IMPROVED VERSION
   */
  switchTab(tabId) {
    console.log(`🔄 Switching to tab: ${tabId}`);

    try {
      // Update active tab button
      const tabButtons = document.querySelectorAll(".nav-tab");
      const tabContents = document.querySelectorAll(".tab-content");

      console.log(
        `Processing ${tabButtons.length} buttons and ${tabContents.length} contents`
      );

      // Remove active class from all tabs
      tabButtons.forEach((tab) => {
        const isActive = tab.getAttribute("data-tab") === tabId;
        tab.classList.toggle("active", isActive);
        if (isActive) {
          console.log(`✅ Activated tab button: ${tabId}`);
        }
      });

      // Show/hide tab contents
      tabContents.forEach((content) => {
        const isActive = content.id === `${tabId}-tab`;
        content.classList.toggle("active", isActive);
        if (isActive) {
          console.log(`✅ Activated tab content: ${content.id}`);
        }
      });

      this.currentTab = tabId;

      // Load tab-specific data
      this.loadTabData(tabId);

      console.log(`✅ Successfully switched to tab: ${tabId}`);
    } catch (error) {
      console.error(`❌ Error switching to tab ${tabId}:`, error);
    }
  }

  /**
   * Load data for specific tab
   */
  async loadTabData(tabId) {
    try {
      switch (tabId) {
        case "dashboard":
          await this.loadDashboardData();
          break;
        case "workflows":
          await this.loadActiveWorkflows();
          break;
        case "monitoring":
          await this.loadMonitoringData();
          break;
        case "definitions":
          await this.loadWorkflowDefinitions();
          break;
        case "console":
          // Keep existing terminal functionality
          if (typeof terminal !== "undefined" && terminal.loadInitialData) {
            await terminal.loadInitialData();
          }
          break;
      }
    } catch (error) {
      console.error(`Error loading ${tabId} data:`, error);
      this.showNotification(
        `Failed to load ${tabId} data: ${error.message}`,
        "error"
      );
    }
  }

  /**
   * Load dashboard data
   */
  async loadDashboardData() {
    try {
      console.log("📊 Loading dashboard data...");
      this.showLoading("dashboard-tab");

      const [statsResponse, dashboardResponse] = await Promise.all([
        fetch(`${this.API_BASE}/stats`),
        fetch(`${this.API_BASE}/monitoring/dashboard`),
      ]);

      if (!statsResponse.ok || !dashboardResponse.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const stats = await statsResponse.json();
      const dashboard = await dashboardResponse.json();

      this.updateSystemOverview(stats.data);
      this.updateWorkflowDistribution(dashboard.data.workflows);
      this.updateSystemPerformance(stats.data);
      this.updateRecentAlerts(dashboard.data.alerts.recent);
      this.updateRecentActivity(dashboard.data.workflows.recentlyCompleted);

      this.lastRefresh = new Date();
      this.hideLoading("dashboard-tab");
    } catch (error) {
      console.error("Error loading dashboard:", error);
      this.hideLoading("dashboard-tab");
      this.showError("dashboard-tab", "Failed to load dashboard data");
    }
  }

  /**
   * Update system overview card
   */
  updateSystemOverview(data) {
    const healthElement = document.getElementById("system-health");
    const isHealthy = data.health.systemHealth === "healthy";

    if (healthElement) {
      healthElement.textContent = isHealthy ? "HEALTHY" : "WARNING";
      healthElement.className = `card-status ${
        isHealthy ? "healthy" : "warning"
      }`;
    }

    // Update metrics
    this.updateElementText(
      "active-workflows-count",
      data.executor.activeExecutions
    );
    this.updateElementText("total-executions", data.executor.totalExecutions);
    this.updateElementText(
      "success-rate",
      `${data.executor.successRate.toFixed(1)}%`
    );
    this.updateElementText(
      "avg-duration",
      this.formatDuration(data.executor.averageExecutionTime)
    );

    // Update status bar
    this.updateElementText(
      "workflow-count",
      `${data.executor.activeExecutions} Active Workflows`
    );
    this.updateElementText(
      "alert-count",
      `${data.health.unacknowledgedAlerts} Alerts`
    );

    // Update system indicator
    const indicator = document.getElementById("system-indicator");
    if (indicator) {
      indicator.className = `status-indicator ${
        isHealthy ? "healthy" : "warning"
      }`;
    }
  }

  /**
   * Update workflow distribution visualization
   */
  updateWorkflowDistribution(workflowData) {
    const container = document.getElementById("workflow-types");
    if (!container) return;

    const byType = workflowData.byType || {};
    const total = Object.values(byType).reduce((sum, count) => sum + count, 0);

    container.innerHTML = "";

    if (total === 0) {
      container.innerHTML =
        '<div class="empty-state-message">No active workflows</div>';
      return;
    }

    Object.entries(byType).forEach(([type, count]) => {
      const percentage = (count / total) * 100;
      const bar = document.createElement("div");
      bar.className = "workflow-type-bar";
      bar.innerHTML = `
                <div class="workflow-type-label">${type}</div>
                <div class="workflow-type-progress">
                    <div class="workflow-type-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="workflow-type-count">${count}</div>
            `;
      container.appendChild(bar);
    });
  }

  /**
   * Update system performance metrics
   */
  updateSystemPerformance(data) {
    this.updateElementText("cron-jobs-count", data.cronSystem.totalCronJobs);
    this.updateElementText("queued-tasks", data.taskScheduler.queuedTasks);

    // Fix: Remove process.memoryUsage() as it's not available in browser
    // Use a placeholder or remove this metric
    this.updateElementText("memory-usage", "N/A"); // Or just remove this line

    this.updateElementText("uptime", this.formatDuration(data.uptime || 0));
  }

  // 2. Add the missing renderPagination method
  // Add this method to the WorkflowUI class:
  renderPagination(pagination) {
    const container = document.getElementById("workflows-pagination");
    if (!container || !pagination) return;

    const { page, pages, hasNext, hasPrev, total, limit } = pagination;

    let paginationHTML = '<div class="pagination-controls">';

    // Previous button
    if (hasPrev) {
      paginationHTML += `<button class="pagination-btn" onclick="workflowUI.changePage(${
        page - 1
      })">← Previous</button>`;
    } else {
      paginationHTML += `<button class="pagination-btn" disabled>← Previous</button>`;
    }

    // Page info
    paginationHTML += `<span class="pagination-info">Page ${page} of ${pages} (${total} total)</span>`;

    // Next button
    if (hasNext) {
      paginationHTML += `<button class="pagination-btn" onclick="workflowUI.changePage(${
        page + 1
      })">Next →</button>`;
    } else {
      paginationHTML += `<button class="pagination-btn" disabled>Next →</button>`;
    }

    paginationHTML += "</div>";

    container.innerHTML = paginationHTML;
  }

  /**
   * Update recent alerts
   */
  updateRecentAlerts(alerts) {
    const container = document.getElementById("recent-alerts");
    if (!container) return;

    if (!alerts || alerts.length === 0) {
      container.innerHTML =
        '<div class="empty-state-message">No recent alerts</div>';
      return;
    }

    container.innerHTML = alerts
      .slice(0, 5)
      .map(
        (alert) => `
            <div class="alert-item">
                <div class="alert-severity ${alert.severity}">${
          alert.severity
        }</div>
                <div class="alert-message">${alert.message}</div>
                <div class="alert-time">${this.formatTimeAgo(
                  alert.timestamp
                )}</div>
            </div>
        `
      )
      .join("");
  }

  /**
   * Update recent activity timeline
   */
  updateRecentActivity(activities) {
    const container = document.getElementById("recent-activity");
    if (!container) return;

    if (!activities || activities.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-message">No recent activity</div>
                </div>
            `;
      return;
    }

    container.innerHTML = activities
      .slice(0, 10)
      .map(
        (activity) => `
            <div class="activity-item">
                <div class="activity-icon ${
                  activity.success ? "success" : "error"
                }">
                    ${activity.success ? "✓" : "✗"}
                </div>
                <div class="activity-content">
                    <div class="activity-description">
                        ${activity.account_id} - ${activity.workflow_type}
                    </div>
                    <div class="activity-meta">
                        Duration: ${this.formatDuration(activity.duration_ms)}
                    </div>
                </div>
                <div class="activity-time">
                    ${this.formatTimeAgo(activity.completed_at)}
                </div>
            </div>
        `
      )
      .join("");
  }

  /**
   * Load active workflows
   */
  async loadActiveWorkflows() {
    try {
      console.log("🔄 Loading active workflows...");
      this.showLoading("workflows-tab");

      const params = new URLSearchParams({
        page: this.filters.page,
        limit: this.filters.limit,
        ...(this.filters.workflowType && {
          workflowType: this.filters.workflowType,
        }),
        ...(this.filters.status && { status: this.filters.status }),
      });

      const response = await fetch(`${this.API_BASE}/active?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.renderWorkflowsGrid(data.data.executions);
      this.renderPagination(data.data.pagination);

      this.hideLoading("workflows-tab");
    } catch (error) {
      console.error("Error loading workflows:", error);
      this.hideLoading("workflows-tab");
      this.showError("workflows-tab", "Failed to load active workflows");
    }
  }

  /**
   * Render workflows grid
   */
  renderWorkflowsGrid(workflows) {
    const container = document.getElementById("workflows-grid");
    if (!container) return;

    if (!workflows || workflows.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔄</div>
                    <div class="empty-state-message">No active workflows found</div>
                    <div class="empty-state-description">
                        Import accounts to start automated workflows
                    </div>
                </div>
            `;
      return;
    }

    container.innerHTML = workflows
      .map((workflow) => this.createWorkflowCard(workflow))
      .join("");

    // Add event listeners to workflow cards
    container.querySelectorAll(".workflow-card").forEach((card) => {
      const accountId = card.dataset.accountId;

      // Card selection
      card.addEventListener("click", (e) => {
        if (!e.target.matches(".workflow-action-btn")) {
          this.toggleWorkflowSelection(accountId, card);
        }
      });

      // Action buttons
      card
        .querySelector('[data-action="view"]')
        ?.addEventListener("click", () => {
          this.viewWorkflowDetails(accountId);
        });

      card
        .querySelector('[data-action="stop"]')
        ?.addEventListener("click", () => {
          this.stopWorkflow(accountId);
        });

      card
        .querySelector('[data-action="pause"]')
        ?.addEventListener("click", () => {
          this.pauseWorkflow(accountId);
        });
    });
  }

  async pauseWorkflow(accountId) {
    if (!confirm(`Pause workflow for account ${accountId}?`)) return;

    try {
      // Note: You'll need to implement the pause endpoint in your backend
      // For now, this will show a notification
      this.showNotification(
        "Pause functionality not yet implemented",
        "warning"
      );

      // When backend is ready, use something like:
      // const response = await fetch(`${this.API_BASE}/pause/${accountId}`, {
      //     method: 'POST'
      // });
    } catch (error) {
      console.error("Error pausing workflow:", error);
      this.showNotification(
        `Failed to pause workflow: ${error.message}`,
        "error"
      );
    }
  }

  /**
   * Create workflow card HTML
   */
  createWorkflowCard(workflow) {
    const progressPercentage = workflow.progressPercentage || 0;
    const isSelected = this.selectedWorkflows.has(workflow.accountId);

    return `
            <div class="workflow-card ${
              isSelected ? "selected" : ""
            }" data-account-id="${workflow.accountId}">
                <div class="workflow-status ${workflow.status}"></div>
                <div class="workflow-card-header">
                    <div class="workflow-account-id">${workflow.accountId}</div>
                    <div class="workflow-type-badge ${workflow.workflowType}">${
      workflow.workflowType
    }</div>
                </div>
                <div class="workflow-card-body">
                    <div class="workflow-progress">
                        <div class="workflow-progress-header">
                            <span class="workflow-progress-label">Progress</span>
                            <span class="workflow-progress-percentage">${progressPercentage}%</span>
                        </div>
                        <div class="workflow-progress-bar">
                            <div class="workflow-progress-fill" style="width: ${progressPercentage}%"></div>
                        </div>
                    </div>
                    
                    <div class="workflow-info">
                        <div class="workflow-info-item">
                            <div class="workflow-info-label">Started</div>
                            <div class="workflow-info-value">${this.formatTimeAgo(
                              workflow.startedAt
                            )}</div>
                        </div>
                        <div class="workflow-info-item">
                            <div class="workflow-info-label">Elapsed</div>
                            <div class="workflow-info-value">${this.formatDuration(
                              workflow.timeElapsed
                            )}</div>
                        </div>
                        <div class="workflow-info-item">
                            <div class="workflow-info-label">Steps</div>
                            <div class="workflow-info-value">${
                              workflow.currentStep
                            }/${workflow.totalSteps}</div>
                        </div>
                        <div class="workflow-info-item">
                            <div class="workflow-info-label">Status</div>
                            <div class="workflow-info-value">${
                              workflow.status
                            }</div>
                        </div>
                    </div>

                    ${
                      workflow.nextStep
                        ? `
                        <div class="workflow-current-step">
                            <div class="workflow-step-title">Next Step</div>
                            <div class="workflow-step-description">${
                              workflow.nextStep.description ||
                              workflow.nextStep.action
                            }</div>
                        </div>
                    `
                        : ""
                    }

                    <div class="workflow-card-actions">
                        <button class="workflow-action-btn primary" data-action="view">
                            📊 Details
                        </button>
                        <button class="workflow-action-btn" data-action="pause">
                            ⏸️ Pause
                        </button>
                        <button class="workflow-action-btn danger" data-action="stop">
                            🛑 Stop
                        </button>
                    </div>
                </div>
            </div>
        `;
  }

  /**
   * Load monitoring data
   */
  async loadMonitoringData() {
    try {
      console.log("📈 Loading monitoring data...");
      this.showLoading("monitoring-tab");

      const response = await fetch(`${this.API_BASE}/monitoring/dashboard`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.updateSystemHealth(data.data);
      this.updateAlertsTable(data.data.alerts.recent);

      this.hideLoading("monitoring-tab");
    } catch (error) {
      console.error("Error loading monitoring data:", error);
      this.hideLoading("monitoring-tab");
      this.showError("monitoring-tab", "Failed to load monitoring data");
    }
  }

  /**
   * Update system health display
   */
  updateSystemHealth(data) {
    const healthIndicator = document.getElementById("health-indicator");
    const healthComponents = document.getElementById("health-components");

    if (!healthIndicator || !healthComponents) return;

    const isHealthy = data.overview.systemHealth === "healthy";
    healthIndicator.className = `health-indicator ${
      isHealthy ? "healthy" : "warning"
    }`;

    const components = [
      {
        name: "Workflow Executor",
        healthy: data.systemStatus.workflowExecutor,
      },
      { name: "Cron Manager", healthy: data.systemStatus.cronManager },
      { name: "Task Scheduler", healthy: data.systemStatus.taskScheduler },
      { name: "Database", healthy: data.systemStatus.database },
    ];

    healthComponents.innerHTML = components
      .map(
        (comp) => `
            <div class="health-component">
                <span class="component-name">${comp.name}</span>
                <div class="component-status">
                    <div class="component-indicator ${
                      comp.healthy ? "healthy" : "error"
                    }" 
                         style="background-color: ${
                           comp.healthy
                             ? "var(--terminal-green)"
                             : "var(--terminal-red)"
                         }"></div>
                    <span class="component-text ${
                      comp.healthy ? "text-success" : "text-error"
                    }">
                        ${comp.healthy ? "Online" : "Offline"}
                    </span>
                </div>
            </div>
        `
      )
      .join("");
  }

  /**
   * Update alerts table
   */
  updateAlertsTable(alerts) {
    const container = document.getElementById("alerts-table");
    if (!container) return;

    if (!alerts || alerts.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-message">No active alerts</div>
                </div>
            `;
      return;
    }

    container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Severity</th>
                        <th>Message</th>
                        <th>Time</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${alerts
                      .map(
                        (alert) => `
                        <tr>
                            <td>
                                <span class="alert-severity ${
                                  alert.severity
                                }">${alert.severity}</span>
                            </td>
                            <td>${alert.message}</td>
                            <td>${this.formatTimeAgo(alert.timestamp)}</td>
                            <td>
                                <button class="workflow-action-btn" onclick="workflowUI.acknowledgeAlert('${
                                  alert.id
                                }')">
                                    ✓ Ack
                                </button>
                            </td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        `;
  }

  /**
   * Load workflow definitions
   */
  async loadWorkflowDefinitions() {
    try {
      console.log("📚 Loading workflow definitions...");
      this.showLoading("definitions-tab");

      const response = await fetch(`${this.API_BASE}/definitions`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.renderWorkflowDefinitions(data.data.definitions);

      this.hideLoading("definitions-tab");
    } catch (error) {
      console.error("Error loading definitions:", error);
      this.hideLoading("definitions-tab");
      this.showError("definitions-tab", "Failed to load workflow definitions");
    }
  }

  /**
   * Render workflow definitions
   */
  renderWorkflowDefinitions(definitions) {
    const container = document.getElementById("definitions-grid");
    if (!container) return;

    container.innerHTML = definitions
      .map(
        (def) => `
            <div class="definition-card">
                <div class="definition-header">
                    <div class="definition-name">${def.name}</div>
                    <div class="definition-description">${def.description}</div>
                </div>
                <div class="definition-body">
                    <div class="definition-steps">
                        ${def.steps
                          .map(
                            (step, index) => `
                            <div class="definition-step">
                                <div class="step-number">${
                                  step.stepNumber
                                }</div>
                                <div class="step-info">
                                    <div class="step-action">${
                                      step.action
                                    }</div>
                                    <div class="step-description">${
                                      step.description
                                    }</div>
                                </div>
                                <div class="step-delay">${this.formatDuration(
                                  step.delay
                                )}</div>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Total Steps:</span>
                        <span class="metric-value">${def.totalSteps}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Est. Duration:</span>
                        <span class="metric-value">${this.formatDuration(
                          def.estimatedDuration
                        )}</span>
                    </div>
                </div>
            </div>
        `
      )
      .join("");
  }

  /**
   * Workflow action methods
   */
  async stopWorkflow(accountId) {
    if (!confirm(`Stop workflow for account ${accountId}?`)) return;

    try {
      const response = await fetch(`${this.API_BASE}/stop/${accountId}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.showNotification(`Workflow stopped for ${accountId}`, "success");
      this.loadActiveWorkflows();
    } catch (error) {
      console.error("Error stopping workflow:", error);
      this.showNotification(
        `Failed to stop workflow: ${error.message}`,
        "error"
      );
    }
  }

  async pauseAllWorkflows() {
    if (!confirm("Pause all active workflows?")) return;

    try {
      const response = await fetch(`${this.API_BASE}/control/pause-all`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.showNotification("All workflows paused", "success");
      this.refreshCurrentTab();
    } catch (error) {
      console.error("Error pausing workflows:", error);
      this.showNotification(
        `Failed to pause workflows: ${error.message}`,
        "error"
      );
    }
  }

  async resumeAllWorkflows() {
    if (!confirm("Resume all paused workflows?")) return;

    try {
      const response = await fetch(`${this.API_BASE}/control/resume-all`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.showNotification("All workflows resumed", "success");
      this.refreshCurrentTab();
    } catch (error) {
      console.error("Error resuming workflows:", error);
      this.showNotification(
        `Failed to resume workflows: ${error.message}`,
        "error"
      );
    }
  }

  async acknowledgeAlert(alertId) {
    try {
      const response = await fetch(
        `${this.API_BASE}/monitoring/alerts/${alertId}/acknowledge`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.showNotification("Alert acknowledged", "success");
      this.loadMonitoringData();
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      this.showNotification(
        `Failed to acknowledge alert: ${error.message}`,
        "error"
      );
    }
  }

  /**
   * Utility methods
   */
  toggleWorkflowSelection(accountId, cardElement) {
    if (this.selectedWorkflows.has(accountId)) {
      this.selectedWorkflows.delete(accountId);
      cardElement.classList.remove("selected");
    } else {
      this.selectedWorkflows.add(accountId);
      cardElement.classList.add("selected");
    }
  }

  async viewWorkflowDetails(accountId) {
    try {
      const response = await fetch(`${this.API_BASE}/status/${accountId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.showWorkflowDetailModal(data.data);
    } catch (error) {
      console.error("Error loading workflow details:", error);
      this.showNotification(
        `Failed to load details: ${error.message}`,
        "error"
      );
    }
  }

  showWorkflowDetailModal(workflow) {
    const modal = document.getElementById("workflow-detail-modal");
    const title = document.getElementById("workflow-detail-title");
    const content = document.getElementById("workflow-detail-content");

    title.textContent = `Workflow Details - ${workflow.accountId}`;
    content.innerHTML = `
            <div class="workflow-detail-grid">
                <div class="detail-section">
                    <h3>General Information</h3>
                    <div class="detail-item">
                        <span class="detail-label">Account ID:</span>
                        <span class="detail-value">${workflow.accountId}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Workflow Type:</span>
                        <span class="detail-value">${
                          workflow.workflowType
                        }</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value">${workflow.status}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Progress:</span>
                        <span class="detail-value">${workflow.progress}%</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Execution Log</h3>
                    <div class="execution-log">
                        ${workflow.executionLog
                          .map(
                            (log) => `
                            <div class="log-entry ${
                              log.success ? "success" : "error"
                            }">
                                <div class="log-step">${log.stepId}</div>
                                <div class="log-result">${
                                  log.success ? "✓" : "✗"
                                } ${log.result?.message || log.error}</div>
                                <div class="log-time">${this.formatTimeAgo(
                                  log.timestamp
                                )}</div>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            </div>
        `;

    modal.classList.add("active");
  }

  changePage(newPage) {
    this.filters.page = newPage;
    this.loadActiveWorkflows();
  }

  closeWorkflowDetail() {
    document.getElementById("workflow-detail-modal").classList.remove("active");
  }

  startAutoRefresh() {
    // Refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        this.refreshCurrentTab();
      }
    }, 30000);
  }

  refreshCurrentTab() {
    this.loadTabData(this.currentTab);
  }

  formatDuration(ms) {
    if (!ms || ms === 0) return "0s";

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  formatTimeAgo(timestamp) {
    if (!timestamp) return "Unknown";

    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return `${diffSeconds}s ago`;
  }

  updateElementText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  }

  showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      const loader =
        container.querySelector(".loading") ||
        document.getElementById("main-loader");
      if (loader) loader.style.display = "block";
    }
  }

  hideLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      const loader =
        container.querySelector(".loading") ||
        document.getElementById("main-loader");
      if (loader) loader.style.display = "none";
    }
  }

  showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <div class="empty-state-message">Error</div>
                    <div class="empty-state-description">${message}</div>
                </div>
            `;
    }
  }

  showNotification(message, type = "info") {
    if (typeof terminal !== "undefined" && terminal.showNotification) {
      terminal.showNotification(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  closeModal() {
    document.getElementById("modal-overlay").classList.remove("active");
  }
}

// Initialize global instance with better error handling
let workflowUI;
try {
  workflowUI = new WorkflowUI();
  console.log("✅ WorkflowUI instance created");
} catch (error) {
  console.error("❌ Failed to create WorkflowUI instance:", error);
}
