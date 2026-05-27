import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Table, Tag, Space, Modal, Descriptions, Tooltip } from 'antd';
import { SearchOutlined, HistoryOutlined } from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';
import ClientCardModal from '../../components/ClientCardModal';
import VlozheniaButton from '../../components/VlozheniaButton';

function ClientSearchPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [clientCardOpen, setClientCardOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [commentsHistory, setCommentsHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchClientId, setSearchClientId] = useState('');

  useEffect(() => {
    const clientId = localStorage.getItem('searchClientId');
    if (clientId) {
      localStorage.removeItem('searchClientId');
      fetchOrdersByClient(clientId);
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      fetchOrdersByClient(e.detail.clientId);
    };
    window.addEventListener('searchClient', handler);
    return () => window.removeEventListener('searchClient', handler);
  }, []);

  const fetchOrders = async () => {
    if (!orderId && !phone && !address) { setResults([]); return; }
    setLoading(true);
    try {
      if (orderId) {
        const res = await api.get(`/orders/${orderId}`);
        setResults(res.data ? [res.data] : []);
      } else {
        const params = {};
        if (phone) params.phone = phone;
        if (address) params.address = address;
        const response = await api.get('/orders/', { params });
        setResults(response.data);
      }
    } catch (error) {
      if (orderId) setResults([]);
    } finally { setLoading(false); }
  };

  const fetchCommentsHistory = async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}/comments`);
      setCommentsHistory(response.data);
      setHistoryOpen(true);
    } catch (e) { console.error('Ошибка загрузки истории:', e); }
  };

  const fetchOrdersByClient = async (clientId) => {
    setLoading(true);
    try {
      const res = await api.get('/orders/', { params: { client_id: clientId } });
      setResults(res.data);
    } catch (error) {
      console.error('Ошибка:', error);
    } finally { setLoading(false); }
  };

  const columns = [
    { title: '№', dataIndex: 'id', key: 'id', width: 60 },
    { title: 'Дата', key: 'date', width: 110, render: (_, r) => r.created_at ? dayjs(r.created_at).format('DD.MM HH:mm') : '—' },
    {
      title: 'Клиент', key: 'client',
      render: (_, r) => r.client ? (
        <span>
          {r.client.name}
          {r.client.blacklisted && <Tag color="red" style={{ marginLeft: 4 }}>ЧС</Tag>}
        </span>
      ) : '—'
    },
    { title: 'Телефон', key: 'phone', render: (_, r) => r.phone || '—' },
    { title: 'Адрес', key: 'address', render: (_, r) => r.address || '—' },
    { title: 'Тип', key: 'technic', width: 60, render: (_, r) => r.technic_type?.code || '—' },
    { title: 'Мастер', key: 'master', render: (_, r) => r.master ? `${r.master.last_name} ${r.master.first_name}` : '—' },
    {
      title: 'Статус', key: 'status', width: 130,
      render: (_, r) => r.status ? <Tag style={{
        background: r.status.color || '#6B7280',
        color: r.status.text_color || '#fff',
        fontWeight: 'bold',
        border: 'none',
      }}>{r.status.name}</Tag> : '—'
    },
    { title: 'Фактор', key: 'source', width: 80, render: (_, r) => { if (!r.source || r.source === 'обычная') return null; return <Tag>{r.source}</Tag>; } },
    {
      title: 'ОКК', key: 'okk', width: 60,
      render: (_, r) => r.okk_checked ? <Tag color="green">✓</Tag> : <Tag color="red">✗</Tag>
    },
    {
      title: 'Действия', key: 'actions', width: 180,
      render: (_, r) => (
        <Space>
          <Button size="small" type="link" onClick={() => { setSelectedOrder(r); setDetailOpen(true); }}>Открыть</Button>
          <VlozheniaButton onClick={() => { setSelectedClientId(r.client_id); setClientCardOpen(true); }} />
        </Space>
      ),
    },
  ];

  return (
    <Card title="🔍 Поиск">
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Input placeholder="№ заявки" value={orderId} onChange={(e) => setOrderId(e.target.value)} onPressEnter={fetchOrders} allowClear style={{ width: 120 }} />
        <Input placeholder="Адрес" value={address} onChange={(e) => setAddress(e.target.value)} onPressEnter={fetchOrders} allowClear style={{ flex: 1 }} />
        <Input placeholder="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} onPressEnter={fetchOrders} allowClear style={{ flex: 1 }} />
        <Button type="primary" icon={<SearchOutlined />} onClick={fetchOrders}>Поиск</Button>
      </div>

      <Table columns={columns} dataSource={results} rowKey="id" loading={loading} size="small" />

      <Modal title={`Заявка №${selectedOrder?.id || ''}`} open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={500}>
        {selectedOrder && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Клиент">{selectedOrder.client?.name || '—'}</Descriptions.Item>
            <Descriptions.Item label="Телефон">{selectedOrder.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Адрес">{selectedOrder.address || '—'}</Descriptions.Item>
            <Descriptions.Item label="Город">{selectedOrder.city?.name || '—'}</Descriptions.Item>
            <Descriptions.Item label="Филиал">{selectedOrder.branch?.name || '—'}</Descriptions.Item>
            <Descriptions.Item label="Тип техники">{selectedOrder.technic_type?.name || '—'}</Descriptions.Item>
            <Descriptions.Item label="Мастер">{selectedOrder.master ? `${selectedOrder.master.last_name} ${selectedOrder.master.first_name}` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Статус">
              {selectedOrder.status && <Tag style={{
                background: selectedOrder.status.color || '#6B7280',
                color: selectedOrder.status.text_color || '#fff',
                fontWeight: 'bold',
                border: 'none',
              }}>{selectedOrder.status.name}</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Сумма">{selectedOrder.price_total ? `${selectedOrder.price_total} ₽` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Дата создания">{selectedOrder.created_at ? dayjs(selectedOrder.created_at).format('DD.MM.YYYY HH:mm') : '—'}</Descriptions.Item>
            <Descriptions.Item label="Дата прибытия">{selectedOrder.scheduled_time ? dayjs(selectedOrder.scheduled_time).format('DD.MM.YYYY HH:mm') : '—'}</Descriptions.Item>
            <Descriptions.Item label="Комментарий">
              {selectedOrder.description_work || '—'}
              <div style={{ marginTop: 8 }}>
                <Space>
                  <Tooltip title="История">
                    <Button size="small" icon={<HistoryOutlined />} onClick={() => fetchCommentsHistory(selectedOrder.id)} />
                  </Tooltip>
                </Space>
              </div>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
      <Modal title="📋 История комментариев" open={historyOpen} onCancel={() => setHistoryOpen(false)} footer={null} width={500}>
        {commentsHistory.length === 0 ? <p>История пуста</p> : commentsHistory.map((c, i) => (
          <div key={i} style={{ marginBottom: 12, padding: '8px 12px', borderLeft: '3px solid #2563EB' }}>
            <div style={{ fontSize: 12, color: '#888' }}>{dayjs(c.created_at).format('DD.MM.YYYY HH:mm')} — {c.user_name}</div>
            <div style={{ marginTop: 4 }}>{c.text}</div>
          </div>
        ))}
      </Modal>
      <ClientCardModal clientId={selectedClientId} open={clientCardOpen} onClose={() => setClientCardOpen(false)} />
    </Card>
  );
}

export default ClientSearchPage;