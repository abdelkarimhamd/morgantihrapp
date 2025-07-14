// src/features/auth/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';          // <- adjust if your path differs
import * as authAPI from './authAPI';          // <- must export setTokenExpiry() here

// ─────────────────────────────────────────────
// THUNKS
// ─────────────────────────────────────────────
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ employee_code, password }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/login', { employee_code, password });

      // Basic response validation
      if (!data?.access_token || !data?.user) {
        return rejectWithValue('Invalid response from server');
      }

      const { access_token, refresh_token, user } = data;

      // Persist tokens + role immediately
      await AsyncStorage.multiSet([
        ['access_token', access_token],
        ['refresh_token', refresh_token ?? ''],       // some back-ends omit this
        ['role', user.role ?? ''],
      ]);

      // Record token expiry (helper lives in authAPI or wherever you choose)
      if (authAPI.setTokenExpiry) await authAPI.setTokenExpiry();

      // The *fulfilled* reducer gets exactly what it expects:
      return { user, access_token, refresh_token };
    } catch (err) {
      // Surface back-end validation message if present
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Login failed, please try again';
      return rejectWithValue(msg);
    }
  }
);

// ─────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────
const initialState = {
  user:   null,
  token:  null,
  status: 'idle',      // 'idle' | 'loading' | 'succeeded' | 'failed'
  error:  null,
};

// ─────────────────────────────────────────────
// SLICE
// ─────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user  = null;
      state.token = null;
      AsyncStorage.multiRemove(['access_token', 'refresh_token', 'role']);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error  = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';

        // Action payload guaranteed by the thunk
        state.user  = action.payload.user;
        state.token = action.payload.access_token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error  = action.payload;
      });
  },
});

// ─────────────────────────────────────────────
export const { logout } = authSlice.actions;
export default authSlice.reducer;
