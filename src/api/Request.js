import axios from 'axios';

// Dynamically resolve the backend API Base URL based on the current laptop IP/hostname
const getBaseURL = () => {
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:8080`;
  }
  return 'http://localhost:8080';
};

// Create Axios instance with dynamic host IP and port 8080
const request = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Inject dynamic baseURL and Auth Bearer Token safely
request.interceptors.request.use(
  (config) => {
    if (!config.baseURL) {
      config.baseURL = getBaseURL();
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (token && config.headers) {
      if (typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Unwrap data and handle global error codes
request.interceptors.response.use(
  (response) => {
    // Unwraps and returns direct payload
    return response.data;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;

      // Handle 401 Unauthorized globally
      if (status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('token');
        // Prevent infinite redirect loops if already on login page
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('Login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default request;
