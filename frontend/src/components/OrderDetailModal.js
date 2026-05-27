import React, { useState } from 'react';
import { Modal, Descriptions, Tag, Button, Space, Input, Tooltip, Timeline, Select, message } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

function OrderDetailModal({
  open,
  onClose,
  order,
  workComment,
  onCommentChange,
  onSaveComment,
  onReschedule,
  onCopy,
  onHistoryClick,
  photosSection,
  onOrderUpdate,
}) {
  const [technics, setTechnics] = useState([]);
  const [cities, setCities] = useState([]);
  const [branches, setBranches] = useState([]);
  const [editCityOpen, setEditCityOpen] = useState(false);
  const [editCityId, setEditCityId] = useState(null);
  const [editBranchId, setEditBranchId] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasons, setCancelReasons] = useState([]);

  if (!order) return null;

  const loadData = () => {
    api.get('/technics/').then(r => setTechnics(r.data)).catch(() => {});
    api.get('/cities/').then(r => setCities(r.data)).catch(() => {});
    api.get('/cancel-reasons/').then(r => setCancelReasons(r.data)).catch(() => {});
  };

  const loadBranches = async (cityId) => {
    try { const res = await api.get('/branches/', { params: { city_id: cityId } }); setBranches(res.data.filter(b => b.type === 'БТ')); } catch (e) { setBranches([]); }
  };

  const handleChangeLocation = async () => {
    try { await api.put(`/orders/${order.id}/change-location`, null, { params: { city_id: editCityId, branch_id: editBranchId } }); message.success('Город и филиал изменены'); setEditCityOpen(false); if (onOrderUpdate) onOrderUpdate(); } catch (e) { message.error('Ошибка'); }
  };

  const handleChangeTechnic = async (v) => {
    try { await api.put(`/orders/${order.id}/change-technic`, null, { params: { technic_type_id: v } }); message.success('Тип техники изменён'); if (onOrderUpdate) onOrderUpdate(); } catch (e) { message.error('Ошибка'); }
  };

  const handleCancelRequest = async () => {
    if (!cancelReason) return;
    try { await api.put(`/orders/${order.id}/request-cancel`, null, { params: { reason: cancelReason } }); message.success('Заявка отправлена на отмену'); setCancelModalOpen(false); setCancelReason(''); if (onOrderUpdate) onOrderUpdate(); } catch (e) { message.error('Ошибка'); }
  };

  const handleCancel = async (type) => {
    try { await api.put(`/orders/${order.id}/cancel`, null, { params: { cancel_type: type } }); message.success('Заявка отменена'); if (onOrderUpdate) onOrderUpdate(); onClose(); } catch (e) { message.error('Ошибка'); }
  };

  const handleMarkFake = async () => {
    try { await api.put(`/orders/${order.id}/mark-fake`); message.success('Помечено как вброс'); if (onOrderUpdate) onOrderUpdate(); onClose(); } catch (e) { message.error('Ошибка'); }
  };

  const handleReset = async () => {
    try { await api.put(`/orders/${order.id}/reset`); message.success('Заявка обнулена'); if (onOrderUpdate) onOrderUpdate(); onClose(); } catch (e) { message.error('Ошибка'); }
  };

  const handleToDelete = () => {
    Modal.confirm({ title: 'Отправить на удаление?', okText: 'Да', cancelText: 'Нет', okType: 'danger', onOk: async () => { try { await api.put(`/orders/${order.id}/to-delete`); message.success('На удаление'); if (onOrderUpdate) onOrderUpdate(); onClose(); } catch (e) { message.error('Ошибка'); } } });
  };

  const handleDelete = () => {
    Modal.confirm({ title: 'Удалить навсегда?', okText: 'Да', cancelText: 'Нет', okType: 'danger', onOk: async () => { try { await api.delete(`/orders/${order.id}`); message.success('Удалена'); if (onOrderUpdate) onOrderUpdate(); onClose(); } catch (e) { message.error('Ошибка'); } } });
  };

  const timelineItems = [];
  if (order.assigned_at) timelineItems.push({ color: 'orange', children: <span>🔄 <strong>Назначена</strong> — {dayjs(order.assigned_at).format('DD.MM.YYYY HH:mm')}</span> });
  if (order.accepted_at) timelineItems.push({ color: 'green', children: <span>✅ <strong>Принял</strong> — {dayjs(order.accepted_at).format('DD.MM.YYYY HH:mm')}</span> });
  if (order.in_work_at) timelineItems.push({ color: 'cyan', children: <span>🔧 <strong>В работе</strong> — {dayjs(order.in_work_at).format('DD.MM.YYYY HH:mm')}</span> });
  if (order.out_at) timelineItems.push({ color: 'blue', children: <span>🚶 <strong>Вышел</strong> — {dayjs(order.out_at).format('DD.MM.YYYY HH:mm')}</span> });
  if (order.sd_at) timelineItems.push({ color: 'purple', children: <span>🔬 <strong>СД</strong> — {dayjs(order.sd_at).format('DD.MM.YYYY HH:mm')}</span> });
  if (order.completed_at) timelineItems.push({ color: '#10B981', children: <span>✅ <strong>Выполнена</strong> — {dayjs(order.completed_at).format('DD.MM.YYYY HH:mm')}</span> });

  return (
    <Modal title={`Заявка №${order.id || ''}`} open={open} onCancel={onClose} footer={null} width={750} afterOpenChange={(v) => { if (v) loadData(); }}>
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="Клиент">{order.client?.name || '—'}{order.client?.blacklisted && <Tag color="red" style={{ marginLeft: 8 }}>ЧС</Tag>}</Descriptions.Item>
        <Descriptions.Item label="Телефон">{order.phone || '—'}</Descriptions.Item>
        <Descriptions.Item label="Адрес" span={2}>{order.address || '—'}</Descriptions.Item>
        <Descriptions.Item label="Направление">{order.branch?.region_department?.department?.name || order.branch?.region_department?.region?.name || '—'}</Descriptions.Item>
        <Descriptions.Item label="Регион">{order.city?.region?.name || '—'}</Descriptions.Item>
        <Descriptions.Item label="Город">{order.city?.name || '—'} <Button size="small" type="link" onClick={() => { setEditCityId(order.city_id); setEditBranchId(order.branch_id); loadBranches(order.city_id); setEditCityOpen(true); }}>✏️ Изменить</Button></Descriptions.Item>
        <Descriptions.Item label="Филиал">{order.branch?.name || '—'}</Descriptions.Item>
        <Descriptions.Item label="Тип техники"><Select size="small" value={order.technic_type_id} style={{ width: 160 }} onChange={handleChangeTechnic} options={technics.map(t => ({ value: t.id, label: t.name }))} /></Descriptions.Item>
        <Descriptions.Item label="Статус">{order.status && <Tag style={{ background: order.status.color || '#6B7280', color: order.status.text_color || '#fff', fontWeight: 'bold', border: 'none' }}>{order.status.name}</Tag>}</Descriptions.Item>
        <Descriptions.Item label="Мастер" span={2}>{order.master ? `${order.master.first_name} ${order.master.last_name}` : '—'}</Descriptions.Item>
        <Descriptions.Item label="Дата создания">{order.created_at ? dayjs(order.created_at).format('DD.MM.YYYY HH:mm') : '—'}</Descriptions.Item>
        <Descriptions.Item label="Дата прибытия">{order.scheduled_time ? dayjs(order.scheduled_time).format('DD.MM.YYYY HH:mm') : '—'} <Button size="small" type="link" onClick={onReschedule}>✏️ Изменить</Button></Descriptions.Item>
      </Descriptions>

      {(order.price_total || order.price_prepaid) && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 8 }}>
          <strong>💰 Суммы:</strong>
          <table style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse' }}><tbody>
            <tr><td style={{ padding: '4px 8px', color: '#888' }}>Общая:</td><td style={{ padding: '4px 8px', fontWeight: 'bold' }}>{order.price_total ?? '—'} ₽</td><td style={{ padding: '4px 8px', color: '#888' }}>Предоплата:</td><td style={{ padding: '4px 8px', fontWeight: 'bold' }}>{order.price_prepaid ?? '—'} ₽</td></tr>
            <tr><td style={{ padding: '4px 8px', color: '#888' }}>Остаток:</td><td style={{ padding: '4px 8px', fontWeight: 'bold' }}>{order.price_remainder ?? '—'} ₽</td><td style={{ padding: '4px 8px', color: '#888' }}>Запчасти:</td><td style={{ padding: '4px 8px', fontWeight: 'bold' }}>{order.price_parts ?? '—'} ₽</td></tr>
            <tr><td style={{ padding: '4px 8px', color: '#888' }} colSpan={3}>Чистая:</td><td style={{ padding: '4px 8px', fontWeight: 'bold', fontSize: 16, color: '#10B981' }}>{order.price_net ?? '—'} ₽</td></tr>
          </tbody></table>
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 260, flexShrink: 0 }}>
          <strong>📅 Хронология статусов:</strong>
          {timelineItems.length > 0 ? <Timeline style={{ marginTop: 8 }} items={timelineItems} /> : <div style={{ marginTop: 8, color: '#888' }}>Нет данных</div>}
        </div>
        <div style={{ flex: 1 }}>
          <strong>📝 Комментарий:</strong>
          <div style={{ marginTop: 4 }}>
            <Input.TextArea value={workComment} onChange={onCommentChange} rows={4} />
            <Space style={{ marginTop: 8 }}>
              <Button size="small" type="primary" onClick={onSaveComment}>Сохранить</Button>
              <Tooltip title="История"><Button size="small" icon={<HistoryOutlined />} onClick={onHistoryClick} /></Tooltip>
            </Space>
          </div>
          {photosSection && <div style={{ marginTop: 12 }}>{photosSection}</div>}
        </div>
      </div>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Space>
          {order.status?.id === 14 && <Button danger onClick={() => setCancelModalOpen(true)}>Отмена</Button>}
          {order.status?.id === 15 && (<><Button onClick={() => handleCancel('cc')}>Отмена (КЦ)</Button><Button onClick={() => handleCancel('bt')}>Отмена (БТ)</Button><Button danger onClick={handleMarkFake}>⚠️ Вброс</Button></>)}
          <Button onClick={handleReset}>🔄 Обнулить</Button>
          {order.status?.id !== 10 && <Button danger onClick={handleToDelete}>🗑 На удаление</Button>}
          {order.status?.id === 10 && <Button danger type="primary" onClick={handleDelete}>❌ Удалить</Button>}
          <Button onClick={onCopy}>📋 Копировать</Button>
          <Button onClick={onClose}>Закрыть</Button>
        </Space>
      </div>

      <Modal title="Причина отмены" open={cancelModalOpen} onCancel={() => setCancelModalOpen(false)} onOk={handleCancelRequest} okText="Отменить">
        <p>⚠️ После отправки не забудьте выбрать тип отмены (КЦ или БТ) или отметить как вброс.</p>
        <Select value={cancelReason} onChange={setCancelReason} style={{ width: '100%', marginBottom: 12 }} placeholder="Выберите причину" options={cancelReasons.map(r => ({ value: r.name, label: r.name }))} />
        <Input.TextArea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Или введите свою причину..." rows={3} />
      </Modal>

      <Modal title="Изменить город и филиал" open={editCityOpen} onCancel={() => setEditCityOpen(false)} onOk={handleChangeLocation} okText="Сохранить">
        <p>Город:</p><Select value={editCityId} onChange={(v) => { setEditCityId(v); setEditBranchId(null); loadBranches(v); }} style={{ width: '100%', marginBottom: 12 }}>{cities.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}</Select>
        <p>Филиал:</p><Select value={editBranchId} onChange={setEditBranchId} style={{ width: '100%' }}>{branches.map(b => <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>)}</Select>
      </Modal>
    </Modal>
  );
}

export default OrderDetailModal;