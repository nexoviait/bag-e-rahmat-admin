import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Space, Dropdown, Input, Grid, Select } from 'antd';
import {
    DashboardOutlined,
    DollarCircleOutlined,
    ShoppingOutlined,
    UserOutlined,
    SettingOutlined,
    LogoutOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    BarChartOutlined,
    ProjectOutlined,
    WalletOutlined,
    TeamOutlined,
    BankOutlined,
    SearchOutlined,
    BellOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const SIDEBAR_BG = '#00170D';
const SIDEBAR_HEADER_BG = '#00170D';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const AppLayout = ({ children }) => {
    const { user, logout, hasRole, can, settings } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { id: activeProjectId } = useParams();
    const screens = useBreakpoint();
    const isMobile = !screens.lg;
    // On mobile the sidebar behaves as an off-canvas overlay (mobileOpen), while on
    // desktop it's the icon-rail collapse toggle (collapsed) — this is the single
    // effective flag everything below should read instead of the raw `collapsed` state.
    const siderCollapsed = isMobile ? !mobileOpen : collapsed;

    const isAdmin = hasRole(['Super Admin', 'Admin']);

    const { data: projects = [] } = useQuery({
        queryKey: ['projectSwitcherList'],
        queryFn: async () => (await axios.get('/api/projects')).data,
        enabled: !!activeProjectId,
    });

    if (!user) return null;

    const handleMenuClick = (item) => {
        navigate(item.key);
        if (isMobile) {
            setMobileOpen(false);
        }
    };

    const overviewItems = [];
    if (isAdmin) {
        overviewItems.push({
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: 'Centralized Dashboard',
        });
    }

    const projectItems = [
        {
            key: '/projects',
            icon: <ProjectOutlined />,
            label: 'Projects',
        },
    ];

    const currentProjectItems = [];
    if (activeProjectId) {
        currentProjectItems.push({
            key: `/projects/${activeProjectId}`,
            icon: <DashboardOutlined />,
            label: 'Project Dashboard',
        });
        if (can('view_budget')) {
            currentProjectItems.push({ key: `/projects/${activeProjectId}/budget`, icon: <WalletOutlined />, label: 'Budget' });
        }
        if (can('view_revenue')) {
            currentProjectItems.push({ key: `/projects/${activeProjectId}/revenue`, icon: <DollarCircleOutlined />, label: 'Revenue' });
        }
        if (can('view_expenses')) {
            currentProjectItems.push({ key: `/projects/${activeProjectId}/expenses`, icon: <ShoppingOutlined />, label: 'Expenses' });
        }
        if (can('view_shareholders')) {
            currentProjectItems.push({ key: `/projects/${activeProjectId}/shareholders`, icon: <TeamOutlined />, label: 'Shareholders' });
        }
        if (can('view_owner_payments')) {
            currentProjectItems.push({ key: `/projects/${activeProjectId}/owner-payments`, icon: <BankOutlined />, label: 'Owner Payments' });
        }
        currentProjectItems.push({ key: `/projects/${activeProjectId}/reports`, icon: <BarChartOutlined />, label: 'Project Reports' });
    }

    const insightsItems = [];
    if (isAdmin) {
        insightsItems.push({ key: '/reports', icon: <BarChartOutlined />, label: 'Reports' });
    }

    const adminItems = [];
    if (isAdmin) {
        adminItems.push({ key: '/users', icon: <TeamOutlined />, label: 'Users' });

        const settingsChildren = [{ key: '/settings/general', label: 'General Parameters' }];
        settingsChildren.push({ key: '/settings/roles', label: 'Role Management' });
        adminItems.push({ key: '/settings', icon: <SettingOutlined />, label: 'Settings', children: settingsChildren });
    } else if (can('manage_settings')) {
        adminItems.push({
            key: '/settings',
            icon: <SettingOutlined />,
            label: 'Settings',
            children: [{ key: '/settings/general', label: 'General Parameters' }],
        });
    }

    const menuItems = [];
    if (overviewItems.length > 0) {
        menuItems.push({ key: 'grp-overview', type: 'group', label: 'Overview', children: overviewItems });
    }
    menuItems.push({ key: 'grp-projects', type: 'group', label: 'Projects', children: projectItems });
    if (currentProjectItems.length > 0) {
        menuItems.push({ key: 'grp-current-project', type: 'group', label: 'Current Project', children: currentProjectItems });
    }
    if (insightsItems.length > 0) {
        menuItems.push({ key: 'grp-insights', type: 'group', label: 'Insights', children: insightsItems });
    }
    if (adminItems.length > 0) {
        menuItems.push({ key: 'grp-admin', type: 'group', label: 'Admin', children: adminItems });
    }

    const userDropdownMenu = {
        items: [
            {
                key: 'logout',
                label: 'Sign Out',
                icon: <LogoutOutlined />,
                danger: true,
                onClick: logout,
            },
        ],
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* Backdrop: closes the off-canvas sidebar on mobile when tapped outside it */}
            {isMobile && mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.45)',
                        zIndex: 999,
                    }}
                />
            )}

            <Sider
                trigger={null}
                collapsible
                collapsed={siderCollapsed}
                collapsedWidth={isMobile ? 0 : 80}
                width={250}
                style={{
                    boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
                    background: SIDEBAR_BG,
                    position: isMobile ? 'fixed' : 'sticky',
                    insetInlineStart: 0,
                    top: 0,
                    zIndex: isMobile ? 1000 : undefined,
                    height: '100vh',
                    overflow: 'hidden',
                }}
            >
                {/* AntD's Sider wraps children in its own .ant-layout-sider-children div, which is
                    NOT a flex container by default — this wrapper is what actually establishes the
                    flex column so the Menu's flex:1 + minHeight:0 can size it and enable scrolling. */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div
                        style={{
                            height: 64,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: siderCollapsed ? 'center' : 'flex-start',
                            paddingLeft: siderCollapsed ? 0 : 20,
                            background: SIDEBAR_HEADER_BG,
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            overflow: 'hidden',
                        }}
                    >
                        {settings?.logo_url ? (
                            <img
                                src={settings.logo_url}
                                alt={settings?.company_name || 'Company logo'}
                                style={{
                                    height: 'auto',
                                    maxHeight: siderCollapsed ? 36 : 48,
                                    maxWidth: siderCollapsed ? 36 : 160,
                                    objectFit: 'contain',
                                }}
                            />
                        ) : (
                            <Space size="middle">
                                <Avatar
                                    shape="square"
                                    size="small"
                                    style={{ backgroundColor: '#10b981', fontWeight: 'bold' }}
                                >
                                    {(settings?.company_name || 'Project Finance').charAt(0)}
                                </Avatar>
                                {!siderCollapsed && (
                                    <span style={{ color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'Outfit' }}>
                                        {settings?.company_name || 'Project Finance'}
                                    </span>
                                )}
                            </Space>
                        )}
                    </div>

                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[location.pathname]}
                        defaultOpenKeys={
                            ['/settings/general', '/settings/roles'].includes(location.pathname) ? ['/settings'] : []
                        }
                        onClick={handleMenuClick}
                        items={menuItems}
                        style={{ background: 'transparent', padding: '10px 0', flex: 1, minHeight: 0, overflowY: 'auto' }}
                    />
                </div>
            </Sider>

            <Layout>
                <Header
                    style={{
                        background: '#fff',
                        padding: isMobile ? '0 12px' : '0 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: isMobile ? 8 : 20,
                        boxShadow: '0 1px 4px rgba(0,21,41,.08)',
                        zIndex: 1,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                        <Button
                            type="text"
                            icon={siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => (isMobile ? setMobileOpen(!mobileOpen) : setCollapsed(!collapsed))}
                            style={{ fontSize: '16px', width: 64, height: 64, flexShrink: 0 }}
                        />
                        {activeProjectId && projects.length > 0 && (
                            <Select
                                value={Number(activeProjectId)}
                                style={{ minWidth: 220, maxWidth: 320 }}
                                onChange={(projectId) => {
                                    const suffix = location.pathname.split(`/projects/${activeProjectId}`)[1] || '';
                                    navigate(`/projects/${projectId}${suffix}`);
                                }}
                                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                            />
                        )}
                        {!activeProjectId && screens.md && (
                            <Input
                                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                                placeholder="Search projects..."
                                style={{
                                    maxWidth: 420,
                                    borderRadius: 999,
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                }}
                            />
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 20, flexShrink: 0 }}>
                        {screens.sm && (
                            <Button
                                type="text"
                                shape="circle"
                                icon={<BellOutlined style={{ fontSize: 16 }} />}
                            />
                        )}

                        {/* User Details Dropdown */}
                        <Dropdown menu={userDropdownMenu} placement="bottomRight" trigger={['click']}>
                            <a onClick={(e) => e.preventDefault()} style={{ cursor: 'pointer' }}>
                                <Space>
                                    <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#10b981' }} />

                                    {screens.sm && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            lineHeight: '1.2',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                                            {user.name}
                                        </span>
                                        <span style={{ fontSize: 11, color: '#64748b' }}>
                                            {user.roles?.[0]?.name || 'Staff'}
                                        </span>
                                    </div>
                                    )}
                                </Space>
                            </a>
                        </Dropdown>
                    </div>
                </Header>

                <Content
                    style={{
                        margin: isMobile ? '12px' : '24px',
                        minHeight: 280,
                        overflowY: 'auto',
                    }}
                >
                    {children}
                </Content>
            </Layout>
        </Layout>
    );
};

export default AppLayout;
