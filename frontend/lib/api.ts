import axios from 'axios';

const api = axios.create({
  baseURL: 'https://drive-portal-backend.onrender.com/api'
});

export default api;