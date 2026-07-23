import React, { useState } from 'react';
import { Card, Space, Row, Col, Statistic, Radio, DatePicker, Table, Spin, Button, Alert, Tag, Input, Tooltip } from 'antd';
import { DownloadOutlined, PrinterOutlined, SearchOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import dayjs from 'dayjs';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatMoney, getCurrencySymbol } from '../utils/currency';
import { downloadCsv } from '../utils/csv';
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
} from 'recharts';

const { RangePicker } = DatePicker;

const presetRange = (key) => {
    const today = dayjs();
    switch (key) {
        case 'month':
            return [today.startOf('month'), today.endOf('month')];
        case 'quarter':
            return [today.subtract(3, 'month').startOf('day'), today.endOf('day')];
        case 'year':
            return [today.startOf('year'), today.endOf('year')];
        case 'all':
        default:
            return null;
    }
};

const STATUS_COLORS = { active: 'green', on_hold: 'orange', completed: 'blue', archived: 'default' };

const Reports = () => {
    const { id: projectId } = useParams();
    const { hasRole, settings } = useAuth();
    const isAdmin = hasRole(['Super Admin', 'Admin']);
    const symbol = getCurrencySymbol(settings);
    const navigate = useNavigate();

    const [presetKey, setPresetKey] = useState('all');
    const [range, setRange] = useState(null);
    const [searchText, setSearchText] = useState('');

    if (!projectId && !isAdmin) {
        return <Navigate to="/projects" replace />;
    }

    const handlePresetChange = (key) => {
        setPresetKey(key);
        setRange(presetRange(key));
    };

    const handleRangeChange = (dates) => {
        setPresetKey('custom');
        setRange(dates);
    };

    const params = range ? { start_date: range[0].format('YYYY-MM-DD'), end_date: range[1].format('YYYY-MM-DD') } : {};

    const { data, isLoading, error } = useQuery({
        queryKey: [projectId ? 'projectReport' : 'orgReportOverview', projectId, params.start_date, params.end_date],
        queryFn: async () => {
            const url = projectId ? `/api/projects/${projectId}/reports` : '/api/reports/overview';
            return (await axios.get(url, { params })).data;
        },
    });

    const handleExportCsv = () => {
        if (!data) return;
        if (projectId) {
            const rows = [
                ['Budget', data.totals.budget],
                ['Revenue', data.totals.revenue],
                ['Shareholder Investment', data.totals.shareholder_investment],
                ['Expenses', data.totals.expenses],
                ['Owner Payments', data.totals.owner_payments],
                ['Total Money', data.formulas.total_money],
                ['Deduct Money', data.formulas.deduct_money],
                ['Remaining', data.formulas.remaining],
                ['Profit', data.formulas.profit],
            ];
            downloadCsv(`project_report_${projectId}.csv`, ['Metric', 'Value'], rows);
        } else {
            const rows = (data.projects || []).map((p) => [p.name, p.status, p.total_money, p.deduct_money, p.remaining, p.profit]);
            downloadCsv('org_report_overview.csv', ['Project', 'Status', 'Total Money', 'Deduct Money', 'Remaining', 'Profit'], rows);
        }
    };

    const handlePrintPdf = () => {
        window.print();
    };

    const filteredProjects = (data?.projects || []).filter((p) =>
        (p.name || '').toLowerCase().includes(searchText.toLowerCase())
    );

    const projectColumns = [
        {
            title: 'Project Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
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
            title: 'Total Money',
            dataIndex: 'total_money',
            key: 'total_money',
            sorter: (a, b) => (a.total_money || 0) - (b.total_money || 0),
            render: (v) => formatMoney(v, symbol),
        },
        {
            title: 'Deduct Money',
            dataIndex: 'deduct_money',
            key: 'deduct_money',
            sorter: (a, b) => (a.deduct_money || 0) - (b.deduct_money || 0),
            render: (v) => formatMoney(v, symbol),
        },
        {
            title: 'Remaining',
            dataIndex: 'remaining',
            key: 'remaining',
            sorter: (a, b) => (a.remaining || 0) - (b.remaining || 0),
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
            sorter: (a, b) => (a.profit || 0) - (b.profit || 0),
            render: (v) => (
                <span style={{ color: (v || 0) >= 0 ? '#059669' : '#dc2626' }}>
                    {formatMoney(v, symbol)}
                </span>
            ),
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h2 style={{ margin: 0, fontFamily: 'Outfit', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
                        {projectId ? 'Project Financial Report' : 'Organization Financial Overview'}
                    </h2>
                    <span style={{ color: '#64748b', fontSize: 13 }}>
                        {projectId
                            ? 'Comprehensive breakdown of budget, revenue, expenses, and shareholder equity.'
                            : 'Organization-wide consolidated financial summary and cross-project analysis.'}
                    </span>
                </div>
                <Space wrap>
                    <Button icon={<PrinterOutlined />} onClick={handlePrintPdf} disabled={!data}>
                        Print / PDF
                    </Button>
                    <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportCsv} disabled={!data} style={{ backgroundColor: '#059669' }}>
                        Export CSV
                    </Button>
                </Space>
            </div>

            <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <Row gutter={[16, 16]} align="middle" justify="space-between">
                    <Col xs={24} md={14}>
                        <Radio.Group value={presetKey} onChange={(e) => handlePresetChange(e.target.value)} optionType="button" buttonStyle="solid">
                            <Radio.Button value="all">All Time</Radio.Button>
                            <Radio.Button value="month">This Month</Radio.Button>
                            <Radio.Button value="quarter">Last 3 Months</Radio.Button>
                            <Radio.Button value="year">This Year</Radio.Button>
                            <Radio.Button value="custom">Custom Range</Radio.Button>
                        </Radio.Group>
                    </Col>
                    <Col xs={24} md={10} style={{ textAlign: 'right' }}>
                        <RangePicker value={range} onChange={handleRangeChange} allowClear={false} style={{ width: '100%', maxWidth: 300 }} />
                    </Col>
                </Row>
            </Card>

            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                    <Spin size="large" tip="Generating financial report..." />
                </div>
            ) : error ? (
                <Alert type="error" showIcon message="Failed to load financial report" description={error.message} />
            ) : projectId ? (
                <>
                    {/* Primary Financial Formulas */}
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} lg={6}>
                            <Card bordered={false} style={{ borderTop: '3px solid #10b981', borderRadius: 12 }}>
                                <Statistic
                                    title={
                                        <Space>
                                            <span>Total Money</span>
                                            <Tooltip title="Budget + Revenue + Shareholder Investment">
                                                <InfoCircleOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
                                            </Tooltip>
                                        </Space>
                                    }
                                    value={data.formulas.total_money}
                                    precision={2}
                                    prefix={symbol}
                                    valueStyle={{ color: '#065f46', fontWeight: 700 }}
                                />
                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Capital Inflow</div>
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
                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Capital Outflow</div>
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card bordered={false} style={{ borderTop: `3px solid ${data.formulas.remaining >= 0 ? '#10b981' : '#ef4444'}`, borderRadius: 12 }}>
                                <Statistic
                                    title={
                                        <Space>
                                            <span>Remaining Balance</span>
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
                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Available Liquid Cash</div>
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card bordered={false} style={{ borderTop: `3px solid ${data.formulas.profit >= 0 ? '#10b981' : '#ef4444'}`, borderRadius: 12 }}>
                                <Statistic
                                    title={
                                        <Space>
                                            <span>Net Profit</span>
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
                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Operating Earnings</div>
                            </Card>
                        </Col>
                    </Row>

                    {/* Detailed Component Breakdown */}
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} lg={4.8} style={{ flex: '1 1 200px' }}>
                            <Card bordered={false} style={{ borderRadius: 8, background: '#fcfdfd', border: '1px solid #e2e8f0' }}>
                                <Statistic title="Budget" value={data.totals.budget} precision={2} prefix={symbol} valueStyle={{ color: '#f59e0b', fontSize: 18 }} />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={4.8} style={{ flex: '1 1 200px' }}>
                            <Card bordered={false} style={{ borderRadius: 8, background: '#fcfdfd', border: '1px solid #e2e8f0' }}>
                                <Statistic title="Revenue" value={data.totals.revenue} precision={2} prefix={symbol} valueStyle={{ color: '#10b981', fontSize: 18 }} />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={4.8} style={{ flex: '1 1 200px' }}>
                            <Card bordered={false} style={{ borderRadius: 8, background: '#fcfdfd', border: '1px solid #e2e8f0' }}>
                                <Statistic title="Expenses" value={data.totals.expenses} precision={2} prefix={symbol} valueStyle={{ color: '#ef4444', fontSize: 18 }} />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={4.8} style={{ flex: '1 1 200px' }}>
                            <Card bordered={false} style={{ borderRadius: 8, background: '#fcfdfd', border: '1px solid #e2e8f0' }}>
                                <Statistic title="Shareholders" value={data.totals.shareholder_investment} precision={2} prefix={symbol} valueStyle={{ color: '#8b5cf6', fontSize: 18 }} />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={4.8} style={{ flex: '1 1 200px' }}>
                            <Card bordered={false} style={{ borderRadius: 8, background: '#fcfdfd', border: '1px solid #e2e8f0' }}>
                                <Statistic title="Owner Payments" value={data.totals.owner_payments} precision={2} prefix={symbol} valueStyle={{ color: '#0ea5e9', fontSize: 18 }} />
                            </Card>
                        </Col>
                    </Row>

                    {/* Chart */}
                    <Card title="Financial Performance Trend" bordered={false} style={{ borderRadius: 12, height: 420 }}>
                        <div style={{ width: '100%', height: 330 }}>
                            <ResponsiveContainer>
                                <ComposedChart data={data.monthly} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                                    <RechartsTooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
                                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" fill="url(#revGrad)" strokeWidth={2} />
                                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="budget" name="Budget" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#059669" strokeWidth={2} strokeDasharray="5 5" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </>
            ) : (
                <>
                    {/* Org-Wide Totals */}
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} lg={6}>
                            <Card bordered={false} style={{ borderTop: '3px solid #10b981', borderRadius: 12 }}>
                                <Statistic title="Total Org Money" value={data.formulas.total_money} precision={2} prefix={symbol} valueStyle={{ color: '#065f46', fontWeight: 700 }} />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card bordered={false} style={{ borderTop: '3px solid #ef4444', borderRadius: 12 }}>
                                <Statistic title="Total Org Deduct" value={data.formulas.deduct_money} precision={2} prefix={symbol} valueStyle={{ color: '#b91c1c', fontWeight: 700 }} />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card bordered={false} style={{ borderTop: `3px solid ${data.formulas.remaining >= 0 ? '#10b981' : '#ef4444'}`, borderRadius: 12 }}>
                                <Statistic title="Total Remaining" value={data.formulas.remaining} precision={2} prefix={symbol} valueStyle={{ color: data.formulas.remaining >= 0 ? '#047857' : '#be123c', fontWeight: 700 }} />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card bordered={false} style={{ borderTop: `3px solid ${data.formulas.profit >= 0 ? '#10b981' : '#ef4444'}`, borderRadius: 12 }}>
                                <Statistic title="Total Net Profit" value={data.formulas.profit} precision={2} prefix={symbol} valueStyle={{ color: data.formulas.profit >= 0 ? '#047857' : '#be123c', fontWeight: 700 }} />
                            </Card>
                        </Col>
                    </Row>

                    {/* Per-Project Table */}
                    <Card
                        title="Consolidated Project Financials"
                        bordered={false}
                        style={{ borderRadius: 12 }}
                        extra={
                            <Input
                                placeholder="Search projects..."
                                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                style={{ width: 220, borderRadius: 6 }}
                                allowClear
                            />
                        }
                    >
                        <Table
                            scroll={{ x: 'max-content' }}
                            columns={projectColumns}
                            dataSource={filteredProjects}
                            rowKey="id"
                            pagination={{ pageSize: 10, showSizeChanger: true }}
                        />
                    </Card>
                </>
            )}
        </Space>
    );
};

export default Reports;

