/**
 * Format account string from components
 * FORMATO CORRECTO: authToken:persistentId:refreshToken:lat:long:socks5://user:pass@host:port
 * 
 * @param {Object} accountData - Account data object
 * @param {string} accountData.authToken - Auth token (UUID)
 * @param {string} accountData.proxy - Proxy string
 * @param {string} accountData.refreshToken - Refresh token
 * @param {string} accountData.persistentId - Persistent ID
 * @param {string} accountData.latitude - Latitude
 * @param {string} accountData.longitude - Longitude
 * @returns {string} Formatted account string
 */
function formatAccountString(accountData) {
  const { authToken, proxy, refreshToken, persistentId, latitude, longitude } = accountData;
  
  // Manejar ambos nombres de campo para refreshToken
  const finalRefreshToken = refreshToken || accountData.refresh_token || '';
  
  // Manejar ambos nombres de campo para persistentId
  const finalPersistentId = persistentId || accountData.devicePersistentId || '';
  
  // Obtener latitude y longitude
  const finalLatitude = latitude || accountData.lat || '';
  const finalLongitude = longitude || accountData.long || '';
  
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
  
  // FORMATO CORRECTO: authToken:persistentId:refreshToken:lat:long:proxy
  return `${authToken}:${finalPersistentId}:${finalRefreshToken}:${finalLatitude}:${finalLongitude}:${formattedProxy}`;
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
  
  // Verificar persistentId (puede ser persistentId o devicePersistentId)
  if (!accountData.persistentId && !accountData.devicePersistentId) {
    errors.push('persistentId is required');
  }
  
  // Verificar refreshToken (puede ser refreshToken o refresh_token)
  if (!accountData.refreshToken && !accountData.refresh_token) {
    errors.push('refreshToken is required');
  }
  
  // Verificar latitude (puede ser latitude o lat)
  if (!accountData.latitude && !accountData.lat) {
    errors.push('latitude is required');
  }
  
  // Verificar longitude (puede ser longitude o long)
  if (!accountData.longitude && !accountData.long) {
    errors.push('longitude is required');
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

/**
 * Normalize model and channel names consistently across the application
 */

/**
 * Create case-insensitive lookup for models from database
 * @param {Array} dbModels - Models from database  
 * @returns {Map} Map from lowercase to exact name
 */
function createModelLookup(dbModels) {
  const lookup = new Map();
  dbModels.forEach(model => {
    lookup.set(model.name.toLowerCase(), model.name);
  });
  return lookup;
}

/**
 * Create case-insensitive lookup for channels from database
 * @param {Array} dbChannels - Channels from database
 * @returns {Map} Map from lowercase to exact name  
 */
function createChannelLookup(dbChannels) {
  const lookup = new Map();
  dbChannels.forEach(channel => {
    lookup.set(channel.name.toLowerCase(), channel.name);
  });
  return lookup;
}

/**
 * Get exact model name from database lookup
 * @param {string} inputModel - Input model name (any case)
 * @param {Map} modelLookup - Model lookup map
 * @returns {string|null} Exact model name or null if not found
 */
function getExactModelName(inputModel, modelLookup) {
  if (!inputModel || !modelLookup) return null;
  return modelLookup.get(inputModel.toLowerCase()) || null;
}

/**
 * Get exact channel name from database lookup  
 * @param {string} inputChannel - Input channel name (any case)
 * @param {Map} channelLookup - Channel lookup map
 * @returns {string|null} Exact channel name or null if not found
 */
function getExactChannelName(inputChannel, channelLookup) {
  if (!inputChannel || !channelLookup) return null;
  return channelLookup.get(inputChannel.toLowerCase()) || null;
}

/**
 * Validate and normalize model/channel names using database lookups
 * @param {string} model - Input model name
 * @param {string} channel - Input channel name  
 * @param {Array} dbModels - Models from database
 * @param {Array} dbChannels - Channels from database
 * @returns {Object} { valid: boolean, exactModel: string|null, exactChannel: string|null, errors: Array }
 */
function validateAndNormalizeNames(model, channel, dbModels, dbChannels) {
  const result = {
    valid: true,
    exactModel: null,
    exactChannel: null,
    errors: []
  };

  // Create lookups
  const modelLookup = createModelLookup(dbModels);
  const channelLookup = createChannelLookup(dbChannels);

  // Validate and get exact names
  result.exactModel = getExactModelName(model, modelLookup);
  if (!result.exactModel) {
    result.valid = false;
    result.errors.push(`Invalid model. Valid models: ${Array.from(modelLookup.values()).join(', ')}`);
  }

  result.exactChannel = getExactChannelName(channel, channelLookup);
  if (!result.exactChannel) {
    result.valid = false;
    result.errors.push(`Invalid channel. Valid channels: ${Array.from(channelLookup.values()).join(', ')}`);
  }

  return result;
}

/**
 * Get available models from database
 * @returns {Promise<Array>} Array of model names
 */
async function getAvailableModels() {
  try {
    const databaseService = require('../services/databaseService');
    const dbModels = await databaseService.getAllModels();
    return dbModels.map(m => m.name);
  } catch (error) {
    console.error('Error getting models from database:', error);
    // Fallback to empty array if database fails
    return [];
  }
}

/**
 * Check if model is valid against database models
 * @param {string} model - Model to validate
 * @param {Array} [dbModels] - Optional: already fetched db models
 * @returns {Promise<boolean>} True if valid
 */
async function isValidModelFromDB(model, dbModels = null) {
  try {
    if (!dbModels) {
      dbModels = await getAvailableModels();
    }
    
    // Case-insensitive comparison
    return dbModels.some(dbModel => 
      dbModel.toLowerCase() === model.toLowerCase()
    );
  } catch (error) {
    console.error('Error validating model against database:', error);
    return false;
  }
}

/**
 * Validate account data with database models
 * @param {Object} accountData - Account data to validate
 * @returns {Promise<Object>} { isValid: boolean, errors: Array, availableModels: Array }
 */
async function validateAccountDataWithDB(accountData) {
  const errors = [];
  
  // Get available models from database
  const availableModels = await getAvailableModels();
  
  if (availableModels.length === 0) {
    errors.push('No models available in database');
    return { isValid: false, errors, availableModels: [] };
  }

  // Required fields validation
  const requiredFields = ['authToken', 'proxy', 'model'];
  for (const field of requiredFields) {
    if (!accountData[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Model validation against database
  if (accountData.model) {
    const isValid = await isValidModelFromDB(accountData.model, availableModels);
    if (!isValid) {
      errors.push(`Invalid model "${accountData.model}". Available models: ${availableModels.join(', ')}`);
    }
  }

  // Additional validations
  if (!accountData.persistentId && !accountData.devicePersistentId) {
    errors.push('Missing persistent ID (persistentId or devicePersistentId)');
  }

  if (!accountData.refreshToken && !accountData.refresh_token) {
    errors.push('Missing refresh token (refreshToken or refresh_token)');
  }

  if (!accountData.latitude && !accountData.lat) {
    errors.push('Missing latitude coordinate');
  }

  if (!accountData.longitude && !accountData.long) {
    errors.push('Missing longitude coordinate');
  }

  return {
    isValid: errors.length === 0,
    errors,
    availableModels
  };
}

module.exports = {
  formatAccountString,
  parseProxy,
  isValidModel,
  formatAccountPayload,
  validateAccountData,
  createModelLookup,
  createChannelLookup,
  getExactModelName,
  getExactChannelName,
  validateAndNormalizeNames,
  getAvailableModels,
  isValidModelFromDB,
  validateAccountDataWithDB
};
