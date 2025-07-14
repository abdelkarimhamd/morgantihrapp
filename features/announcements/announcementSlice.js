import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchAnnouncements = createAsyncThunk('announcements/fetch', async () => {
    const response = await api.get('/announcements');
    return response.data;
});

export const fetchHolidays = createAsyncThunk('holidays/fetch', async () => {
    const response = await api.get('/holidays');
    return response.data;
});

const announcementSlice = createSlice({
    name: 'announcements',
    initialState: { announcements: [], holidays: [], loading: false },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchAnnouncements.fulfilled, (state, action) => {
                state.announcements = action.payload;
            })
            .addCase(fetchHolidays.fulfilled, (state, action) => {
                state.holidays = action.payload;
            });
    }
});

export default announcementSlice.reducer;
