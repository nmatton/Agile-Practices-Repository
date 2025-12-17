import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Async thunks for expert functionality
export const fetchExpertPractices = createAsyncThunk(
  'expert/fetchExpertPractices',
  async ({ status, limit = 50, offset = 0 } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('limit', limit);
      params.append('offset', offset);

      const response = await axios.get(`${API_BASE_URL}/api/expert/practices?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch expert practices'
      );
    }
  }
);

export const fetchPracticeForEdit = createAsyncThunk(
  'expert/fetchPracticeForEdit',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/expert/practices/${id}/edit`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch practice for editing'
      );
    }
  }
);

export const updatePractice = createAsyncThunk(
  'expert/updatePractice',
  async ({ id, practiceData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/expert/practices/${id}`, practiceData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update practice'
      );
    }
  }
);

export const createGuideline = createAsyncThunk(
  'expert/createGuideline',
  async ({ practiceId, versionId, guidelineData }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/expert/practices/${practiceId}/versions/${versionId}/guidelines`,
        guidelineData
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create guideline'
      );
    }
  }
);

export const updateGuideline = createAsyncThunk(
  'expert/updateGuideline',
  async ({ id, guidelineData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/expert/guidelines/${id}`, guidelineData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update guideline'
      );
    }
  }
);

export const deleteGuideline = createAsyncThunk(
  'expert/deleteGuideline',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/expert/guidelines/${id}`);
      return { id, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete guideline'
      );
    }
  }
);

export const createBenefit = createAsyncThunk(
  'expert/createBenefit',
  async ({ practiceId, versionId, benefitData }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/expert/practices/${practiceId}/versions/${versionId}/benefits`,
        benefitData
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create benefit'
      );
    }
  }
);

export const updateBenefit = createAsyncThunk(
  'expert/updateBenefit',
  async ({ id, benefitData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/expert/benefits/${id}`, benefitData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update benefit'
      );
    }
  }
);

export const deleteBenefit = createAsyncThunk(
  'expert/deleteBenefit',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/expert/benefits/${id}`);
      return { id, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete benefit'
      );
    }
  }
);

export const createPitfall = createAsyncThunk(
  'expert/createPitfall',
  async ({ practiceId, versionId, pitfallData }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/expert/practices/${practiceId}/versions/${versionId}/pitfalls`,
        pitfallData
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create pitfall'
      );
    }
  }
);

export const updatePitfall = createAsyncThunk(
  'expert/updatePitfall',
  async ({ id, pitfallData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/expert/pitfalls/${id}`, pitfallData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update pitfall'
      );
    }
  }
);

export const deletePitfall = createAsyncThunk(
  'expert/deletePitfall',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/expert/pitfalls/${id}`);
      return { id, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete pitfall'
      );
    }
  }
);

export const fetchExpertDashboard = createAsyncThunk(
  'expert/fetchExpertDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/expert/dashboard`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch expert dashboard'
      );
    }
  }
);

const expertSlice = createSlice({
  name: 'expert',
  initialState: {
    practices: [],
    currentPractice: null,
    editOptions: null,
    dashboardData: null,
    loading: false,
    error: null,
    pagination: {
      limit: 50,
      offset: 0,
      total: 0,
    },
    filters: {
      status: '',
    },
  },
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        status: '',
      };
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentPractice: (state) => {
      state.currentPractice = null;
      state.editOptions = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch expert practices
      .addCase(fetchExpertPractices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpertPractices.fulfilled, (state, action) => {
        state.loading = false;
        state.practices = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchExpertPractices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch practice for edit
      .addCase(fetchPracticeForEdit.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPracticeForEdit.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPractice = action.payload.data.practice;
        state.editOptions = action.payload.data.options;
      })
      .addCase(fetchPracticeForEdit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update practice
      .addCase(updatePractice.fulfilled, (state, action) => {
        if (state.currentPractice) {
          state.currentPractice = { ...state.currentPractice, ...action.payload.data };
        }
      })
      // Expert dashboard
      .addCase(fetchExpertDashboard.fulfilled, (state, action) => {
        state.dashboardData = action.payload.data;
      })
      // Guidelines
      .addCase(createGuideline.fulfilled, (state, action) => {
        if (state.currentPractice && state.currentPractice.guidelines) {
          state.currentPractice.guidelines.push(action.payload.data);
        }
      })
      .addCase(updateGuideline.fulfilled, (state, action) => {
        if (state.currentPractice && state.currentPractice.guidelines) {
          const index = state.currentPractice.guidelines.findIndex(g => g.id === action.payload.data.id);
          if (index !== -1) {
            state.currentPractice.guidelines[index] = action.payload.data;
          }
        }
      })
      .addCase(deleteGuideline.fulfilled, (state, action) => {
        if (state.currentPractice && state.currentPractice.guidelines) {
          state.currentPractice.guidelines = state.currentPractice.guidelines.filter(
            g => g.id !== action.payload.id
          );
        }
      })
      // Benefits
      .addCase(createBenefit.fulfilled, (state, action) => {
        if (state.currentPractice && state.currentPractice.benefits) {
          state.currentPractice.benefits.push(action.payload.data);
        }
      })
      .addCase(updateBenefit.fulfilled, (state, action) => {
        if (state.currentPractice && state.currentPractice.benefits) {
          const index = state.currentPractice.benefits.findIndex(b => b.id === action.payload.data.id);
          if (index !== -1) {
            state.currentPractice.benefits[index] = action.payload.data;
          }
        }
      })
      .addCase(deleteBenefit.fulfilled, (state, action) => {
        if (state.currentPractice && state.currentPractice.benefits) {
          state.currentPractice.benefits = state.currentPractice.benefits.filter(
            b => b.id !== action.payload.id
          );
        }
      })
      // Pitfalls
      .addCase(createPitfall.fulfilled, (state, action) => {
        if (state.currentPractice && state.currentPractice.pitfalls) {
          state.currentPractice.pitfalls.push(action.payload.data);
        }
      })
      .addCase(updatePitfall.fulfilled, (state, action) => {
        if (state.currentPractice && state.currentPractice.pitfalls) {
          const index = state.currentPractice.pitfalls.findIndex(p => p.id === action.payload.data.id);
          if (index !== -1) {
            state.currentPractice.pitfalls[index] = action.payload.data;
          }
        }
      })
      .addCase(deletePitfall.fulfilled, (state, action) => {
        if (state.currentPractice && state.currentPractice.pitfalls) {
          state.currentPractice.pitfalls = state.currentPractice.pitfalls.filter(
            p => p.id !== action.payload.id
          );
        }
      });
  },
});

export const { setFilters, clearFilters, clearError, clearCurrentPractice } = expertSlice.actions;
export default expertSlice.reducer;