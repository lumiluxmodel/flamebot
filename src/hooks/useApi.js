import { useState, useEffect } from 'react'
import axios from 'axios'

export const useApi = (url, options = {}) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await axios.get(url, options)
        setData(response.data)
      } catch (err) {
        setError(err)
        console.error(`API Error for ${url}:`, err)
      } finally {
        setLoading(false)
      }
    }

    if (url) {
      fetchData()
    }
  }, [url])

  return { data, loading, error }
}

export const useApiMutation = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const mutate = async (url, data, options = {}) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await axios.post(url, data, options)
      return response.data
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}