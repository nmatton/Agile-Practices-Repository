import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Async thunks
export const fetchUserTeams = createAsyncThunk(
  'teams/fetchUserTeams',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/teams`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch teams'
      );
    }
  }
);

export const createTeam = createAsyncThunk(
  'teams/createTeam',
  async ({ name, description }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/teams`, {
        name,
        description,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create team'
      );
    }
  }
);

export const inviteToTeam = createAsyncThunk(
  'teams/inviteToTeam',
  async ({ teamId, email }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/teams/${teamId}/invite`, {
        email,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to send invitation'
      );
    }
  }
);

export const fetchTeamDetails = createAsyncThunk(
  'teams/fetchTeamDetails',
  async (teamId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/teams/${teamId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch team details'
      );
    }
  }
);

const teamsSlice = createSlice({
  name: 'teams',
  initialState: {
    teams: [],
    currentTeam: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentTeam: (state, action) => {
      state.currentTeam = action.payload;
    },
    clearCurrentTeam: (state) => {
      state.currentTeam = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user teams
      .addCase(fetchUserTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserTeams.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = action.payload.data || action.payload;
      })
      .addCase(fetchUserTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create team
      .addCase(createTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.loading = false;
        const newTeam = action.payload.data || action.payload.team || action.payload;
        state.teams.push(newTeam);
      })
      .addCase(createTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Invite to team
      .addCase(inviteToTeam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(inviteToTeam.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(inviteToTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch team details
      .addCase(fetchTeamDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeamDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTeam = action.payload.data || action.payload;
      })
      .addCase(fetchTeamDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, setCurrentTeam, clearCurrentTeam } = teamsSlice.actions;
export default teamsSlice.reducer;