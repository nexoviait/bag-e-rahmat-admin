import React, { useState } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, DatePicker, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import dayjs from 'dayjs';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { friendlyErrorMessage } from '../utils/errorMessage';
import { formatMoney, getCurrencySymbol } from '../utils/currency';

/**
 * Generic CRUD table for the five per-project financial ledgers (Budget, Revenue,
 * Expenses, Shareholder Investments, Owner Payments) — they're structurally identical
 * (amount + date + description) plus one optional extra text field.
 */
const LedgerCrudPage = ({ title, endpoint, permissionPrefix, extraField }) => {
    const { id: projectId } = useParams();
    const { can, settings } = useAuth();
    const queryClient = useQueryClient();
    const symbol = getCurrencySymbol(settings);

    const [modalVisible, setModalVisible] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [form] = Form.useForm();

    const canCreate = can(`create_${permissionPrefix}`);
    const canEdit = can(`edit_${permissionPrefix}`);
    const canDelete = can(`delete_${permissionPrefix}`);

    const baseUrl = `/api/projects/${projectId}/${endpoint}`;
    const queryKey = [endpoint, projectId];

    const { data: entries = [], isLoading } = useQuery({
        queryKey,
        queryFn: async () => (await axios.get(baseUrl)).data,
    });

    const totalAmount = entries.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const createMutation = useMutation({
        mutationFn: (data) => axios.post(baseUrl, data),
        onSuccess: (res) => {
            message.success(res.data.message);
            queryClient.invalidateQueries({ queryKey });
            setModalVisible(false);
        },
        onError: (err) => message.error(friendlyErrorMessage(err)),
    });

    const updateMutation = useMutation({
        mutationFn: ({ entryId, data }) => axios.put(`${baseUrl}/${entryId}`, data),
        onSuccess: (res) => {
            message.success(res.data.message);
            queryClient.invalidateQueries({ queryKey });
            setModalVisible(false);
            setEditingEntry(null);
        },
        onError: (err) => message.error(friendlyErrorMessage(err)),
    });

    const deleteMutation = useMutation({
        mutationFn: (entryId) => axios.delete(`${baseUrl}/${entryId}`),
        onSuccess: (res) => {
            message.success(res.data.message);
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (err) => message.error(friendlyErrorMessage(err)),
    });

    const handleOpenModal = (entry = null) => {
        setEditingEntry(entry);
        if (entry) {
            form.setFieldsValue({ ...entry, entry_date: dayjs(entry.entry_date) });
        } else {
            form.resetFields();
            form.setFieldsValue({ entry_date: dayjs() });
        }
        setModalVisible(true);
    };

    const handleSubmit = () => {
        form.validateFields().then((values) => {
            const payload = { ...values, entry_date: values.entry_date.format('YYYY-MM-DD') };
            if (editingEntry) {
                updateMutation.mutate({ entryId: editingEntry.id, data: payload });
            } else {
                createMutation.mutate(payload);
            }
        });
    };

    const columns = [
        {
            title: 'Date',
            dataIndex: 'entry_date',
            key: 'entry_date',
            width: 130,
            render: (d) => dayjs(d).format('DD MMM YYYY'),
        },
        extraField && {
            title: extraField.label,
            dataIndex: extraField.name,
            key: extraField.name,
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (v) => formatMoney(v, symbol),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        (canEdit || canDelete) && {
            title: 'Actions',
            key: 'actions',
            width: 110,
            render: (_, record) => (
                <Space>
                    {canEdit && <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />}
                    {canDelete && (
                        <Popconfirm title="Delete this entry?" onConfirm={() => deleteMutation.mutate(record.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ].filter(Boolean);

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h2 style={{ margin: 0, fontFamily: 'Outfit', fontSize: 22, fontWeight: 700 }}>{title}</h2>
                    <span style={{ color: '#64748b', fontSize: 13 }}>Total: {formatMoney(totalAmount, symbol)}</span>
                </div>
                {canCreate && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()} style={{ backgroundColor: '#059669' }}>
                        Add Entry
                    </Button>
                )}
            </div>

            <Card bordered={false}>
                <Table
                    scroll={{ x: 'max-content' }}
                    columns={columns}
                    dataSource={entries}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title={editingEntry ? `Edit ${title} Entry` : `Add ${title} Entry`}
                open={modalVisible}
                onOk={handleSubmit}
                onCancel={() => setModalVisible(false)}
                confirmLoading={createMutation.isPending || updateMutation.isPending}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    {extraField && (
                        <Form.Item
                            name={extraField.name}
                            label={extraField.label}
                            rules={extraField.required ? [{ required: true, message: `${extraField.label} is required` }] : []}
                        >
                            <Input placeholder={extraField.label} />
                        </Form.Item>
                    )}
                    <Form.Item
                        name="amount"
                        label={`Amount (${symbol})`}
                        rules={[{ required: true, message: 'Amount is required' }]}
                    >
                        <Input type="number" step="0.01" min="0.01" placeholder="0.00" />
                    </Form.Item>
                    <Form.Item name="entry_date" label="Date" rules={[{ required: true, message: 'Date is required' }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={3} placeholder="Optional notes" />
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
};

export default LedgerCrudPage;
