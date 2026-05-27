import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, Select, message, Tag } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';

function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/invoices/');
      setInvoices(response.data);
    } catch (error) {
      message.error('Ошибка загрузки счетов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleSubmit = async (values) => {
    try {
      await api.post('/invoices/', null, { params: values });
      message.success('Счёт создан');
      form.resetFields();
      setModalOpen(false);
      fetchInvoices();
    } catch (error) {
      message.error('Ошибка при создании');
    }
  };

  const statusColors = { draft: 'default', sent: 'blue', paid: 'green', cancelled: 'red' };
  const statusNames = { draft: 'Черновик', sent: 'Отправлен', paid: 'Оплачен', cancelled: 'Отменён' };

  const columns = [
    { title: '№', dataIndex: 'number', key: 'number' },
    { title: 'Сумма', dataIndex: 'amount', key: 'amount', render: (v) => v ? `${v} ₽` : '—' },
    {
      title: 'Статус', dataIndex: 'status', key: 'status',
      render: (v) => <Tag color={statusColors[v] || 'default'}>{statusNames[v] || v}</Tag>,
    },
    { title: 'Описание', dataIndex: 'description', key: 'description' },
    {
      title: 'Дата', dataIndex: 'created_at', key: 'created_at',
      render: (text) => text ? dayjs(text).format('DD.MM.YYYY') : '—',
    },
  ];

  return (
    <Card
      title="🧾 Счета"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchInvoices}>Обновить</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Создать</Button>
        </Space>
      }
    >
      <Table columns={columns} dataSource={invoices} rowKey="id" loading={loading} size="small" />

      <Modal title="Новый счёт" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="branch_id" label="ID филиала" rules={[{ required: true }]}>
            <Input placeholder="1" />
          </Form.Item>
          <Form.Item name="number" label="Номер счёта" rules={[{ required: true }]}>
            <Input placeholder="СЧ-001" />
          </Form.Item>
          <Form.Item name="amount" label="Сумма" rules={[{ required: true }]}>
            <Input type="number" placeholder="10000" />
          </Form.Item>
          <Form.Item name="client_id" label="ID клиента">
            <Input placeholder="1" />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="due_date" label="Срок оплаты">
            <Input type="date" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>Создать</Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default InvoicesPage;