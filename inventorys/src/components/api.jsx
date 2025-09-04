import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

API.interceptors.request.use(config => {
  const token = localStorage.getItem('access');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const api = {
  post: (endpoint, data = {}) => API.post(`${endpoint}/`, data).then(res => res.data),
  get: (endpoint, params = {}) => API.get(`${endpoint}/`, { params }).then(res => res.data),
};

export default api;
