import { useState, useCallback } from 'react'
import api from '../services/api'

export const useApi = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await api.request(endpoint, options)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const get = useCallback((endpoint) => request(endpoint, { method: 'GET' }), [request])
  const post = useCallback((endpoint, data) => request(endpoint, { method: 'POST', body: data }), [request])
  const put = useCallback((endpoint, data) => request(endpoint, { method: 'PUT', body: data }), [request])
  const patch = useCallback((endpoint, data) => request(endpoint, { method: 'PATCH', body: data }), [request])
  const del = useCallback((endpoint) => request(endpoint, { method: 'DELETE' }), [request])

  // Convenience methods that wrap the API service
  const apiMethods = {
    // Account methods
    importAccount: useCallback(async (accountData) => {
      setLoading(true)
      setError(null)
      try {
        return await api.importAccount(accountData)
      } catch (err) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    }, []),

    importMultipleAccounts: useCallback(async (accountsData) => {
      setLoading(true)
      setError(null)
      try {
        return await api.importMultipleAccounts(accountsData)
      } catch (err) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    }, []),

    // Workflow methods
    startWorkflow: useCallback(async (workflowData) => {
      setLoading(true)
      setError(null)
      try {
        return await api.startWorkflow(workflowData)
      } catch (err) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    }, []),

    stopWorkflow: useCallback(async (accountId) => {
      setLoading(true)
      setError(null)
      try {
        return await api.stopWorkflow(accountId)
      } catch (err) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    }, []),

    // Action methods
    startSwipe: useCallback(async (swipeConfig) => {
      setLoading(true)
      setError(null)
      try {
        return await api.startSwipe(swipeConfig)
      } catch (err) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    }, []),

    updateBio: useCallback(async (bioData) => {
      setLoading(true)
      setError(null)
      try {
        return await api.updateBio(bioData)
      } catch (err) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    }, []),

    updatePrompt: useCallback(async (promptData) => {
      setLoading(true)
      setError(null)
      try {
        return await api.updatePrompt(promptData)
      } catch (err) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    }, []),

    // Monitoring methods
    getDashboardData: useCallback(async () => {
      setLoading(true)
      setError(null)
      try {
        return await api.getDashboardData()
      } catch (err) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    }, []),

    getSystemHealth: useCallback(async () => {
      setLoading(true)
      setError(null)
      try {
        return await api.getSystemHealth()
      } catch (err) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    }, [])
  }

  return {
    loading,
    error,
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    setError,
    
    // Direct API access
    api,
    
    // Convenience methods
    ...apiMethods
  }
}

// Legacy mutation hook for backward compatibility
export const useApiMutation = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const mutate = async (endpoint, data, options = {}) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.post(endpoint, data)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}