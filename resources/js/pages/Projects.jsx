import React, { useState } from 'react';
import { Table, Card, Button, Space, Tag, Modal, Form, Input, Select, DatePicker, Popconfirm, message, Row, Col, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { friendlyErrorMessage } from '../utils/errorMessage';
import { formatMoney, getCurrencySymbol } from '../utils/currency';

const { Option } = Select;

const STATUS_COLORS = { active: 'green', on_hold: 'orange', completed: 'blue', archived: 'default' };

const Projects = () => {
    const { hasRole, settings } = useAuth();
    const isAdmin = hasRole(['Super Admin', 'Admin']);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const symbol = getCurrencySymbol(settings);

    const [modalVisible, setModalVisible] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [form] = Form.useForm();

    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [assigningProject, setAssigningProject] = useState(null);
    const [currentAssigneeIds, setCurrentAssigneeIds] = useState([]);
    const [assignForm] = Form.useForm();

    const { data: projects = [], isLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => (await axios.get('/api/projects')).data,
    });

    const { data: users = [] } = useQuery({
        queryKey: ['usersForAssignment'],
        queryFn: async () => (await axios.get('/api/users')).data,
        enabled: isAdmin && assignModalVisible,
    });

    const createMutation = useMutation({
        mutationFn: (data) => axios.post('/api/projects', data),
        onSuccess: (res) => {
            message.success(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setModalVisible(false);
        },
        onError: (err) => message.error(friendlyErrorMessage(err)),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => axios.put(`/api/projects/${id}`, data),
        onSuccess: (res) => {
            message.success(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setModalVisible(false);
            setEditingProject(null);
        },
        onError: (err) => message.error(friendlyErrorMessage(err)),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => axios.delete(`/api/projects/${id}`),
        onSuccess: (res) => {
            message.success(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
        onError: (err) => message.error(friendlyErrorMessage(err)),
    });

    const assignMutation = useMutation({
        mutationFn: async ({ id, userIds }) => {
            const toAdd = userIds.filter((uid) => !currentAssigneeIds.includes(uid));
            const toRemove = currentAssigneeIds.filter((uid) => !userIds.includes(uid));

            if (toAdd.length > 0) {
                await axios.post(`/api/projects/${id}/assign`, { user_ids: toAdd });
            }
            await Promise.all(toRemove.map((uid) => axios.delete(`/api/projects/${id}/assign/${uid}`)));
        },
        onSuccess: () => {
            message.success('Project assignments updated successfully');
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setAssignModalVisible(false);
        },
        onError: (err) => message.error(friendlyErrorMessage(err)),
    });

    const handleOpenModal = (project = null) => {
        setEditingProject(project);
        if (project) {
            form.setFieldsValue({
                ...project,
                start_date: project.start_date ? dayjs(project.start_date) : null,
                end_date: project.end_date ? dayjs(project.end_date) : null,
            });
        } else {
            form.resetFields();
            form.setFieldsValue({ status: 'active' });
        }
        setModalVisible(true);
    };

    const handleFormSubmit = () => {
        form.validateFields().then((values) => {
            const payload = {
                ...values,
                start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
                end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
            };
            if (editingProject) {
                updateMutation.mutate({ id: editingProject.id, data: payload });
            } else {
                createMutation.mutate(payload);
            }
        });
    };

    const handleOpenAssignModal = async (project) => {
        setAssigningProject(project);
        const res = await axios.get(`/api/projects/${project.id}`);
        const currentUserIds = (res.data.project.users || []).map((u) => u.id);
        setCurrentAssigneeIds(currentUserIds);
        assignForm.setFieldsValue({ user_ids: currentUserIds });
        setAssignModalVisible(true);
    };

    const columns = [
        {
            title: 'Project',
            dataIndex: 'name',
            key: 'name',
            fixed: 'left',
            width: 220,
            render: (text, record) => (
                <a onClick={() => navigate(`/projects/${record.id}`)} style={{ fontWeight: 600 }}>
                    {text}
                </a>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => <Tag color={STATUS_COLORS[status] || 'default'}>{(status || '').replace('_', ' ').toUpperCase()}</Tag>,
        },
        {
            title: 'Total Money',
            key: 'total_money',
            render: (_, record) => formatMoney(record.formulas?.total_money, symbol),
        },
        {
            title: 'Deduct Money',
            key: 'deduct_money',
            render: (_, record) => formatMoney(record.formulas?.deduct_money, symbol),
        },
        {
            title: 'Remaining',
            key: 'remaining',
            render: (_, record) => (
                <strong style={{ color: (record.formulas?.remaining ?? 0) >= 0 ? '#059669' : '#dc2626' }}>
                    {formatMoney(record.formulas?.remaining, symbol)}
                </strong>
            ),
        },
        {
            title: 'Profit',
            key: 'profit',
            render: (_, record) => (
                <span style={{ color: (record.formulas?.profit ?? 0) >= 0 ? '#059669' : '#dc2626' }}>
                    {formatMoney(record.formulas?.profit, symbol)}
                </span>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            fixed: 'right',
            width: isAdmin ? 220 : 100,
            render: (_, record) => (
                <Space>
                    <Button size="small" icon={<ArrowRightOutlined />} onClick={() => navigate(`/projects/${record.id}`)}>
                        Open
                    </Button>
                    {isAdmin && (
                        <>
                            <Button size="small" icon={<TeamOutlined />} onClick={() => handleOpenAssignModal(record)} />
                            <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
                            <Popconfirm title="Delete this project?" onConfirm={() => deleteMutation.mutate(record.id)}>
                                <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h2 style={{ margin: 0, fontFamily: 'Outfit', fontSize: 22, fontWeight: 700 }}>
                        {isAdmin ? 'All Projects' : 'My Projects'}
                    </h2>
                    <span style={{ color: '#64748b', fontSize: 13 }}>
                        {isAdmin ? 'Manage projects and assign team members.' : 'Projects you have been assigned to.'}
                    </span>
                </div>
                {isAdmin && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()} style={{ backgroundColor: '#059669' }}>
                        New Project
                    </Button>
                )}
            </div>

            <Card bordered={false}>
                {!isLoading && projects.length === 0 ? (
                    <Empty description={isAdmin ? 'No projects yet — create one to get started.' : 'No projects assigned to you yet. Contact your administrator.'} />
                ) : (
                    <Table
                        scroll={{ x: 'max-content' }}
                        columns={columns}
                        dataSource={projects}
                        rowKey="id"
                        loading={isLoading}
                        pagination={{ pageSize: 10 }}
                    />
                )}
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                title={editingProject ? 'Edit Project' : 'New Project'}
                open={modalVisible}
                onOk={handleFormSubmit}
                onCancel={() => setModalVisible(false)}
                okText={editingProject ? 'Save Changes' : 'Create'}
                confirmLoading={createMutation.isPending || updateMutation.isPending}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Project Name" rules={[{ required: true, message: 'Name is required' }]}>
                        <Input placeholder="e.g. Riverside Community Center" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="active">Active</Option>
                                    <Option value="on_hold">On Hold</Option>
                                    <Option value="completed">Completed</Option>
                                    <Option value="archived">Archived</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="start_date" label="Start Date">
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="end_date" label="End Date">
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* Assign Users Modal */}
            <Modal
                title={`Assign Team Members — ${assigningProject?.name || ''}`}
                open={assignModalVisible}
                onOk={() => {
                    assignForm.validateFields().then((values) => {
                        assignMutation.mutate({ id: assigningProject.id, userIds: values.user_ids || [] });
                    });
                }}
                onCancel={() => setAssignModalVisible(false)}
                okText="Save Assignments"
                confirmLoading={assignMutation.isPending}
            >
                <Form form={assignForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="user_ids" label="Assigned Users">
                        <Select
                            mode="multiple"
                            placeholder="Select users to assign"
                            optionFilterProp="label"
                            options={users.map((u) => ({ value: u.id, label: `${u.name} (${u.roles?.[0]?.name || 'No role'})` }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
};

export default Projects;
