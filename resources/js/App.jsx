import './bootstrap';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts & Pages
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDashboard from './pages/ProjectDashboard';
import Budget from './pages/projects/Budget';
import Revenue from './pages/projects/Revenue';
import Expenses from './pages/projects/Expenses';
import Shareholders from './pages/projects/Shareholders';
import OwnerPayments from './pages/projects/OwnerPayments';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

const ProtectedRoute = ({ children }) => {
    const { user, loading, settings } = useAuth();
    if (loading) {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    background: '#f8fafc',
                    fontFamily: 'Outfit, sans-serif',
                }}
            >
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#065f46', marginBottom: 10 }}>
                    {settings?.company_name || 'Project Finance Admin'}
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Loading...</div>
            </div>
        );
    }
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return <AppLayout>{children}</AppLayout>;
};

const GuestRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (user) {
        return <Navigate to="/" replace />;
    }
    return children;
};

// Post-login landing: Super Admin/Admin go to the centralized dashboard; everyone
// else goes straight to their one assigned project, or a picker if they have several
// (or none yet).
const RootRedirect = () => {
    const { user, hasRole } = useAuth();

    if (hasRole(['Super Admin', 'Admin'])) {
        return <Navigate to="/dashboard" replace />;
    }

    const assigned = user?.assigned_projects || [];
    if (assigned.length === 1) {
        return <Navigate to={`/projects/${assigned[0].id}`} replace />;
    }

    return <Navigate to="/projects" replace />;
};

const App = () => {
    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#10b981',
                    fontFamily: 'Plus Jakarta Sans, Outfit, sans-serif',
                    borderRadius: 8,
                },
                components: {
                    Layout: {
                        bodyBg: '#f8fafc',
                        headerBg: '#ffffff',
                    },
                },
            }}
        >
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <AuthProvider>
                        <Routes>
                            {/* Guest Routes */}
                            <Route
                                path="/login"
                                element={
                                    <GuestRoute>
                                        <Login />
                                    </GuestRoute>
                                }
                            />

                            <Route
                                path="/"
                                element={
                                    <ProtectedRoute>
                                        <RootRedirect />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/dashboard"
                                element={
                                    <ProtectedRoute>
                                        <Dashboard />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/projects"
                                element={
                                    <ProtectedRoute>
                                        <Projects />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/projects/:id"
                                element={
                                    <ProtectedRoute>
                                        <ProjectDashboard />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/projects/:id/budget"
                                element={
                                    <ProtectedRoute>
                                        <Budget />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/projects/:id/revenue"
                                element={
                                    <ProtectedRoute>
                                        <Revenue />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/projects/:id/expenses"
                                element={
                                    <ProtectedRoute>
                                        <Expenses />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/projects/:id/shareholders"
                                element={
                                    <ProtectedRoute>
                                        <Shareholders />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/projects/:id/owner-payments"
                                element={
                                    <ProtectedRoute>
                                        <OwnerPayments />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/projects/:id/reports"
                                element={
                                    <ProtectedRoute>
                                        <Reports />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/reports"
                                element={
                                    <ProtectedRoute>
                                        <Reports />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/users"
                                element={
                                    <ProtectedRoute>
                                        <Users />
                                    </ProtectedRoute>
                                }
                            />

                            <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
                            <Route
                                path="/settings/:section"
                                element={
                                    <ProtectedRoute>
                                        <Settings />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Catch All Redirect — routes through the same role/assignment-aware logic */}
                            <Route
                                path="*"
                                element={
                                    <ProtectedRoute>
                                        <RootRedirect />
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                    </AuthProvider>
                </BrowserRouter>
            </QueryClientProvider>
        </ConfigProvider>
    );
};

// Render React App
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
