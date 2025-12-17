import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import practicesSlice from './slices/practicesSlice';
import teamsSlice from './slices/teamsSlice';
import dashboardSlice from './slices/dashboardSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    practices: practicesSlice,
    teams: teamsSlice,
    dashboard: dashboardSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export default store;