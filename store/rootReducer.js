import { combineReducers } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import userReducer from '../features/user/userSlice';
import announcementReducer from '../features/announcements/announcementSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  announcements: announcementReducer,
});

export default rootReducer;
