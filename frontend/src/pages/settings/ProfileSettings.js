import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, DatePicker, message, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';

function ProfileSettings() {
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.get('/auth/me').then(r => {
      setUser(r.data);
      form.setFieldsValue({
        ...r.data,
        birth_date: r.data.birth_date ? dayjs(r.data.birth_date) : null,
      });
    }).catch(() => {});
  }, []);

  const handleSaveProfile = async (values) => {
    setLoading(true);
    try {
      const data = { ...values };
      if (data.birth_date) {
        data.birth_date = dayjs(data.birth_date).format('YYYY-MM-DD');
      }
      await api.put('/auth/profile', data);
      message.success('Профиль обновлён');
      // Обновить данные в localStorage
      const me = await api.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(me.data));
      setUser(me.data);
    } catch (e) {
      message.error(e.response?.data?.detail || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values) => {
    setPasswordLoading(true);
    try {
      await api.put('/auth/password', {
        old_password: values.old_password,
        new_password: values.new_password,
      });
      message.success('Пароль изменён');
      passwordForm.resetFields();
    } catch (e) {
      message.error(e.response?.data?.detail || 'Ошибка');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Card title="👤 Настройки профиля">
      <Form form={form} layout="vertical" onFinish={handleSaveProfile} style={{ maxWidth: 500 }}>
        <Form.Item name="last_name" label="Фамилия" rules={[{ required: true }]}>
          <Input placeholder="Фамилия" />
        </Form.Item>
        <Form.Item name="first_name" label="Имя" rules={[{ required: true }]}>
          <Input placeholder="Имя" />
        </Form.Item>
        <Form.Item name="middle_name" label="Отчество">
          <Input placeholder="Отчество" />
        </Form.Item>
        <Form.Item name="phone" label="Телефон (логин)" rules={[{ required: true }]}>
          <Input placeholder="Телефон" />
        </Form.Item>
        <Form.Item name="birth_date" label="Дата рождения">
          <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
        </Form.Item>
        <Form.Item name="telegram_nick" label="Telegram ник">
          <Input placeholder="@nickname" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} icon={<UserOutlined />}>
            Сохранить
          </Button>
        </Form.Item>
      </Form>

      <Divider />

      <h3><LockOutlined /> Смена пароля</h3>
      <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword} style={{ maxWidth: 400 }}>
        <Form.Item name="old_password" label="Старый пароль" rules={[{ required: true, message: 'Введите старый пароль' }]}>
          <Input.Password placeholder="Старый пароль" />
        </Form.Item>
        <Form.Item name="new_password" label="Новый пароль" rules={[
          { required: true, message: 'Введите новый пароль' },
          { min: 4, message: 'Минимум 4 символа' },
        ]}>
          <Input.Password placeholder="Новый пароль" />
        </Form.Item>
        <Form.Item name="confirm_password" label="Подтверждение" dependencies={['new_password']} rules={[
          { required: true, message: 'Подтвердите пароль' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('new_password') === value) return Promise.resolve();
              return Promise.reject(new Error('Пароли не совпадают'));
            },
          }),
        ]}>
          <Input.Password placeholder="Подтвердите пароль" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={passwordLoading} icon={<LockOutlined />}>
            Сменить пароль
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

export default ProfileSettings;