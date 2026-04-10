import axios from 'axios'
import { auth } from '../config/firebase'

const api = axios.create({
  baseURL: 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add Firebase auth token
api.interceptors.request.use(
  async (config) => {
    try {
      // In development, skip Firebase auth as backend has auth bypass
      const isDevelopment = import.meta.env.MODE === 'development';
      
      if (isDevelopment) {
        console.log('Development mode: skipping Firebase auth for request to', config.url);
        return config;
      }
      
      // Get current Firebase user
      const user = auth.currentUser;
      
      if (user) {
        // Get fresh ID token
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting Firebase token:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // In development mode, don't try to refresh tokens
    const isDevelopment = import.meta.env.MODE === 'development';
    
    if (error.response?.status === 401 && !isDevelopment) {
      // Token expired or invalid - try to refresh
      try {
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken(true); // Force refresh
          error.config.headers.Authorization = `Bearer ${token}`;
          return api.request(error.config); // Retry request
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        console.error('Token refresh failed:', refreshError);
        window.location.href = '/login';
      }
    }
    
    if (error.response?.status === 401 && isDevelopment) {
      console.error('401 error in development mode - check backend auth bypass');
    }
    
    return Promise.reject(error)
  }
)

export default api
