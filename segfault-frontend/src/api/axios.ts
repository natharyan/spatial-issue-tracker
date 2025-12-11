import axios from 'axios';

import { AZURE_BACKEND_URL } from '../constants';

const API_BASE_URL = AZURE_BACKEND_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});


api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);


api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized - redirect to login or clear auth state
            console.log('[Axios] 401 Unauthorized on:', error.config?.url);
            console.log('[Axios] Current authToken:', localStorage.getItem('authToken')?.substring(0, 30) + '...');
            localStorage.removeItem('authToken');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;


export const authAPI = {
    loginWithGoogle: async (code: string) => {
        const response = await api.post('/auth/google', { code });
        return response.data;
    },

    loginAsGuest: async () => {
        const response = await api.post('/auth/guest');
        return response.data;
    },


    login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    },

    verify2FA: async (userId: number, code: string) => {
        const response = await api.post('/auth/verify-2fa', { userId, code });
        return response.data;
    },


    register: async (email: string, password: string, name?: string) => {
        const response = await api.post('/auth/register', { email, password, name });
        return response.data;
    },

    logout: async () => {
        const response = await api.post('/auth/logout');
        localStorage.removeItem('authToken');
        return response.data;
    },
};
