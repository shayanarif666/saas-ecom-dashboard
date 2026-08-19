import { createSlice } from '@reduxjs/toolkit';
import { AUTH_STORAGE_KEY } from '../utils/constants';

const loadAuth = () => {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return {
        user: null,
        accessToken: null,
        refreshToken: null,
        status: 'idle',
        error: null,
      };
    }
    const parsed = JSON.parse(raw);
    const user = parsed?.user || null;
    const accessToken = parsed?.accessToken || null;
    return {
      user,
      accessToken,
      refreshToken: parsed?.refreshToken || null,
      status: user && accessToken ? 'authenticated' : 'idle',
      error: null,
    };
  } catch {
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      status: 'idle',
      error: null,
    };
  }
};

const persist = (state) => {
  try {
    sessionStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      })
    );
  } catch {
    /* ignore quota / private mode */
  }
};

const initialState = loadAuth();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthLoading(state) {
      state.status = 'loading';
      state.error = null;
    },
    setSession(state, action) {
      const { user, accessToken, refreshToken } = action.payload || {};
      state.user = user || null;
      if (accessToken !== undefined) state.accessToken = accessToken || null;
      if (refreshToken !== undefined) state.refreshToken = refreshToken || null;
      state.status = state.user && state.accessToken ? 'authenticated' : 'unauthenticated';
      state.error = null;
      persist(state);
    },
    setUser(state, action) {
      state.user = action.payload;
      state.status = action.payload && state.accessToken ? 'authenticated' : action.payload ? 'authenticated' : 'unauthenticated';
      state.error = null;
      persist(state);
    },
    setAuthError(state, action) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = 'unauthenticated';
      state.error = action.payload || 'Not authenticated';
      try {
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    },
    clearAuth(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = 'unauthenticated';
      state.error = null;
      try {
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    },
  },
});

export const { setAuthLoading, setSession, setUser, setAuthError, clearAuth } =
  authSlice.actions;
export default authSlice.reducer;
