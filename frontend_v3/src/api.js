import axios from 'axios';

// --- CONFIGURATION ---
// Automatically switch between Localhost and Render Backend
const BASE_URL = import.meta.env.MODE === 'development' 
  ? 'http://localhost:8000'                      // Localhost for testing
  : 'https://campusfix-backend-s2ow.onrender.com'; // Render Backend

// Create Axios instance
const api = axios.create({
  baseURL: BASE_URL, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attaches Token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handles 401 (Unauthorized) errors automatically
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;