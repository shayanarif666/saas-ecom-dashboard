import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarCollapsed: false,
    mobileNavOpen: false,
  },
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action) {
      state.sidebarCollapsed = Boolean(action.payload);
    },
    setMobileNavOpen(state, action) {
      state.mobileNavOpen = Boolean(action.payload);
    },
  },
});

export const { toggleSidebar, setSidebarCollapsed, setMobileNavOpen } = uiSlice.actions;
export default uiSlice.reducer;
