/**
 * Format account string from components
 * FORMATO CORRECTO: authToken:deviceId:refreshToken:socks5://user:pass@host:port
 * 
 * @param {Object} accountData - Account data object
 * @param {string} accountData.authToken - Auth token (UUID)
 * @param {string} accountData.proxy - Proxy string
 * @param {string} accountData.refreshToken - Refresh token
 * @param {string} accountData.deviceId - Device ID
 * @returns {string} Formatted account string
 */
function formatAccountString(accountData) {
  const { authToken, proxy, refreshToken, deviceId } = accountData;
  
  // Manejar ambos nombres de campo para refreshToken
  const finalRefreshToken = refreshToken || accountData.refresh_token || '';
  
  // Manejar ambos nombres de campo para deviceId
  const finalDeviceId = deviceId || accountData.device_id || '';
  
  // Parsear proxy string - puede venir en diferentes formatos
  let formattedProxy = proxy;
  
  // Si el proxy ya tiene protocolo, usarlo tal cual
  if (proxy.startsWith('socks5://') || proxy.startsWith('http://')) {
    formattedProxy = proxy;
  } else if (proxy.includes('@')) {
    // Formato: user:pass@host:port
    formattedProxy = `socks5://${proxy}`;
  } else {
    // Formato: host:port:user:pass
    const parts = proxy.split(':');
    if (parts.length >= 4) {
      const [host, port, username, password] = parts;
      formattedProxy = `socks5://${username}:${password}@${host}:${port}`;
    } else {
      // Si no podemos parsearlo, intentar usarlo como está con socks5
      formattedProxy = `socks5://${proxy}`;
    }
  }
  
  // FORMATO CORRECTO: authToken:deviceId:refreshToken:proxy
  return `${authToken}:${finalDeviceId}:${finalRefreshToken}:${formattedProxy}`;
}

/**
 * Parse proxy string into components
 * @param {string} proxyString - Full proxy string
 * @returns {Object} Proxy components
 */
function parseProxy(proxyString) {
  // Remover protocolo si existe
  let cleanProxy = proxyString;
  if (proxyString.startsWith('socks5://')) {
    cleanProxy = proxyString.substring(9);
  } else if (proxyString.startsWith('http://')) {
    cleanProxy = proxyString.substring(7);
  }
  
  // Formato user:pass@host:port
  if (cleanProxy.includes('@')) {
    const [userPass, hostPort] = cleanProxy.split('@');
    const [username, password] = userPass.split(':');
    const [host, port] = hostPort.split(':');
    
    return {
      host,
      port,
      username,
      password,
      protocol: proxyString.startsWith('http://') ? 'http' : 'socks5'
    };
  }
  
  // Formato host:port:user:pass
  const parts = cleanProxy.split(':');
  if (parts.length >= 4) {
    return {
      host: parts[0],
      port: parts[1],
      username: parts[2],
      password: parts[3],
      protocol: 'socks5'
    };
  }
  
  // Formato simple host:port
  if (parts.length === 2) {
    return {
      host: parts[0],
      port: parts[1],
      username: null,
      password: null,
      protocol: 'socks5'
    };
  }
  
  throw new Error(`Invalid proxy format: ${proxyString}`);
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
        class_type: accountData.model,
        class_color: modelColor
      }
    }]
  };
}

/**
 * Validate account data has all required fields
 * @param {Object} accountData - Account data to validate
 * @returns {Object} Validation result
 */
function validateAccountData(accountData) {
  const errors = [];
  
  // Campos requeridos
  if (!accountData.authToken) {
    errors.push('authToken is required');
  }
  
  // Verificar deviceId (puede ser deviceId o device_id)
  if (!accountData.deviceId && !accountData.device_id) {
    errors.push('deviceId is required');
  }
  
  // Verificar refreshToken (puede ser refreshToken o refresh_token)
  if (!accountData.refreshToken && !accountData.refresh_token) {
    errors.push('refreshToken is required');
  }
  
  if (!accountData.proxy) {
    errors.push('proxy is required');
  }
  
  if (!accountData.model) {
    errors.push('model is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  formatAccountString,
  parseProxy,
  isValidModel,
  formatAccountPayload,
  validateAccountData
};
