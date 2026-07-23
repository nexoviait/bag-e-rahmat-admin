import React, { useState } from 'react';
import { Card, Form, Input, Button, Alert, Typography } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Paragraph } = Typography;

const Login = () => {
    const { login, settings } = useAuth();
    const [loginForm] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const onFinish = async (values) => {
        setLoading(true);
        setErrorMsg(null);
        const result = await login(values.email, values.password);
        if (!result.success) {
            setErrorMsg(result.message);
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0b1210 0%, #0f2419 50%, #10b981 100%)',
                padding: '20px',
                fontFamily: 'Outfit, sans-serif',
            }}
        >
            <Card
                style={{
                    width: '100%',
                    maxWidth: 450,
                    borderRadius: 16,
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
                    border: 'none',
                    overflow: 'hidden',
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 30 }}>
                    {settings?.logo_url ? (
                        <img src={settings.logo_url} alt="Logo" style={{ maxHeight: 60, marginBottom: 16, objectFit: 'contain' }} />
                    ) : (
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 48,
                                height: 48,
                                borderRadius: 12,
                                backgroundColor: '#10b981',
                                color: 'white',
                                fontSize: 22,
                                fontWeight: 'bold',
                                marginBottom: 12,
                            }}
                        >
                            {(settings?.company_name || 'Nexovia').charAt(0)}
                        </div>
                    )}
                    <Title level={2} style={{ margin: 0, fontFamily: 'Outfit' }}>
                        {settings?.company_name || 'Project Finance Admin'}
                    </Title>
                    <Paragraph style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                        Centralized Project Financial Management
                    </Paragraph>
                </div>

                {errorMsg && (
                    <Alert message={errorMsg} type="error" showIcon style={{ marginBottom: 20, borderRadius: 8 }} />
                )}

                <Form form={loginForm} name="login_form" onFinish={onFinish} layout="vertical" size="large">
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Please input your email!' },
                            { type: 'email', message: 'Please input a valid email!' },
                        ]}
                    >
                        <Input
                            prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Email address"
                            style={{ borderRadius: 8 }}
                        />
                    </Form.Item>

                    <Form.Item name="password" rules={[{ required: true, message: 'Please input your password!' }]}>
                        <Input.Password
                            prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Password"
                            style={{ borderRadius: 8 }}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            style={{
                                borderRadius: 8,
                                height: 45,
                                fontSize: 15,
                                fontWeight: 600,
                                backgroundColor: '#059669',
                            }}
                        >
                            Log In
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Login;
