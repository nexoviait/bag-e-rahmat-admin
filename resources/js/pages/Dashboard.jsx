import React from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Spin, Alert, Space, Typography, Button, Tooltip } from 'antd';
import {
    ProjectOutlined,
    BarChartOutlined,
    TeamOutlined,
    SettingOutlined,
    InfoCircleOutlined,
    ArrowRightOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatMoney, getCurrencySymbol } from '../utils/currency';
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
} from 'recharts';

const { Title, Text } = Typography;

const STATUS_COLORS = { active: 'green', on_hold: 'orange', completed: 'blue', archived: 'default' };
const PIE_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#94a3b8'];

const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
};

const Dashboard = () => {
    const { user, hasRole, settings } = useAuth();
    const isAdmin = hasRole(['Super Admin', 'Admin']);
    const symbol = getCurrencySymbol(settings);
    const navigate = useNavigate();

    const { data, isLoading, error } = useQuery({
        queryKey: ['centralizedDashboard'],
        queryFn: async () => (await axios.get('/api/dashboard')).data,
        enabled: isAdmin,
    });

    if (!isAdmin) {
        return <Navigate to="/projects" replace />;
    }

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
                <Spin size="large" tip="Loading executive dashboard..." />
            </div>
        );
    }

    if (error) {
        return <Alert type="error" showIcon message="Failed to load dashboard" description={error.message} />;
    }

    const pieData = Object.entries(data.projects_by_status || {}).map(([status, count]) => ({
        name: status.replace('_', ' '),
        value: count,
    }));

    const topColumns = [
        {
            title: 'Project Name',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <a onClick={() => navigate(`/projects/${record.id}`)} style={{ fontWeight: 600, color: '#059669' }}>
                    {text}
                </a>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (s) => <Tag color={STATUS_COLORS[s] || 'default'}>{(s || '').replace('_', ' ').toUpperCase()}</Tag>,
        },
        {
            title: 'Remaining',
            dataIndex: 'remaining',
            key: 'remaining',
            render: (v) => (
                <strong style={{ color: (v || 0) >= 0 ? '#059669' : '#dc2626' }}>
                    {formatMoney(v, symbol)}
                </strong>
            ),
        },
        {
            title: 'Profit',
            dataIndex: 'profit',
            key: 'profit',
            render: (v) => (
                <span style={{ color: (v || 0) >= 0 ? '#059669' : '#dc2626' }}>
                    {formatMoney(v, symbol)}
                </span>
            ),
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Hero Banner */}
            <div
                style={{
                    background: 'linear-gradient(135deg, #052e16 0%, #047857 50%, #10b981 100%)',
                    borderRadius: 16,
                    padding: '32px',
                    color: '#fff',
                    boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 20,
                }}
            >
                <div>
                    <Title level={2} style={{ color: '#fff', margin: '0 0 6px', fontFamily: 'Outfit', fontWeight: 700 }}>
                        {getTimeGreeting()}, {user?.name || 'Administrator'}.
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
                        Organization-wide snapshot across {data.project_count} active project{data.project_count === 1 ? '' : 's'}.
                    </Text>
                </div>
                <Space wrap>
                    <Button icon={<ProjectOutlined />} onClick={() => navigate('/projects')} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }}>
                        All Projects
                    </Button>
                    <Button icon={<BarChartOutlined />} onClick={() => navigate('/reports')} style={{ background: '#fff', color: '#065f46', border: 'none', fontWeight: 600 }}>
                        Org Reports
                    </Button>
                </Space>
            </div>

            {/* Quick KPI Statistics Cards */}
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderTop: '3px solid #10b981', borderRadius: 12 }}>
                        <Statistic
                            title={
                                <Space>
                                    <span>Total Money</span>
                                    <Tooltip title="Budget + Revenue + Shareholder Investments">
                                        <InfoCircleOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
                                    </Tooltip>
                                </Space>
                            }
                            value={data.formulas.total_money}
                            precision={2}
                            prefix={symbol}
                            valueStyle={{ color: '#065f46', fontWeight: 700 }}
                        />
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Cumulative Organization Capital</div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderTop: '3px solid #ef4444', borderRadius: 12 }}>
                        <Statistic
                            title={
                                <Space>
                                    <span>Deduct Money</span>
                                    <Tooltip title="Expenses + Owner Payments">
                                        <InfoCircleOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
                                    </Tooltip>
                                </Space>
                            }
                            value={data.formulas.deduct_money}
                            precision={2}
                            prefix={symbol}
                            valueStyle={{ color: '#b91c1c', fontWeight: 700 }}
                        />
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Cumulative Outflows</div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderTop: `3px solid ${data.formulas.remaining >= 0 ? '#10b981' : '#ef4444'}`, borderRadius: 12 }}>
                        <Statistic
                            title={
                                <Space>
                                    <span>Remaining</span>
                                    <Tooltip title="Total Money − Deduct Money">
                                        <InfoCircleOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
                                    </Tooltip>
                                </Space>
                            }
                            value={data.formulas.remaining}
                            precision={2}
                            prefix={symbol}
                            valueStyle={{ color: data.formulas.remaining >= 0 ? '#047857' : '#be123c', fontWeight: 700 }}
                        />
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Net Liquidity Pool</div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderTop: `3px solid ${data.formulas.profit >= 0 ? '#10b981' : '#ef4444'}`, borderRadius: 12 }}>
                        <Statistic
                            title={
                                <Space>
                                    <span>Operating Profit</span>
                                    <Tooltip title="Revenue − Expenses">
                                        <InfoCircleOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
                                    </Tooltip>
                                </Space>
                            }
                            value={data.formulas.profit}
                            precision={2}
                            prefix={symbol}
                            valueStyle={{ color: data.formulas.profit >= 0 ? '#047857' : '#be123c', fontWeight: 700 }}
                        />
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Total Revenue minus Expenses</div>
                    </Card>
                </Col>
            </Row>

            {/* Charts Row */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Card title="12-Month Org-Wide Financial Trend" bordered={false} style={{ borderRadius: 12, height: 420 }}>
                        <div style={{ width: '100%', height: 330 }}>
                            <ResponsiveContainer>
                                <ComposedChart data={data.monthly_trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="orgRevGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                                    <RechartsTooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
                                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" fill="url(#orgRevGrad)" strokeWidth={2} />
                                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="profit" name="Profit" stroke="#059669" strokeWidth={2} strokeDasharray="5 5" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card title="Projects by Status" bordered={false} style={{ borderRadius: 12, height: 420 }}>
                        <div style={{ width: '100%', height: 330, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {pieData.length > 0 ? (
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={4}
                                            dataKey="value"
                                            label={(entry) => `${entry.name} (${entry.value})`}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <Text type="secondary">No project data available.</Text>
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Leaderboard Tables */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card
                        title="Top Projects by Remaining"
                        bordered={false}
                        style={{ borderRadius: 12 }}
                        extra={
                            <Link to="/projects" style={{ color: '#059669', fontSize: 13 }}>
                                View All <ArrowRightOutlined />
                            </Link>
                        }
                    >
                        <Table columns={topColumns} dataSource={data.top_by_remaining} rowKey="id" pagination={false} size="small" />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="Top Projects by Profit" bordered={false} style={{ borderRadius: 12 }}>
                        <Table columns={topColumns} dataSource={data.top_by_profit} rowKey="id" pagination={false} size="small" />
                    </Card>
                </Col>
            </Row>

            {/* Navigation Shortcuts Bar */}
            <Card bordered={false} style={{ borderRadius: 12, background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                <Row gutter={[16, 16]} align="middle" justify="space-between">
                    <Col>
                        <strong style={{ color: '#334155', fontSize: 14 }}>Quick Administration Actions</strong>
                    </Col>
                    <Col>
                        <Space wrap>
                            <Button icon={<ProjectOutlined />} onClick={() => navigate('/projects')}>Projects</Button>
                            <Button icon={<BarChartOutlined />} onClick={() => navigate('/reports')}>Reports</Button>
                            <Button icon={<TeamOutlined />} onClick={() => navigate('/users')}>Users</Button>
                            <Button icon={<SettingOutlined />} onClick={() => navigate('/settings/general')}>Settings</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>
        </Space>
    );
};

export default Dashboard;

