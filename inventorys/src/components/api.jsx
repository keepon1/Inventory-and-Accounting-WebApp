import axios from "axios";

// Access token stored in memory
let accessToken = null;

const PUBLIC_ENDPOINTS = [
  "sign",
  "sign_in_google",
  "auth/users/reset_password",
  "register"
];

// Axios instance
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // send cookies for refresh token
});

// Request interceptor: attach Authorization header if token exists and endpoint is protected
API.interceptors.request.use((config) => {
  const isPublic = PUBLIC_ENDPOINTS.some(ep => config.url.includes(ep));
  if (accessToken && !isPublic) {
    config.headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor: handle 401 for protected endpoints
API.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    const isPublic = PUBLIC_ENDPOINTS.some(ep => originalRequest.url.includes(ep));

    // If no token or request is public, reject
    if (!accessToken || isPublic) return Promise.reject(error);

    // Avoid infinite retry loop
    if (originalRequest._retry) return Promise.reject(error);
    originalRequest._retry = true;

    // Try refresh token using cookie
    if (error.response?.status === 401) {
      try {
        const res = await API.post("refresh/"); // refresh token in cookie
        if (res.data.access) {
          accessToken = res.data.access;
          originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
          return API(originalRequest); // retry original request
        }
      } catch (refreshError) {
        console.error("Refresh token invalid or missing", refreshError);
        accessToken = null; // clear in-memory token
      }
    }

    return Promise.reject(error);
  }
);

// API wrapper
const api = {
  post: async (endpoint, data = {}) => {
    const res = await API.post(`${endpoint}/`, data);

    // Store access token in memory after login
    if (res.data.access) {
      accessToken = res.data.access;
    }

    return res.data;
  },

  get: async (endpoint, params = {}) => {
    return (await API.get(`${endpoint}/`, { params })).data;
  },
};

export default api;
