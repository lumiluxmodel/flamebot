/**
 * Format account string from components
 * @param {Object} accountData - Account data object
 * @param {string} accountData.authToken - Auth token (UUID)
 * @param {string} accountData.proxy - Proxy string
 * @returns {string} Formatted account string
 */
function formatAccountString(accountData) {
    const { authToken, proxy } = accountData;
    
    // Parse proxy string
    // Example: gate.nodemaven.com:1080:lumiluxmodels_gmail_com-country-us-zip-87120-sid-9982203806312-ttl-24h-filter-high:hbif188pi7
    const [host, port, username, password] = proxy.split(':');
    
    // Format: uuid:socks5://user:pass@ip:port
    return `${authToken}:socks5://${username}:${password}@${host}:${port}`;
  }
  
  /**
   * Parse proxy string into components
   * @param {string} proxyString - Full proxy string
   * @returns {Object} Proxy components
   */
  function parseProxy(proxyString) {
    const parts = proxyString.split(':');
    return {
      host: parts[0],
      port: parts[1],
      username: parts[2],
      password: parts[3]
    };
  }
  
  /**
   * Validate model name
   * @param {string} model - Model name to validate
   * @param {Array<string>} availableModels - List of available models
   * @returns {boolean} Is valid model
   */
  function isValidModel(model, availableModels) {
    return availableModels.includes(model);
  }
  
  /**
   * Format account payload for Flamebot API
   * @param {Object} accountData - Account data
   * @param {string} modelColor - Model color hex
   * @returns {Object} Formatted payload
   */
  function formatAccountPayload(accountData, modelColor) {
    const accountString = formatAccountString(accountData);
    
    return {
      accounts: [{
        account: accountString,
        class_info: {
          class_type: accountData.model.toUpperCase(),
          class_color: modelColor
        }
      }]
    };
  }
  
  module.exports = {
    formatAccountString,
    parseProxy,
    isValidModel,
    formatAccountPayload
  };