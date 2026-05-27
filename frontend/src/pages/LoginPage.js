import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;

function LoginPage({ onLogin }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', null, {
        params: {
          login: values.login,
          password: values.password,
        },
      });
      localStorage.setItem('token', response.data.access_token);
      const userData = {
        ...response.data.user,
        theme: response.data.user.theme || 'light',
      };
      localStorage.setItem('user', JSON.stringify(userData));
      message.success('Вход выполнен');
      onLogin(response.data.user);
    } catch (error) {
      message.error('Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
      }}
    >
      <Card style={{ width: 400, borderRadius: 8 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3}>CRM Бытовая техника</Title>
          <p style={{ color: '#6B7280' }}>Войдите в систему</p>
        </div>
        <Form onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="login"
            rules={[{ required: true, message: 'Введите телефон или логин' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Телефон или логин" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Введите пароль' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Пароль" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Войти
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default LoginPage;