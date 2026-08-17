import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  status: 'idle', // idle | loading | authenticated | unauthenticated
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthLoading(state) {
      state.status = 'loading';
      state.error = null;
    },
    setUser(state, action) {
      state.user = action.payload;
      state.status = action.payload ? 'authenticated' : 'unauthenticated';
      state.error = null;
    },
    setAuthError(state, action) {
      state.user = null;
      state.status = 'unauthenticated';
      state.error = action.payload || 'Not authenticated';
    },
    clearAuth(state) {
      state.user = null;
      state.status = 'unauthenticated';
      state.error = null;
    },
  },
});

export const { setAuthLoading, setUser, setAuthError, clearAuth } = authSlice.actions;
export default authSlice.reducer;
