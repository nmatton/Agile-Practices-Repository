import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Async thunks
export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchDashboardData',
  async (teamId, { rejectWithValue }) => {
    try {
      if (!teamId) {
        return rejectWithValue('No team selected');
      }
      const response = await axios.get(`${API_BASE_URL}/api/dashboard/teams/${teamId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        return rejectWithValue('Authentication required');
      }
      if (error.response?.status === 404) {
        return rejectWithValue('Team not found or no access');
      }
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
      if (!teamId) {
        return rejectWithValue('No team selected');
      }
      const response = await axios.get(`${API_BASE_URL}/api/recommendations/${teamId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        return rejectWithValue('Authentication required');
      }
      if (error.response?.status === 404) {
        return rejectWithValue('Team not found or no access');
      }
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
        const data = action.payload.data || action.payload;
        state.activePractices = data.activePractices || [];
        state.oarCoverage = data.oarCoverage?.covered || [];
        state.affinityScores = data.affinityScores || {};
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
        state.recommendations = Array.isArray(action.payload) ? action.payload : action.payload.data || [];
      })
      .addCase(fetchRecommendations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;