import React from 'react';
import { Card, Row, Col, Statistic, Tag, List, Space, Spin, Alert, Button, Typography } from 'antd';
import {
    WalletOutlined,
    DollarCircleOutlined,
    ShoppingOutlined,
    TeamOutlined,
    BankOutlined,
    ArrowUpOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import dayjs from 'dayjs';
import { useParams, Link } from 'react-router-dom';
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
    Tooltip,
    Legend,
} from 'recharts';

const { Title, Text } = Typography;

const STATUS_COLORS = { active: 'green', on_hold: 'orange', completed: 'blue', archived: 'default' };

const ACTIVITY_ICONS = {
    Budget: <WalletOutlined style={{ color: '#f59e0b' }} />,
    Revenue: <DollarCircleOutlined style={{ color: '#10b981' }} />,
    Expense: <ShoppingOutlined style={{ color: '#ef4444' }} />,
    'Shareholder Investment': <TeamOutlined style={{ color: '#8b5cf6' }} />,
    'Owner Payment': <BankOutlined style={{ color: '#0ea5e9' }} />,
};

const ProjectDashboard = () => {
    const { id } = useParams();
    const { settings, can } = useAuth();
    const symbol = getCurrencySymbol(settings);

    const { data, isLoading, error } = useQuery({
        queryKey: ['projectDashboard', id],
        queryFn: async () => (await axios.get(`/api/projects/${id}/dashboard`)).data,
    });

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
                <Spin size="large" tip="Loading project dashboard..." />
            </div>
        );
    }

    if (error) {
        return (
            <Alert
                type="error"
                showIcon
                message="Failed to load project dashboard"
                description={error.response?.status === 403 ? 'You are not assigned to this project.' : error.message}
            />
        );
    }

    const { project, formulas, monthly, recent_activity: recentActivity } = data;

    const quickLinks = [
        can('view_budget') && { to: `/projects/${id}/budget`, icon: <WalletOutlined />, label: 'Budget' },
        can('view_revenue') && { to: `/projects/${id}/revenue`, icon: <DollarCircleOutlined />, label: 'Revenue' },
        can('view_expenses') && { to: `/projects/${id}/expenses`, icon: <ShoppingOutlined />, label: 'Expenses' },
        can('view_shareholders') && { to: `/projects/${id}/shareholders`, icon: <TeamOutlined />, label: 'Shareholders' },
        can('view_owner_payments') && { to: `/projects/${id}/owner-payments`, icon: <BankOutlined />, label: 'Owner Payments' },
        { to: `/projects/${id}/reports`, icon: <ArrowUpOutlined />, label: 'Reports' },
    ].filter(Boolean);

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <Title level={3} style={{ margin: 0, fontFamily: 'Outfit' }}>{project.name}</Title>
                    <Tag color={STATUS_COLORS[project.status] || 'default'}>{(project.status || '').replace('_', ' ').toUpperCase()}</Tag>
                </div>
                <Space wrap>
                    {quickLinks.map((link) => (
                        <Link key={link.to} to={link.to}>
                            <Button icon={link.icon}>{link.label}</Button>
                        </Link>
                    ))}
                </Space>
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderTop: '3px solid #10b981' }}>
                        <Statistic
                            title="Total Money"
                            value={formulas.total_money}
                            precision={2}
                            prefix={symbol}
                            valueStyle={{ color: '#065f46', fontWeight: 700 }}
                        />
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Budget + Revenue + Shareholder Investment</div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderTop: '3px solid #ef4444' }}>
                        <Statistic
                            title="Deduct Money"
                            value={formulas.deduct_money}
                            precision={2}
                            prefix={symbol}
                            valueStyle={{ color: '#b91c1c', fontWeight: 700 }}
                        />
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Expenses + Owner Payments</div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderTop: `3px solid ${formulas.remaining >= 0 ? '#10b981' : '#ef4444'}` }}>
                        <Statistic
                            title="Remaining"
                            value={formulas.remaining}
                            precision={2}
                            prefix={symbol}
                            valueStyle={{ color: formulas.remaining >= 0 ? '#047857' : '#be123c', fontWeight: 700 }}
                        />
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Total Money − Deduct Money</div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderTop: `3px solid ${formulas.profit >= 0 ? '#10b981' : '#ef4444'}` }}>
                        <Statistic
                            title="Profit"
                            value={formulas.profit}
                            precision={2}
                            prefix={symbol}
                            valueStyle={{ color: formulas.profit >= 0 ? '#047857' : '#be123c', fontWeight: 700 }}
                        />
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Revenue − Expenses</div>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Card title="12-Month Financial Trend" bordered={false} style={{ height: 420 }}>
                        <div style={{ width: '100%', height: 330 }}>
                            <ResponsiveContainer>
                                <ComposedChart data={monthly} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
                                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} fill="url(#revenueFill)" />
                                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="budget" name="Budget" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="profit" name="Profit" stroke="#059669" strokeWidth={2} strokeDasharray="5 5" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card title="Recent Activity" bordered={false} style={{ height: 420, overflow: 'hidden' }}>
                        <div style={{ maxHeight: 330, overflowY: 'auto' }}>
                            <List
                                dataSource={recentActivity}
                                locale={{ emptyText: 'No transactions recorded yet.' }}
                                renderItem={(item) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            avatar={ACTIVITY_ICONS[item.type]}
                                            title={<span style={{ fontSize: 13 }}>{item.type}</span>}
                                            description={
                                                <span style={{ fontSize: 12, color: '#64748b' }}>
                                                    {item.description || '—'} · {dayjs(item.entry_date).format('DD MMM YYYY')}
                                                </span>
                                            }
                                        />
                                        <strong>{formatMoney(item.amount, symbol)}</strong>
                                    </List.Item>
                                )}
                            />
                        </div>
                    </Card>
                </Col>
            </Row>
        </Space>
    );
};

export default ProjectDashboard;
