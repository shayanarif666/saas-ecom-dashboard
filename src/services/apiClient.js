import axios from 'axios';
import { API_URL, AUTH_STORAGE_KEY, DEMO_MODE } from '../utils/constants';
import { handleDemoRequest } from '../demo/demoApi';

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Offline demo adapter only when VITE_DEMO_MODE=true.
 * Otherwise all requests hit the live Backend at VITE_API_URL.
 */
if (DEMO_MODE) {
  apiClient.defaults.adapter = async (config) => {
    try {
      const data = await handleDemoRequest(config);
      return {
        data,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        config,
        request: {},
      };
    } catch (err) {
      const status = err.response?.status || 500;
      const data = err.response?.data || { success: false, message: err.message };
      const error = new Error(data.message || err.message);
      error.config = config;
      error.response = {
        data,
        status,
        statusText: 'Error',
        headers: {},
        config,
      };
      error.isAxiosError = true;
      return Promise.reject(error);
    }
  };
}

const readAuthSession = () => {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const persistAuthSession = (next) => {
  try {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
};

const clearAuthSession = () => {
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

apiClient.interceptors.request.use((config) => {
  const session = readAuthSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

let refreshing = false;
let queue = [];

const flushQueue = (error) => {
  queue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve()));
  queue = [];
};

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (DEMO_MODE) return Promise.reject(error);

    if (!error.response) {
      error.message =
        error.code === 'ECONNABORTED'
          ? 'Request timed out — is the Backend running?'
          : `Cannot reach API at ${API_URL}. Start the Backend on port 5000.`;
      return Promise.reject(error);
    }

    const original = error.config;
    const url = original?.url || '';
    const skip =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh');

    if (error.response?.status !== 401 || original._retry || skip) {
      return Promise.reject(error);
    }

    if (refreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then(() => apiClient(original));
    }

    original._retry = true;
    refreshing = true;
    try {
      const session = readAuthSession();
      const res = await axios.post(
        `${API_URL}/auth/refresh`,
        { refreshToken: session?.refreshToken },
        { withCredentials: true }
      );
      const data = res.data?.data || {};
      if (!data.accessToken) {
        throw new Error('Refresh did not return an access token');
      }
      persistAuthSession({
        user: data.user || session?.user || null,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || session?.refreshToken || null,
      });
      flushQueue(null);
      return apiClient(original);
    } catch (err) {
      flushQueue(err);
      clearAuthSession();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(err);
    } finally {
      refreshing = false;
    }
  }
);

export default apiClient;
