import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    
    return Promise.reject({
      message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
);

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return api.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const getJob = async (jobId) => {
  return api.get(`/api/jobs/${jobId}`);
};

export const startJob = async (jobId) => {
  return api.post(`/api/jobs/${jobId}/start`);
};

export const pauseJob = async (jobId) => {
  return api.post(`/api/jobs/${jobId}/pause`);
};

export const resumeJob = async (jobId) => {
  return api.post(`/api/jobs/${jobId}/resume`);
};

export const cancelJob = async (jobId) => {
  return api.post(`/api/jobs/${jobId}/cancel`);
};

export const downloadJob = (jobId) => {
  const url = `${API_URL}/api/jobs/${jobId}/download`;
  window.open(url, '_blank');
};

export const getJobRecords = async (jobId) => {
  return api.get(`/api/jobs/${jobId}/records`);
};

export const getStats = async () => {
  return api.get('/api/stats');
};

export default api;

