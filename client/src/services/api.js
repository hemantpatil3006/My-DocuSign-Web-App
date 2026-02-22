
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
    timeout: 120000 // 120 seconds to handle Render cold start (free tier can take 50+ seconds)
});

api.interceptors.request.use(
    (config) => {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                
                if (!refreshToken) {
                     localStorage.removeItem('accessToken');
                     localStorage.removeItem('refreshToken');
                     
                     // Avoid redirecting to login if user is on a guest or public page
                     const isPublicPage = window.location.pathname.startsWith('/sign/') || 
                                         window.location.pathname.startsWith('/reset-password/');
                                         
                     if (!isPublicPage) {
                        window.location.href = '/login';
                     }
                     return Promise.reject(error);
                }
                
                const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/auth/refresh`, {
                    refreshToken,
                });

                const { accessToken, refreshToken: newRefreshToken } = res.data;
                
                localStorage.setItem('accessToken', accessToken);
                if (newRefreshToken) {
                     localStorage.setItem('refreshToken', newRefreshToken);
                }
                
                api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (err) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                
                // Avoid redirecting to login if user is on a guest or public page
                const isPublicPage = window.location.pathname.startsWith('/sign/') || 
                                    window.location.pathname.startsWith('/reset-password/');

                if (!isPublicPage) {
                    window.location.href = '/login';
                }
            }
        }
        
        return Promise.reject(error);
    }
);

export default api;
