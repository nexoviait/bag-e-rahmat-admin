import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { friendlyErrorMessage } from '../utils/errorMessage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [settings, setSettings] = useState({
        currency_symbol: '$',
        // Seed from the last known value so the initial loading screen (rendered before
        // the /api/settings fetch resolves) can show the real company name immediately.
        company_name: localStorage.getItem('cached_company_name') || undefined,
    });
    const [loading, setLoading] = useState(true);

    const refreshSettings = async () => {
        try {
            const response = await axios.get('/api/settings');
            setSettings(response.data);

            const companyName = response.data.company_name || 'Project Finance Admin';
            document.title = `${companyName} - Project Financial Management`;
            if (response.data.company_name) {
                localStorage.setItem('cached_company_name', response.data.company_name);
            } else {
                localStorage.removeItem('cached_company_name');
            }
        } catch (error) {
            console.error('Error fetching settings', error);
        }
    };


    const refreshUser = async (isRetry = false) => {
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
        try {
            const response = await axios.get('/api/me');
            setUser(response.data.user);
            await refreshSettings();
            setLoading(false);
        } catch (error) {
            // Only a genuine 401 means the token is actually invalid/expired — clear it then.
            // Any other failure (network blip, transient 5xx, timeout) is not proof the session
            // is bad, so we must NOT wipe a perfectly valid token over it — that was causing
            // random logouts on reload whenever /api/me happened to fail for an unrelated reason.
            if (error.response?.status === 401) {
                setUser(null);
                localStorage.removeItem('auth_token');
                delete axios.defaults.headers.common['Authorization'];
                setLoading(false);
            } else if (!isRetry && storedToken) {
                // Give one transient failure a second chance before giving up for this load —
                // masks brief blips (server still booting, a momentary timeout) entirely.
                console.error('Failed to verify session, retrying once:', error);
                setTimeout(() => refreshUser(true), 800);
            } else {
                console.error('Failed to verify session after retry (token kept, will try again next load):', error);
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        refreshUser();
    }, []);

    const login = async (email, password) => {
        // Deliberately NOT touching the shared `loading` flag here — that flag gates whether
        // GuestRoute/ProtectedRoute render the whole app shell (used only for the initial
        // "do we know yet if there's a session" boot check). Reusing it for a login attempt
        // unmounts the Login page mid-submit (GuestRoute renders null while loading=true),
        // wiping the just-typed form fields and any error message the moment it remounts.
        // The login button already tracks its own local loading state for the spinner.
        try {
            const response = await axios.post('/api/login', { email, password });
            const token = response.data.access_token;
            if (token) {
                localStorage.setItem('auth_token', token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }
            if (response.data.csrf_token) {
                axios.defaults.headers.common['X-CSRF-TOKEN'] = response.data.csrf_token;
                const meta = document.querySelector('meta[name="csrf-token"]');
                if (meta) {
                    meta.setAttribute('content', response.data.csrf_token);
                }
            }
            setUser(response.data.user);
            await refreshUser();
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: friendlyErrorMessage(error, {
                    422: 'The email or password you entered is incorrect.',
                    401: 'The email or password you entered is incorrect.',
                    429: 'Too many login attempts. Please wait a moment and try again.',
                }),
            };
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            await axios.post('/api/logout');
        } catch (error) {
            console.error('Logout error', error);
        } finally {
            localStorage.removeItem('auth_token');
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
            setLoading(false);
        }
    };

    const hasRole = (roleNames) => {
        if (!user || !user.roles) return false;
        const roles = Array.isArray(roleNames) ? roleNames : [roleNames];
        return user.roles.some((r) => roles.includes(r.name));
    };

    // Additive on top of hasRole: a role's assigned permissions (Settings > Role Management)
    // grant extra access without needing a code change to the hardcoded role lists above.
    const hasPermission = (permissionNames) => {
        if (!user || !user.permissions) return false;
        const perms = Array.isArray(permissionNames) ? permissionNames : [permissionNames];
        return user.permissions.some((p) => perms.includes(p));
    };

    // Super Admin and Admin are locked system roles (can't be edited in Role Management) and always
    // have full access. Every other role's access comes solely from permissions assigned in Role
    // Management — no permission assigned means no access, regardless of role name.
    const can = (permissionNames) => hasRole(['Super Admin', 'Admin']) || hasPermission(permissionNames);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                settings,
                refreshSettings,
                login,
                logout,
                refreshUser,
                hasRole,
                hasPermission,
                can,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
