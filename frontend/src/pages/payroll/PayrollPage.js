import React, { useState, useEffect } from 'react';
import { Table, Card, Tag } from 'antd';
import api from '../../services/api';

function PayrollPage() {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const response = await api.get('/payroll/');
      setPayrolls(response.data);
    } catch (error) {
      console.error('Ошибка загрузки ведомости:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, []);

  const columns = [
    { title: '№', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: 'Сотрудник',
      key: 'user',
      render: (_, r) => r.user ? `${r.user.last_name} ${r.user.first_name}` : '—',
    },
    { title: 'Период', dataIndex: 'period', key: 'period' },
    { title: 'Оклад', dataIndex: 'fixed_salary', key: 'fixed_salary', render: (v) => v ? `${v} ₽` : '—' },
    { title: 'Премия', dataIndex: 'bonus', key: 'bonus', render: (v) => v ? `${v} ₽` : '—' },
    { title: 'Итого', dataIndex: 'total', key: 'total', render: (v) => v ? `${v} ₽` : '—' },
    {
      title: 'Выплачено',
      dataIndex: 'paid',
      key: 'paid',
      render: (v) => v ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag>,
    },
  ];

  return (
    <Card title="📄 Ведомость">
      <Table columns={columns} dataSource={payrolls} rowKey="id" loading={loading} size="small" />
    </Card>
  );
}

export default PayrollPage;