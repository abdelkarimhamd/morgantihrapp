// exitEntrySlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchExitEntryRequests } from './exitEntryApi';

export const loadExitEntryRequests = createAsyncThunk(
  'exitEntry/loadRequests',
  async (_, thunkAPI) => {
    try {
      return await fetchExitEntryRequests();
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

const exitEntrySlice = createSlice({
  name: 'exitEntry',
  initialState: { list: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadExitEntryRequests.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadExitEntryRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(loadExitEntryRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default exitEntrySlice.reducer;
