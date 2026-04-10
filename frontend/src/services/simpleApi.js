import axios from 'axios'

// Simple API client without Firebase auth for development
const simpleApi = axios.create({
  baseURL: 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
})

// Simple logging interceptor
simpleApi.interceptors.request.use(
  (config) => {
    console.log('📤 Request:', config.method.toUpperCase(), config.url)
    return config
  },
  (error) => {
    console.error('❌ Request error:', error)
    return Promise.reject(error)
  }
)

simpleApi.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.config.url, '→', response.status)
    return response
  },
  (error) => {
    console.error('❌ Response error:', error.config?.url, '→', error.response?.status || 'Network Error')
    return Promise.reject(error)
  }
)

export default simpleApi
