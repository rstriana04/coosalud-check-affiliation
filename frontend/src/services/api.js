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

export const getTemplateDownloadUrl = (module) => {
  return `${API_URL}/api/rcb-monthly/template/${module}`;
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

export const generateGestantesReport = async (file, email) => {
  const formData = new FormData();
  formData.append('file', file);
  if (email) formData.append('email', email);

  const response = await api.post('/rcb-monthly/generate-gestantes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000
  });
  return response.data;
};

export const getGestantesJobStatus = async (jobId) => {
  const response = await api.get(`/rcb-monthly/rcv-status/${jobId}`);
  return response.data;
};

export const getGestantesDownloadUrl = (jobId) => {
  return `${API_URL}/api/rcb-monthly/rcv-download/${jobId}`;
};

export const generateResolucion202Report = async (file, options) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('periodoInicio', options.periodoInicio);
  formData.append('periodoFin', options.periodoFin);
  if (options.codigoHabilitacion) formData.append('codigoHabilitacion', options.codigoHabilitacion);
  if (options.codigoEntidad) formData.append('codigoEntidad', options.codigoEntidad);
  if (options.regimen) formData.append('regimen', options.regimen);
  if (options.email) formData.append('email', options.email);

  const response = await api.post('/resolucion-202/generate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000
  });
  return response.data;
};

export const generateResolucion202FromDB = async (options) => {
  const response = await api.post('/resolucion-202/generate-from-db', options);
  return response.data;
};

export const validateResolucion202 = async (file, periodoInicio, periodoFin) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('periodoInicio', periodoInicio);
  formData.append('periodoFin', periodoFin);

  const response = await api.post('/resolucion-202/validate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000
  });
  return response.data;
};

export const getResolucion202JobStatus = async (jobId) => {
  const response = await api.get(`/resolucion-202/status/${jobId}`);
  return response.data;
};

export const getResolucion202DownloadUrl = (jobId) => {
  return `${API_URL}/api/resolucion-202/download/${jobId}`;
};

export const getResolucion202Periods = async () => {
  const response = await api.get('/resolucion-202/periods');
  return response.data;
};

export const getResolucion202PatientCount = async (period) => {
  const response = await api.get(`/resolucion-202/patient-count/${period}`);
  return response.data;
};

export default api;
