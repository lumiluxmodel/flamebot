// Frontend API Service - Complete Backend Integration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3090';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // ============================
  // HTTP CLIENT METHODS
  // ============================
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, { method: 'POST', body: data });
  }

  async put(endpoint, data) {
    return this.request(endpoint, { method: 'PUT', body: data });
  }

  async patch(endpoint, data) {
    return this.request(endpoint, { method: 'PATCH', body: data });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // ============================
  // ACCOUNT MANAGEMENT API
  // ============================

  // Import single account with automatic workflow start
  async importAccount(accountData) {
    return this.post('/api/accounts/import', accountData);
  }

  // Import multiple accounts with automatic workflow start
  async importMultipleAccounts(accountsData) {
    return this.post('/api/accounts/import-multiple', { accounts: accountsData });
  }

  // Get workflow status for specific account
  async getAccountWorkflowStatus(accountId) {
    return this.get(`/api/accounts/workflow/${accountId}`);
  }

  // Stop automation/workflow for specific account
  async stopAccountAutomation(accountId) {
    return this.post(`/api/accounts/workflow/${accountId}/stop`);
  }

  // Get all active workflows (for dashboard)
  async getAllActiveWorkflows() {
    return this.get('/api/accounts/workflows/active');
  }

  // Get workflow statistics and health
  async getWorkflowStats() {
    return this.get('/api/accounts/workflows/stats');
  }

  // Maintenance endpoints for workflow management
  async pauseAllWorkflows() {
    return this.post('/api/accounts/workflows/pause-all');
  }

  async resumeAllWorkflows() {
    return this.post('/api/accounts/workflows/resume-all');
  }

  // Get available models and colors
  async getModels() {
    return this.get('/api/accounts/models');
  }

  // Health check (includes workflow status)
  async getAccountsHealth() {
    return this.get('/api/accounts/health');
  }

  // ============================
  // ACTIONS API
  // ============================

  // SWIPE ACTIONS
  async startSwipe(swipeConfig) {
    return this.post('/api/actions/swipe', swipeConfig);
  }

  async getSwipeStatus(taskId) {
    return this.get(`/api/actions/swipe/status/${taskId}`);
  }

  async stopSwipe(taskId) {
    return this.post(`/api/actions/swipe/stop/${taskId}`);
  }

  async pollSwipeStatus(taskId) {
    return this.get(`/api/actions/swipe/poll/${taskId}`);
  }

  async getActiveSwipeTasks() {
    return this.get('/api/actions/swipe/active');
  }

  async stopAllSwipes() {
    return this.post('/api/actions/swipe/stop-all');
  }

  // SPECTRE MODE ACTIONS
  async enableSpectre(spectreConfig) {
    return this.post('/api/actions/spectre/enable', spectreConfig);
  }

  async spectreSwipeFlow(flowConfig) {
    return this.post('/api/actions/spectre/flow', flowConfig);
  }

  async enableSpectreBulk(bulkConfig) {
    return this.post('/api/actions/spectre/bulk-enable', bulkConfig);
  }

  async getSpectreStatus(taskId) {
    return this.get(`/api/actions/spectre/status/${taskId}`);
  }

  // BIO ACTIONS
  async updateBio(bioData) {
    return this.post('/api/actions/bio/update', bioData);
  }

  async generateAndUpdateBio(bioConfig) {
    return this.post('/api/actions/bio/generate-update', bioConfig);
  }

  async updateBioBulk(bulkBioData) {
    return this.post('/api/actions/bio/bulk-update', bulkBioData);
  }

  async getBioStatus(taskId) {
    return this.get(`/api/actions/bio/status/${taskId}`);
  }

  // PROMPT ACTIONS
  async updatePrompt(promptData) {
    return this.post('/api/actions/prompt/update', promptData);
  }

  async generateAndUpdatePrompt(promptConfig) {
    return this.post('/api/actions/prompt/generate-update', promptConfig);
  }

  async updatePromptBulk(bulkPromptData) {
    return this.post('/api/actions/prompt/bulk-update', bulkPromptData);
  }

  async getPromptStatus(taskId) {
    return this.get(`/api/actions/prompt/status/${taskId}`);
  }

  // COMBO ACTIONS
  async updateBioPromptCombo(comboData) {
    return this.post('/api/actions/bio-prompt/combo-update', comboData);
  }

  // Actions service health check
  async getActionsHealth() {
    return this.get('/api/actions/health');
  }

  // ============================
  // WORKFLOW MANAGEMENT API
  // ============================

  // WORKFLOW EXECUTION
  async startWorkflow(workflowData) {
    return this.post('/api/workflows/start', workflowData);
  }

  async getWorkflowStatus(accountId) {
    return this.get(`/api/workflows/status/${accountId}`);
  }

  async stopWorkflow(accountId) {
    return this.post(`/api/workflows/stop/${accountId}`);
  }

  async getActiveWorkflows(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/api/workflows/active${query ? `?${query}` : ''}`);
  }

  async getWorkflowStatistics() {
    return this.get('/api/workflows/stats');
  }

  // WORKFLOW DEFINITIONS
  async getWorkflowDefinitions() {
    return this.get('/api/workflows/definitions');
  }

  async getWorkflowDefinition(type) {
    return this.get(`/api/workflows/definitions/${type}`);
  }

  async createWorkflowDefinition(definitionData) {
    return this.post('/api/workflows/definitions', definitionData);
  }

  async updateWorkflowDefinition(type, updateData) {
    return this.put(`/api/workflows/definitions/${type}`, updateData);
  }

  async deleteWorkflowDefinition(type) {
    return this.delete(`/api/workflows/definitions/${type}`);
  }

  async toggleWorkflowStatus(type, active) {
    return this.patch(`/api/workflows/definitions/${type}/status`, { active });
  }

  async cloneWorkflowDefinition(type, cloneData) {
    return this.post(`/api/workflows/definitions/${type}/clone`, cloneData);
  }

  async getWorkflowExamples() {
    return this.get('/api/workflows/examples');
  }

  // MONITORING
  async getMonitoringDashboard() {
    return this.get('/api/workflows/monitoring/dashboard');
  }

  async getSystemAlerts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/api/workflows/monitoring/alerts${query ? `?${query}` : ''}`);
  }

  async acknowledgeAlert(alertId) {
    return this.post(`/api/workflows/monitoring/alerts/${alertId}/acknowledge`);
  }

  // SYSTEM CONTROL
  async pauseAllWorkflowsSystem() {
    return this.post('/api/workflows/control/pause-all');
  }

  async resumeAllWorkflowsSystem() {
    return this.post('/api/workflows/control/resume-all');
  }

  async getSystemHealth() {
    return this.get('/api/workflows/health');
  }

  // ============================
  // CONVENIENCE METHODS
  // ============================

  // Combined dashboard data
  async getDashboardData() {
    try {
      const [
        workflowStats,
        activeWorkflows,
        monitoringData,
        systemHealth,
        systemAlerts
      ] = await Promise.all([
        this.getWorkflowStatistics(),
        this.getActiveWorkflows({ limit: 10 }),
        this.getMonitoringDashboard(),
        this.getSystemHealth(),
        this.getSystemAlerts({ unacknowledged: 'true', limit: 5 })
      ]);

      return {
        workflowStats: workflowStats.data,
        activeWorkflows: activeWorkflows.data,
        monitoring: monitoringData.data,
        health: systemHealth.data,
        alerts: systemAlerts.data
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  // Get complete system status
  async getSystemStatus() {
    try {
      const [accountsHealth, actionsHealth, workflowsHealth] = await Promise.all([
        this.getAccountsHealth(),
        this.getActionsHealth(),
        this.getSystemHealth()
      ]);

      return {
        accounts: accountsHealth.data,
        actions: actionsHealth.data,
        workflows: workflowsHealth.data,
        overall: accountsHealth.success && actionsHealth.success && workflowsHealth.success
      };
    } catch (error) {
      console.error('Error getting system status:', error);
      throw error;
    }
  }

  // Import account and start workflow
  async importAccountWithWorkflow(accountData, workflowType = 'default') {
    try {
      // First import the account
      const importResult = await this.importAccount(accountData);
      
      if (importResult.success) {
        // Then start the workflow
        const workflowResult = await this.startWorkflow({
          accountId: importResult.data.accountId,
          accountData: accountData,
          workflowType: workflowType
        });
        
        return {
          success: true,
          data: {
            import: importResult.data,
            workflow: workflowResult.data
          }
        };
      }
      
      return importResult;
    } catch (error) {
      console.error('Error importing account with workflow:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const api = new ApiService();
export default api; 