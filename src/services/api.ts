import axios from 'axios';

// Configure EXPO_PUBLIC_API_URL no arquivo .env.
// O fallback localhost funciona no navegador do próprio computador.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[Smart Water API]', {
      url: error?.config?.url,
      method: error?.config?.method,
      status: error?.response?.status,
      message: error?.message,
      response: error?.response?.data,
    });
    return Promise.reject(error);
  },
);

export default api;
