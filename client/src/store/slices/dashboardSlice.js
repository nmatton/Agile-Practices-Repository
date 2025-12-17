import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Async thunks
export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchDashboardData',
  async (teamId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/dashboard/${teamId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch dashboard data'
      );
    }
  }
);

export const fetchRecommendations = createAsyncThunk(
  'dashboard/fetchRecommendations',
  async (teamId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/recommendations/${teamId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch recommendations'
      );
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    activePractices: [],
    oarCoverage: [],
    recommendations: [],
    affinityScores: {},
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearDashboard: (state) => {
      state.activePractices = [];
      state.oarCoverage = [];
      state.recommendations = [];
      state.affinityScores = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch dashboard data
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.activePractices = action.payload.activePractices || [];
        state.oarCoverage = action.payload.oarCoverage || [];
        state.affinityScores = action.payload.affinityScores || {};
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch recommendations
      .addCase(fetchRecommendations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.loading = false;
        state.recommendations = action.payload;
      })
      .addCase(fetchRecommendations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;