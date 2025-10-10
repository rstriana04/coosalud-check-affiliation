import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  return response.data;
};

export const startProcessing = async (jobId) => {
  const response = await api.post(`/jobs/${jobId}/start`);
  return response.data;
};

export const pauseProcessing = async (jobId) => {
  const response = await api.post(`/jobs/${jobId}/pause`);
  return response.data;
};

export const resumeProcessing = async (jobId) => {
  const response = await api.post(`/jobs/${jobId}/resume`);
  return response.data;
};

export const cancelProcessing = async (jobId) => {
  const response = await api.post(`/jobs/${jobId}/cancel`);
  return response.data;
};

export const downloadResults = (jobId) => {
  return `${API_URL}/api/jobs/${jobId}/download`;
};

export const getJobHistory = async (limit = 20) => {
  const response = await api.get('/history', { params: { limit } });
  return response.data;
};

export const getJobDetails = async (jobId) => {
  const response = await api.get(`/history/${jobId}`);
  return response.data;
};

export const deleteJob = async (jobId) => {
  const response = await api.delete(`/history/${jobId}`);
  return response.data;
};

export default api;
