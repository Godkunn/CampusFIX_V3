import axios from 'axios';

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const BASE_URL = import.meta.env.MODE === 'development' 
  ? 'http://localhost:8000'
  : 'https://campusfix-backend-s2ow.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cache GET requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Check cache for GET requests
    if (config.method === 'get') {
      const cacheKey = config.url;
      const cached = cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('✅ Using cached data for:', cacheKey);
        config.adapter = () => Promise.resolve({
          data: cached.data,
          status: 200,
          statusText: 'OK (Cached)',
          headers: {},
          config
        });
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Cache successful GET responses
api.interceptors.response.use(
  (response) => {
    if (response.config.method === 'get' && response.status === 200) {
      const cacheKey = response.config.url;
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
    }
    return response;
  },
  async (error) => {
    const config = error.config;
    
    // Handle timeout with retry (for Render cold starts)
    if (error.code === 'ECONNABORTED' && !config._retry) {
      config._retry = true;
      config.timeout = 60000;
      console.warn('⏱️ Request timeout, retrying with 60s timeout...');
      return api.request(config);
    }
    
    // Handle 401 errors
    if (error.response?.status === 401) {
      const isLoginPage = window.location.pathname === '/';
      
      if (!isLoginPage) {
        console.warn('🔐 Authentication failed, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
