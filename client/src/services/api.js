import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token on unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if not already there
      if (!window.location.pathname.includes('login')) {
        window.location.href = '/login';
      }
    }
    const message = error.response?.data?.error || error.response?.data?.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

// ==================== AUTH APIs ====================

/**
 * Send OTP to email
 */
export const sendOTP = async (email, role) => {
  const response = await api.post('/auth/send-otp', { email, role });
  return response.data;
};

/**
 * Verify OTP
 */
export const verifyOTP = async (email, otp) => {
  const response = await api.post('/auth/verify-otp', { email, otp });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify({
      email: response.data.email,
      role: response.data.role
    }));
  }
  return response.data;
};

/**
 * Logout
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// ==================== SESSION APIs ====================

/**
 * Create a new attendance session
 */
export const createSession = async (sessionData) => {
  const response = await api.post('/create-session', sessionData);
  return response.data;
};

/**
 * Get session by ID
 */
export const getSession = async (sessionId, withQR = false) => {
  const response = await api.get(`/session/${sessionId}`, {
    params: { withQR: withQR ? 'true' : 'false' }
  });
  return response.data;
};

/**
 * Get all sessions
 */
export const getAllSessions = async () => {
  const response = await api.get('/sessions');
  return response.data;
};

/**
 * Close a session
 */
export const closeSession = async (sessionId) => {
  const response = await api.patch(`/session/${sessionId}/close`);
  return response.data;
};

// ==================== ATTENDANCE APIs ====================

/**
 * Mark attendance
 */
export const markAttendance = async (attendanceData) => {
  const response = await api.post('/mark-attendance', attendanceData);
  return response.data;
};

/**
 * Get attendance for a session
 */
export const getAttendance = async (sessionId) => {
  const response = await api.get(`/attendance/${sessionId}`);
  return response.data;
};

/**
 * Check if student already marked attendance
 */
export const checkAttendance = async (sessionId, studentId) => {
  const response = await api.get(`/check-attendance/${sessionId}/${studentId}`);
  return response.data;
};

// ==================== EXPORT APIs ====================

/**
 * Export attendance as CSV
 */
export const exportAttendance = async (sessionId) => {
  const response = await api.get(`/export-attendance/${sessionId}`, {
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Get attendance summary
 */
export const getAttendanceSummary = async (sessionId) => {
  const response = await api.get(`/attendance-summary/${sessionId}`);
  return response.data;
};

// ==================== HEALTH CHECK ====================

/**
 * Check API health
 */
export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;

