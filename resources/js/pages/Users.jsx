import React, { useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Input, Select, Popconfirm, message, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { friendlyErrorMessage } from '../utils/errorMessage';

const { Option } = Select;

const ASSIGNABLE_ROLES = ['Super Admin', 'Admin', 'Project Manager', 'Accountant', 'Viewer'];

const ROLE_COLORS = {
    'Super Admin': 'volcano',
    Admin: 'red',
    'Project Manager': 'purple',
    Accountant: 'green',
    Viewer: 'blue',
};

const Users = () => {
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();

    const [userModal, setUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [userForm] = Form.useForm();

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => (await axios.get('/api/users')).data,
    });

    const addUserMutation = useMutation({
        mutationFn: (data) => axios.post('/api/users', data),
        onSuccess: (res) => {
            message.success(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setUserModal(false);
            userForm.resetFields();
        },
        onError: (err) => message.error(friendlyErrorMessage(err)),
    });

    const updateUserMutation = useMutation({
        mutationFn: ({ id, data }) => axios.put(`/api/users/${id}`, data),
        onSuccess: (res) => {
            message.success(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setUserModal(false);
            setEditingUser(null);
            userForm.resetFields();
        },
        onError: (err) => message.error(friendlyErrorMessage(err)),
    });

    const deleteUser = async (id) => {
        try {
            const res = await axios.delete(`/api/users/${id}`);
            message.success(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['users'] });
        } catch (err) {
            message.error(friendlyErrorMessage(err));
        }
    };

    const handleOpenModal = (userData = null) => {
        setEditingUser(userData);
        if (userData) {
            userForm.setFieldsValue({
                name: userData.name,
                email: userData.email,
                password: '',
                roles: (userData.roles || []).map((r) => r.name),
            });
        } else {
            userForm.resetFields();
        }
        setUserModal(true);
    };

    const handleSubmit = (values) => {
        if (editingUser) {
            updateUserMutation.mutate({ id: editingUser.id, data: values });
        } else {
            addUserMutation.mutate(values);
        }
    };

    const filteredUsers = users.filter((u) => {
        const query = searchText.toLowerCase();
        const nameMatch = (u.name || '').toLowerCase().includes(query);
        const emailMatch = (u.email || '').toLowerCase().includes(query);
        const roleMatch = (u.roles || []).some((r) => r.name.toLowerCase().includes(query));

        return nameMatch || emailMatch || roleMatch;
    });

    const columns = [
        {
            title: 'Full Name',
            dataIndex: 'name',
            key: 'name',
            fixed: 'left',
            width: 220,
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (text, record) => {
                const isSelf = record.id === currentUser?.id;

                return (
                    <Space>
                        <UserOutlined style={{ color: '#059669' }} />
                        <strong style={{ color: '#0f172a' }}>{text}</strong>
                        {isSelf && <Tag color="gold" style={{ fontSize: 10, marginLeft: 4 }}>You</Tag>}
                    </Space>
                );
            },
        },
        { title: 'Email Address', dataIndex: 'email', key: 'email', sorter: (a, b) => a.email.localeCompare(b.email) },
        {
            title: 'Assigned Roles',
            dataIndex: 'roles',
            key: 'roles',
            render: (userRoles) => (
                <Space wrap>
                    {(userRoles || []).map((r) => (
                        <Tag color={ROLE_COLORS[r.name] || 'cyan'} key={r.id}>
                            {r.name}
                        </Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: 'Assigned Projects',
            dataIndex: 'assigned_projects',
            key: 'assigned_projects',
            render: (projects) => (
                <Space wrap>
                    {(projects || []).length === 0 ? (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>None</span>
                    ) : (
                        (projects || []).map((p) => (
                            <Tag color="default" key={p.id}>
                                {p.name}
                            </Tag>
                        ))
                    )}
                </Space>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            fixed: 'right',
            width: 120,
            render: (_, record) => {
                const isSelf = record.id === currentUser?.id;

                return (
                    <Space>
                        <Tooltip title="Edit User">
                            <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
                        </Tooltip>
                        <Tooltip title={isSelf ? 'Cannot delete your own logged-in account' : 'Delete User'}>
                            <Popconfirm
                                title="Remove this user?"
                                disabled={isSelf}
                                description={isSelf ? 'Self-deletion is disabled' : 'Are you sure you want to delete this user?'}
                                onConfirm={() => deleteUser(record.id)}
                            >
                                <Button size="small" danger icon={<DeleteOutlined />} disabled={isSelf} />
                            </Popconfirm>
                        </Tooltip>
                    </Space>
                );
            },
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h2 style={{ margin: 0, fontFamily: 'Outfit', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
                        User Accounts & Access Control
                    </h2>
                    <span style={{ color: '#64748b', fontSize: 13 }}>
                        Create and manage staff accounts and role assignments across the platform.
                    </span>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()} style={{ backgroundColor: '#059669' }}>
                    New User
                </Button>
            </div>

            <Card
                bordered={false}
                style={{ borderRadius: 12 }}
                extra={
                    <Input
                        placeholder="Search by name, email, or role..."
                        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 280, borderRadius: 6 }}
                        allowClear
                    />
                }
            >
                <Table
                    scroll={{ x: 'max-content' }}
                    columns={columns}
                    dataSource={filteredUsers}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                />
            </Card>

            <Modal
                title={editingUser ? 'Edit User Account' : 'Create User Account'}
                open={userModal}
                onOk={() => userForm.validateFields().then(handleSubmit)}
                onCancel={() => setUserModal(false)}
                okText={editingUser ? 'Save Changes' : 'Create Account'}
                confirmLoading={addUserMutation.isPending || updateUserMutation.isPending}
            >
                <Form form={userForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Full name is required' }]}>
                        <Input placeholder="e.g. Priya Manager" />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label="Email Address"
                        rules={[
                            { required: true, message: 'Email address is required' },
                            { type: 'email', message: 'Must be a valid email' },
                        ]}
                    >
                        <Input placeholder="user@example.com" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                        rules={[{ required: !editingUser, message: 'Password is required' }]}
                    >
                        <Input.Password placeholder="••••••••" />
                    </Form.Item>
                    <Form.Item name="roles" label="Assign Roles" rules={[{ required: true, message: 'Please assign at least one role' }]}>
                        <Select mode="multiple" placeholder="Assign roles">
                            {ASSIGNABLE_ROLES.map((r) => (
                                <Option key={r} value={r}>
                                    {r}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
};

export default Users;

