import React, { useState } from 'react';
import {
    Card,
    Form,
    Input,
    Button,
    Space,
    Row,
    Col,
    Table,
    message,
    Popconfirm,
    Spin,
    Modal,
    Tag,
    Upload,
    Avatar,
    Checkbox,
    Tabs,
    Tooltip,
} from 'antd';
import {
    SettingOutlined,
    PlusOutlined,
    DeleteOutlined,
    EditOutlined,
    SafetyCertificateOutlined,
    UploadOutlined,
    PictureOutlined,
    CheckSquareOutlined,
    BorderOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/currency';

const permissionGroups = {
    Budget: [
        { name: 'view_budget', label: 'View Budget' },
        { name: 'create_budget', label: 'Create Budget Entries' },
        { name: 'edit_budget', label: 'Edit Budget Entries' },
        { name: 'delete_budget', label: 'Delete Budget Entries' },
    ],
    Revenue: [
        { name: 'view_revenue', label: 'View Revenue' },
        { name: 'create_revenue', label: 'Create Revenue Entries' },
        { name: 'edit_revenue', label: 'Edit Revenue Entries' },
        { name: 'delete_revenue', label: 'Delete Revenue Entries' },
    ],
    Expenses: [
        { name: 'view_expenses', label: 'View Expenses' },
        { name: 'create_expenses', label: 'Create Expense Entries' },
        { name: 'edit_expenses', label: 'Edit Expense Entries' },
        { name: 'delete_expenses', label: 'Delete Expense Entries' },
    ],
    Shareholders: [
        { name: 'view_shareholders', label: 'View Shareholder Investments' },
        { name: 'create_shareholders', label: 'Create Shareholder Investments' },
        { name: 'edit_shareholders', label: 'Edit Shareholder Investments' },
        { name: 'delete_shareholders', label: 'Delete Shareholder Investments' },
    ],
    'Owner Payments': [
        { name: 'view_owner_payments', label: 'View Owner Payments' },
        { name: 'create_owner_payments', label: 'Create Owner Payments' },
        { name: 'edit_owner_payments', label: 'Edit Owner Payments' },
        { name: 'delete_owner_payments', label: 'Delete Owner Payments' },
    ],
    System: [
        { name: 'view_audit_logs', label: 'View Security Audit Trail' },
        { name: 'manage_settings', label: 'Manage Global Settings' },
    ],
};

const ALL_PERMISSION_NAMES = Object.values(permissionGroups)
    .flat()
    .map((p) => p.name);

const CORE_ROLES = ['Super Admin', 'Admin'];

const Settings = () => {
    const queryClient = useQueryClient();
    const { refreshSettings, hasRole, can } = useAuth();
    const { section } = useParams();
    const navigate = useNavigate();
    const isAdmin = hasRole(['Super Admin', 'Admin']);

    const canAccessSection = section === 'roles' ? isAdmin : (can('manage_settings') || isAdmin);
    if (!canAccessSection) {
        return <Navigate to="/" replace />;
    }
    if (!['general', 'roles'].includes(section)) {
        return <Navigate to="/settings/general" replace />;
    }

    const [settingsForm] = Form.useForm();
    const [roleModal, setRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [roleForm] = Form.useForm();

    const currentCurrencySymbol = Form.useWatch('currency_symbol', settingsForm) || '$';

    const { data: settings = {}, isLoading: settingsLoading } = useQuery({
        queryKey: ['globalSettings'],
        queryFn: async () => {
            const res = await axios.get('/api/settings');
            settingsForm.setFieldsValue({
                company_name: res.data.company_name,
                company_address: res.data.company_address,
                company_email: res.data.company_email,
                company_phone: res.data.company_phone,
                currency_symbol: res.data.currency_symbol || '$',
            });

            return res.data;
        },
    });

    const { data: roles = [], isLoading: rolesLoading } = useQuery({
        queryKey: ['roles'],
        queryFn: async () => (await axios.get('/api/roles')).data,
        enabled: section === 'roles',
    });

    const saveSettingsMutation = useMutation({
        mutationFn: (values) => axios.post('/api/settings', values),
        onSuccess: (res) => {
            message.success(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['globalSettings'] });
            refreshSettings();
        },
        onError: (err) => message.error(err.response?.data?.message || 'Error updating settings'),
    });

    const uploadLogoMutation = useMutation({
        mutationFn: (file) => {
            const formData = new FormData();
            formData.append('logo', file);

            return axios.post('/api/settings/logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: (res) => {
            message.success(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['globalSettings'] });
            refreshSettings();
        },
        onError: (err) => message.error(err.response?.data?.message || 'Error uploading logo'),
    });

    const removeLogoMutation = useMutation({
        mutationFn: () => axios.delete('/api/settings/logo'),
        onSuccess: (res) => {
            message.success(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['globalSettings'] });
            refreshSettings();
        },
        onError: (err) => message.error(err.response?.data?.message || 'Error removing logo'),
    });

    const uploadFaviconMutation = useMutation({
        mutationFn: (file) => {
            const formData = new FormData();
            formData.append('favicon', file);

            return axios.post('/api/settings/favicon', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: (res) => {
            message.success(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['globalSettings'] });
            refreshSettings();

            const link = document.querySelector("link[rel~='icon']");
            if (link) link.href = res.data.favicon_url;
        },
        onError: (err) => message.error(err.response?.data?.message || 'Error uploading favicon'),
    });

    const removeFaviconMutation = useMutation({
        mutationFn: () => axios.delete('/api/settings/favicon'),
        onSuccess: (res) => {
            message.success(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['globalSettings'] });
            refreshSettings();

            const link = document.querySelector("link[rel~='icon']");
            if (link) link.href = '/favicon.ico';
        },
        onError: (err) => message.error(err.response?.data?.message || 'Error removing favicon'),
    });

    const addRoleMutation = useMutation({
        mutationFn: (data) => axios.post('/api/roles', data),
        onSuccess: (res) => {
            message.success(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            setRoleModal(false);
            roleForm.resetFields();
        },
        onError: (err) => message.error(err.response?.data?.message || 'Error creating role'),
    });

    const updateRoleMutation = useMutation({
        mutationFn: ({ id, data }) => axios.put(`/api/roles/${id}`, data),
        onSuccess: (res) => {
            message.success(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            setRoleModal(false);
            setEditingRole(null);
            roleForm.resetFields();
        },
        onError: (err) => message.error(err.response?.data?.message || 'Error updating role'),
    });

    const deleteRole = async (id) => {
        try {
            const res = await axios.delete(`/api/roles/${id}`);
            message.success(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        } catch (err) {
            message.error(err.response?.data?.message || 'Error removing role');
        }
    };

    const handleOpenRoleModal = (role = null) => {
        setEditingRole(role);
        if (role) {
            roleForm.setFieldsValue({
                name: role.name,
                permissions: (role.permissions || []).map((p) => p.name),
            });
        } else {
            roleForm.resetFields();
        }
        setRoleModal(true);
    };

    const handleRoleSubmit = (values) => {
        if (editingRole) {
            updateRoleMutation.mutate({ id: editingRole.id, data: values });
        } else {
            addRoleMutation.mutate(values);
        }
    };

    const handleSelectAllPermissions = () => {
        roleForm.setFieldsValue({ permissions: ALL_PERMISSION_NAMES });
    };

    const handleClearAllPermissions = () => {
        roleForm.setFieldsValue({ permissions: [] });
    };

    const tabItems = [
        {
            key: 'general',
            label: (
                <span>
                    <SettingOutlined /> General Parameters
                </span>
            ),
        },
        ...(isAdmin
            ? [
                  {
                      key: 'roles',
                      label: (
                          <span>
                              <SafetyCertificateOutlined /> Role Management
                          </span>
                      ),
                  },
              ]
            : []),
    ];

    const renderSection = () => {
        if (section === 'general') {
            return (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <Card
                        title={
                            <span>
                                <PictureOutlined style={{ marginRight: 8, color: '#059669' }} />
                                Company Branding
                            </span>
                        }
                        bordered={false}
                        style={{ borderRadius: 12 }}
                    >
                        <p style={{ color: '#64748b', marginBottom: 20 }}>
                            Upload your company logo once — it will appear in the sidebar navigation and future generated documents.
                        </p>
                        <Space align="center" size={20} style={{ marginBottom: 4 }}>
                            <Avatar
                                shape="square"
                                size={72}
                                src={settings.logo_url}
                                icon={!settings.logo_url && <PictureOutlined />}
                                style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8 }}
                            />
                            <Upload
                                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                showUploadList={false}
                                beforeUpload={(file) => {
                                    uploadLogoMutation.mutate(file);
                                    return false;
                                }}
                            >
                                <Button icon={<UploadOutlined />} loading={uploadLogoMutation.isPending}>
                                    {settings.logo_url ? 'Replace Logo' : 'Upload Logo'}
                                </Button>
                            </Upload>
                            {settings.logo_url && (
                                <Popconfirm title="Remove company logo?" onConfirm={() => removeLogoMutation.mutate()} okText="Remove" okButtonProps={{ danger: true }}>
                                    <Button danger icon={<DeleteOutlined />} loading={removeLogoMutation.isPending}>
                                        Remove
                                    </Button>
                                </Popconfirm>
                            )}
                        </Space>
                        <div style={{ marginTop: 24, borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
                            <p style={{ color: '#64748b', marginBottom: 20 }}>
                                Upload your company favicon — it updates the browser tab icon in real time.
                            </p>
                            <Space align="center" size={20} style={{ marginBottom: 4 }}>
                                <Avatar
                                    shape="square"
                                    size={48}
                                    src={settings.favicon_url || '/favicon.ico'}
                                    icon={!settings.favicon_url && <PictureOutlined />}
                                    style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8 }}
                                />
                                <Upload
                                    accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/jpeg,image/svg+xml,image/webp"
                                    showUploadList={false}
                                    beforeUpload={(file) => {
                                        uploadFaviconMutation.mutate(file);
                                        return false;
                                    }}
                                >
                                    <Button icon={<UploadOutlined />} loading={uploadFaviconMutation.isPending}>
                                        {settings.favicon_url && settings.favicon_url !== '/favicon.ico' ? 'Replace Favicon' : 'Upload Favicon'}
                                    </Button>
                                </Upload>
                                {settings.favicon_url && settings.favicon_url !== '/favicon.ico' && (
                                    <Popconfirm title="Remove favicon?" onConfirm={() => removeFaviconMutation.mutate()} okText="Remove" okButtonProps={{ danger: true }}>
                                        <Button danger icon={<DeleteOutlined />} loading={removeFaviconMutation.isPending}>
                                            Remove
                                        </Button>
                                    </Popconfirm>
                                )}
                            </Space>
                        </div>
                    </Card>

                    <Card
                        title={
                            <span>
                                <SettingOutlined style={{ marginRight: 8, color: '#059669' }} />
                                General System Parameters
                            </span>
                        }
                        bordered={false}
                        style={{ borderRadius: 12 }}
                    >
                        {settingsLoading ? (
                            <Spin />
                        ) : (
                            <Form form={settingsForm} layout="vertical" onFinish={(v) => saveSettingsMutation.mutate(v)} style={{ maxWidth: 600 }}>
                                <Form.Item name="company_name" label="Company / Organization Name" rules={[{ required: true, message: 'Company name is required' }]}>
                                    <Input placeholder="Project Finance Admin" />
                                </Form.Item>
                                <Form.Item name="company_address" label="Company Address">
                                    <Input.TextArea rows={2} placeholder="123 Corporate Way, City, Country" />
                                </Form.Item>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="company_email" label="Contact Email">
                                            <Input placeholder="billing@example.com" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="company_phone" label="Contact Phone">
                                            <Input placeholder="+1 555 0100" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16} align="bottom">
                                    <Col span={12}>
                                        <Form.Item name="currency_symbol" label="Currency Symbol" rules={[{ required: true, message: 'Currency symbol required' }]}>
                                            <Input placeholder="$" style={{ maxWidth: 140 }} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <div style={{ marginBottom: 24, fontSize: 13, color: '#64748b' }}>
                                            Live format preview: <strong>{formatMoney(12500.5, currentCurrencySymbol)}</strong>
                                        </div>
                                    </Col>
                                </Row>
                                <Form.Item style={{ marginTop: 12 }}>
                                    <Button type="primary" htmlType="submit" loading={saveSettingsMutation.isPending} style={{ backgroundColor: '#059669' }}>
                                        Save Global Settings
                                    </Button>
                                </Form.Item>
                            </Form>
                        )}
                    </Card>
                </Space>
            );
        }

        if (section === 'roles') {
            return (
                <Card
                    title={
                        <span>
                            <SafetyCertificateOutlined style={{ marginRight: 8, color: '#059669' }} />
                            Role-Based Access Control (RBAC)
                        </span>
                    }
                    bordered={false}
                    style={{ borderRadius: 12 }}
                    extra={
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenRoleModal()} style={{ backgroundColor: '#059669' }}>
                            Add New Role
                        </Button>
                    }
                >
                    <Table
                        scroll={{ x: 'max-content' }}
                        dataSource={roles}
                        rowKey="id"
                        loading={rolesLoading}
                        columns={[
                            {
                                title: 'Role Name',
                                dataIndex: 'name',
                                key: 'name',
                                fixed: 'left',
                                width: 200,
                                render: (text) => <strong style={{ color: '#065f46' }}>{text}</strong>,
                            },
                            {
                                title: 'Assigned Permissions',
                                dataIndex: 'permissions',
                                key: 'permissions',
                                render: (perms) => (
                                    <Space wrap>
                                        {(perms || []).map((p) => (
                                            <Tag color="cyan" key={p.id}>
                                                {p.name.replace(/_/g, ' ').toUpperCase()}
                                            </Tag>
                                        ))}
                                        {(!perms || perms.length === 0) && (
                                            <span style={{ color: '#94a3b8', fontSize: 12 }}>No permissions assigned</span>
                                        )}
                                    </Space>
                                ),
                            },
                            {
                                title: 'Active Users',
                                dataIndex: 'users_count',
                                key: 'users_count',
                                width: 120,
                                render: (count) => <Tag color="blue">{count || 0} user{(count || 0) === 1 ? '' : 's'}</Tag>,
                            },
                            {
                                title: 'Actions',
                                key: 'actions',
                                fixed: 'right',
                                width: 120,
                                render: (_, record) => {
                                    const isCore = CORE_ROLES.includes(record.name);
                                    return (
                                        <Space>
                                            <Tooltip title={isCore ? 'Core system roles cannot be modified' : 'Edit Role Permissions'}>
                                                <Button size="small" icon={<EditOutlined />} disabled={isCore} onClick={() => handleOpenRoleModal(record)} />
                                            </Tooltip>
                                            <Tooltip title={isCore ? 'Core system roles cannot be removed' : record.users_count > 0 ? 'Cannot delete role with assigned users' : 'Delete Role'}>
                                                <Popconfirm
                                                    title="Remove this role?"
                                                    disabled={isCore || record.users_count > 0}
                                                    description={record.users_count > 0 ? 'Cannot delete a role with assigned users.' : 'Are you sure?'}
                                                    onConfirm={() => deleteRole(record.id)}
                                                >
                                                    <Button size="small" danger icon={<DeleteOutlined />} disabled={isCore || record.users_count > 0} />
                                                </Popconfirm>
                                            </Tooltip>
                                        </Space>
                                    );
                                },
                            },
                        ]}
                    />
                </Card>
            );
        }

        return null;
    };

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <h2 style={{ margin: 0, fontFamily: 'Outfit', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
                    System Configuration
                </h2>
                <span style={{ color: '#64748b', fontSize: 13 }}>Configure company branding, financial defaults, and role-based permissions.</span>
            </div>

            <Tabs
                activeKey={section}
                onChange={(key) => navigate(`/settings/${key}`)}
                items={tabItems}
                style={{ marginBottom: 0 }}
            />

            {renderSection()}

            <Modal
                title={editingRole ? `Edit Role — ${editingRole.name}` : 'Create New System Role'}
                open={roleModal}
                onOk={() => roleForm.validateFields().then(handleRoleSubmit)}
                onCancel={() => setRoleModal(false)}
                okText={editingRole ? 'Save Changes' : 'Create Role'}
                width={700}
                confirmLoading={addRoleMutation.isPending || updateRoleMutation.isPending}
            >
                <Form form={roleForm} layout="vertical" style={{ marginTop: 15 }}>
                    <Form.Item name="name" label="Role Name" rules={[{ required: true, message: 'Role name is required' }, { max: 255 }]}>
                        <Input placeholder="e.g. Regional Financial Auditor" />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, color: '#475569', fontSize: 14 }}>
                            Assign Domain Permissions
                        </div>
                        <Space>
                            <Button size="small" type="link" icon={<CheckSquareOutlined />} onClick={handleSelectAllPermissions}>
                                Select All
                            </Button>
                            <Button size="small" type="link" danger icon={<BorderOutlined />} onClick={handleClearAllPermissions}>
                                Clear All
                            </Button>
                        </Space>
                    </div>

                    <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
                        <Form.Item name="permissions" valuePropName="value">
                            <Checkbox.Group style={{ width: '100%' }}>
                                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                    {Object.entries(permissionGroups).map(([groupName, perms]) => (
                                        <Card
                                            key={groupName}
                                            size="small"
                                            title={<span style={{ color: '#065f46', fontWeight: 600, fontSize: 13 }}>{groupName} Management</span>}
                                            style={{ borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc' }}
                                        >
                                            <Row gutter={[16, 12]}>
                                                {perms.map((p) => (
                                                    <Col span={12} key={p.name}>
                                                        <Checkbox value={p.name} style={{ fontSize: 12 }}>
                                                            {p.label}
                                                        </Checkbox>
                                                    </Col>
                                                ))}
                                            </Row>
                                        </Card>
                                    ))}
                                </Space>
                            </Checkbox.Group>
                        </Form.Item>
                    </div>
                </Form>
            </Modal>
        </Space>
    );
};

export default Settings;

