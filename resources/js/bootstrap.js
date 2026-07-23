import axios from 'axios';
import { message } from 'antd';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.withCredentials = true;

// Get CSRF token from head meta tag and attach to Axios headers
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
if (csrfToken) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken;
}

// Global fallback for errors individual pages don't already handle themselves — mainly session
// expiry (a 401 on any call *other* than login/me, which AuthContext already handles on its own)
// and network/server failures, so nothing surfaces a raw axios/technical error to the user.
window.axios.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url || '';
        const isAuthBootstrapCall = url.includes('/api/login') || url.includes('/api/me');

        if (!isAuthBootstrapCall) {
            if (error.response?.status === 401) {
                localStorage.removeItem('auth_token');
                delete window.axios.defaults.headers.common['Authorization'];
                if (!window.location.pathname.startsWith('/login')) {
                    message.error('Your session has expired. Please log in again.');
                    window.location.href = '/login';
                }
            } else if (!error.response) {
                message.error('Unable to reach the server. Please check your internet connection.');
            } else if (error.response.status >= 500) {
                message.error('Something went wrong on our end. Please try again shortly.');
            }
        }

        return Promise.reject(error);
    }
);
