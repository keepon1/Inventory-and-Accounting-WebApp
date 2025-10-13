import axios from "axios";

let accessToken = null;

try {
  accessToken = localStorage.getItem('access') || null;
} catch (e) {
  accessToken = null;
}

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!accessToken) return Promise.reject(error);

    if (originalRequest._retry) return Promise.reject(error);
    originalRequest._retry = true;

    if (error.response?.status === 401) {
      try {
        const res = await API.post("refresh/");
        if (res.data.access) {
          accessToken = res.data.access;
          originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
          return API(originalRequest);
        }
      } catch (refreshError) {
        console.error("Refresh failed", refreshError);
        accessToken = null;
      }
    }

    return Promise.reject(error);
  }
);

const api = {
  post: async (endpoint, data = {}) => {
    const res = await API.post(`${endpoint}/`, data);

    if (res.data.access) {
      accessToken = res.data.access;
      localStorage.setItem('access', accessToken);
    }
    return res.data;
  },

  get: async (endpoint, params = {}) => {
    return (await API.get(`${endpoint}/`, { params })).data;
  },
};

export default api;
