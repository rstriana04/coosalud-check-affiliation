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

export const generateRCBMonthlyReport = async (startDate, endDate) => {
  const response = await api.post('/rcb-monthly/generate', {
    startDate,
    endDate
  });
  return response.data;
};

export const generateRCVReport = async (file, email) => {
  const formData = new FormData();
  formData.append('file', file);
  if (email) formData.append('email', email);

  const response = await api.post('/rcb-monthly/generate-rcv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000
  });
  return response.data;
};

export const getRCVJobStatus = async (jobId) => {
  const response = await api.get(`/rcb-monthly/rcv-status/${jobId}`);
  return response.data;
};

export const getRCVDownloadUrl = (jobId) => {
  return `${API_URL}/api/rcb-monthly/rcv-download/${jobId}`;
};

export const generatePediatricReport = async (file, email) => {
  const formData = new FormData();
  formData.append('file', file);
  if (email) formData.append('email', email);

  const response = await api.post('/rcb-monthly/generate-pediatric', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000
  });
  return response.data;
};

export const getPediatricJobStatus = async (jobId) => {
  const response = await api.get(`/rcb-monthly/rcv-status/${jobId}`);
  return response.data;
};

export const getPediatricDownloadUrl = (jobId) => {
  return `${API_URL}/api/rcb-monthly/rcv-download/${jobId}`;
};

export const generateLifecycleReport = async (file, email) => {
  const formData = new FormData();
  formData.append('file', file);
  if (email) formData.append('email', email);

  const response = await api.post('/rcb-monthly/generate-lifecycle', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000
  });
  return response.data;
};

export const getLifecycleJobStatus = async (jobId) => {
  const response = await api.get(`/rcb-monthly/rcv-status/${jobId}`);
  return response.data;
};

export const getLifecycleDownloadUrl = (jobId) => {
  return `${API_URL}/api/rcb-monthly/rcv-download/${jobId}`;
};

export const generatePlanFamiliarReport = async (file, email) => {
  const formData = new FormData();
  formData.append('file', file);
  if (email) formData.append('email', email);

  const response = await api.post('/rcb-monthly/generate-planificacion-familiar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000
  });
  return response.data;
};

export const getPlanFamiliarJobStatus = async (jobId) => {
  const response = await api.get(`/rcb-monthly/rcv-status/${jobId}`);
  return response.data;
};

export const getPlanFamiliarDownloadUrl = (jobId) => {
  return `${API_URL}/api/rcb-monthly/rcv-download/${jobId}`;
};

export const generateCitologiasReport = async (file, email) => {
  const formData = new FormData();
  formData.append('file', file);
  if (email) formData.append('email', email);

  const response = await api.post('/rcb-monthly/generate-citologias', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000
  });
  return response.data;
};

export const getCitologiasJobStatus = async (jobId) => {
  const response = await api.get(`/rcb-monthly/rcv-status/${jobId}`);
  return response.data;
};

export const getCitologiasDownloadUrl = (jobId) => {
  return `${API_URL}/api/rcb-monthly/rcv-download/${jobId}`;
};

export default api;
