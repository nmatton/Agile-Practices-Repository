import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Async thunks
export const fetchPractices = createAsyncThunk(
  'practices/fetchPractices',
  async ({ search, goal, tag, page = 1, limit = 20 } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (goal) params.append('goal', goal);
      if (tag) params.append('tag', tag);
      params.append('page', page);
      params.append('limit', limit);

      const response = await axios.get(`${API_BASE_URL}/api/practices?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch practices'
      );
    }
  }
);

export const fetchPracticeById = createAsyncThunk(
  'practices/fetchPracticeById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/practices/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch practice details'
      );
    }
  }
);

export const fetchGoals = createAsyncThunk(
  'practices/fetchGoals',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/practices/goals`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch goals'
      );
    }
  }
);

const practicesSlice = createSlice({
  name: 'practices',
  initialState: {
    practices: [],
    currentPractice: null,
    goals: [],
    loading: false,
    error: null,
    pagination: {
      page: 1,
      totalPages: 1,
      totalItems: 0,
      limit: 20,
    },
    filters: {
      search: '',
      goal: '',
      tag: '',
    },
  },
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        search: '',
        goal: '',
        tag: '',
      };
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentPractice: (state) => {
      state.currentPractice = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch practices
      .addCase(fetchPractices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPractices.fulfilled, (state, action) => {
        state.loading = false;
        state.practices = action.payload.practices;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPractices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch practice by ID
      .addCase(fetchPracticeById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPracticeById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPractice = action.payload;
      })
      .addCase(fetchPracticeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch goals
      .addCase(fetchGoals.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.goals = action.payload.data || action.payload;
      })
      .addCase(fetchGoals.rejected, (state, action) => {
        state.error = action.payload;
        state.goals = []; // Ensure goals is always an array
      });
  },
});

export const { setFilters, clearFilters, clearError, clearCurrentPractice } = practicesSlice.actions;
export default practicesSlice.reducer;