import axios from "axios";

let accessToken = null;

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

const api = {
  post: (endpoint, data = {}) =>
    API.post(`${endpoint}/`, data).then((res) => {
      if (res.data.access) {
        accessToken = res.data.access;
      }
      return res.data;
    }),
  get: (endpoint, params = {}) =>
    API.get(`${endpoint}/`, { params }).then((res) => res.data),
};

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

    if (originalRequest.url.includes("refresh")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await API.post("refresh/");
        if (res.data.access) {
          accessToken = res.data.access;
        }
        return API(originalRequest);
      } catch (refreshError) {
        console.error("Refresh token expired or invalid", refreshError);

      }
    }

    return Promise.reject(error);
  }
);

export default api;
