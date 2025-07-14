// src/features/auth/authAPI.js
import api from '../../services/api';

export const login = async ({ employee_code, password }) => {
  // Adjust the payload to match your back-end's requirement
  const response = await api.post('/login', { employee_code, password });
  console.log(response.data);

  
  return response.data; // { user, token }
};
 