import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Tag, Space, message, Select, Input, Tooltip, theme } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined } from '@ant-design/icons';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../services/api';
import dayjs from 'dayjs';

const typeColors = {
  'звонок': '#3B82F6',
  'сообщение': '#8B5CF6',
};

function AdvertisingLevel({ tree, value, onChange, showError }) {
  const [selectedId, setSelectedId] = useState(value);
  const options = tree.map(n => ({ value: n.id, label: n.name }));
  const selectedNode = tree.find(n => n.id === selectedId);
  const hasChildren = selectedNode?.children?.length > 0;

  useEffect(() => { if (value === null) setSelectedId(null); }, [value]);

  const handleChange = (v) => {
    setSelectedId(v);
    const node = tree.find(n => n.id === v);
    if (!node?.children?.length) onChange(v);
  };
  const handleChildFinal = (finalId) => { onChange(finalId); };
  const isEmpty = showError && !selectedId;

  return (
    <div>
      <Select placeholder="Выберите категорию" allowClear style={{ width: '100%' }} value={selectedId} onChange={handleChange} options={options} status={isEmpty ? 'error' : ''} />
      {hasChildren && (
        <div style={{ marginTop: 8 }}>
          <AdvertisingLevel tree={selectedNode.children} value={null} onChange={handleChildFinal} showError={showError} />
        </div>
      )}
    </div>
  );
}

function AdvertisingSelect({ value, onChange, showError }) {
  const [tree, setTree] = useState([]);
  useEffect(() => {
    api.get('/advertising-categories/tree', { params: { show_in_order_only: true } }).then(r => setTree(r.data || [])).catch(() => {});
  }, []);
  return <AdvertisingLevel tree={tree} value={value} onChange={onChange} showError={showError} />;
}

function DragRow(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props['data-row-key'] });
  const style = {
    ...props.style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return <tr {...props} ref={setNodeRef} style={style} {...attributes} {...listeners} />;
}

function ClientCardModal({ clientId, open, onClose }) {
  const [client, setClient] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [showOnlyOrders, setShowOnlyOrders] = useState(false);
  const [contactStatuses, setContactStatuses] = useState([]);
  const [newContact, setNewContact] = useState({ type: 'звонок', direction: 'входящий', status: '', notes: '', advertisement: '' });
  const [advertisingId, setAdvertisingId] = useState(null);
  const [advertisingError, setAdvertisingError] = useState(false);
  const [errors, setErrors] = useState({});
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [editAdvertisingId, setEditAdvertisingId] = useState(null);
  const [finance, setFinance] = useState({ turnover: 0, returned: 0, balance: 0 });

  const { token } = theme.useToken();

  const sensors = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });

  const fetchClient = async () => {
    if (!clientId) return;
    try { const r = await api.get(`/clients/${clientId}`); setClient(r.data); } catch (e) { console.error(e); }
  };

  const fetchFinance = async () => {
    if (!clientId) return;
    try { const r = await api.get(`/clients/${clientId}/finance`); setFinance(r.data); } catch (e) { console.error(e); }
  };

  const fetchContacts = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const r = await api.get('/client-contacts/', { params: { client_id: clientId } });
      setContacts(r.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (open && clientId) {
      fetchClient(); fetchContacts(); fetchFinance();
      api.get('/contact-statuses/').then(r => setContactStatuses(r.data)).catch(() => {});
    }
  }, [open, clientId]);

  const handleCreateContact = async () => {
    const newErrors = {};
    if (!newContact.type) newErrors.type = 'Выберите тип';
    if (!newContact.direction) newErrors.direction = 'Выберите направление';
    if (!newContact.notes) newErrors.notes = 'Введите примечания';
    if (!advertisingId) { setAdvertisingError(true); message.error('Выберите рекламу полностью'); return; }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    try {
      await api.post('/client-contacts/', null, { params: { client_id: clientId, ...newContact, advertising_category_id: advertisingId } });
      message.success('Обращение создано');
      setNewContactOpen(false);
      setNewContact({ type: 'звонок', direction: 'входящий', status: '', notes: '', advertisement: '' });
      setAdvertisingId(null); setAdvertisingError(false); setErrors({});
      fetchContacts();
    } catch (e) { message.error('Ошибка'); }
  };

  const handleUpdateContact = async () => {
    if (!editContact) return;
    try {
      await api.put(`/client-contacts/${editContact.id}`, null, { params: { ...editContact, advertising_category_id: editAdvertisingId } });
      message.success('Обращение обновлено');
      setEditContactOpen(false); setEditContact(null); setEditAdvertisingId(null);
      fetchContacts();
    } catch (e) { message.error('Ошибка обновления'); }
  };

  const deleteContact = (contactId) => {
    Modal.confirm({
      title: 'Удалить обращение?', content: 'Это действие нельзя отменить.',
      okText: 'Удалить', cancelText: 'Отмена', okType: 'danger',
      onOk: async () => {
        try { await api.delete(`/client-contacts/${contactId}`); message.success('Обращение удалено'); fetchContacts(); }
        catch (e) { message.error('Ошибка удаления'); }
      },
    });
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = contacts.findIndex(c => c.id === active.id);
    const newIndex = contacts.findIndex(c => c.id === over.id);
    const newContacts = arrayMove(contacts, oldIndex, newIndex);
    setContacts(newContacts);
    const order = newContacts.map(c => c.id).join(',');
    try { await api.put('/client-contacts/reorder', null, { params: { client_id: clientId, order } }); }
    catch (e) { message.error('Ошибка сохранения порядка'); }
  };

  const copyPhone = () => {
    if (client?.phone) { navigator.clipboard.writeText(client.phone); message.success('Телефон скопирован'); }
  };

  const displayedContacts = showOnlyOrders ? contacts.filter(c => c.order_id) : contacts;

  const getContactStatusStyle = (statusName) => {
    const found = contactStatuses.find(s => s.name === statusName);
    if (found?.color) return { background: found.color, color: found.text_color || '#fff', fontWeight: 'bold', border: 'none' };
    return {};
  };

  const contactColumns = [
    { title: 'Статус', key: 'status', width: 100, render: (_, r) => r.status ? <Tag style={getContactStatusStyle(r.status)}>{r.status}</Tag> : '—' },
    { title: 'Вложения', key: 'attachments', width: 80, render: () => '—' },
    { title: 'Реклама', key: 'advertisement', width: 120, render: (_, r) => r.advertisement || (r.advertising_category?.name || '—') },
    { title: 'Оператор', key: 'operator', width: 120, render: (_, r) => r.operator ? `${r.operator.first_name} ${r.operator.last_name}` : '—' },
    { title: 'Тип', key: 'type', width: 100, render: (_, r) => <Tag color={typeColors[r.type] || '#6B7280'}>{r.type}</Tag> },
    { title: 'Направление', key: 'direction', width: 100, render: (_, r) => r.direction === 'входящий' ? '📥 Входящий' : '📤 Исходящий' },
    { title: 'Примечания', key: 'notes', render: (_, r) => r.notes || '—' },
    { title: 'Отдел', key: 'department', width: 80, render: (_, r) => r.department || '—' },
    { title: 'Дата обращения', key: 'created_at', width: 120, render: (_, r) => r.created_at ? dayjs(r.created_at).format('DD.MM.YYYY HH:mm') : '—' },
    { title: '', key: 'edit', width: 80, render: (_, r) =>
        editMode ? <Button size="small" danger onClick={() => deleteContact(r.id)}>Удалить</Button>
          : <Button size="small" type="link" onClick={() => { setEditContact({ ...r }); setEditAdvertisingId(r.advertising_category_id); setEditContactOpen(true); }}><EditOutlined /></Button>
    },
  ];

  const statusOptions = contactStatuses.map(s => ({ value: s.name, label: s.name }));

  return (
    <Modal title={null} open={open} onCancel={onClose} footer={null} width="95%" style={{ top: 40, paddingTop: 0 }}>
      <style>{`
        .draggable-row:hover td {
          background: rgba(22, 119, 255, 0.08) !important;
          transition: background 0.2s;
        }
      `}</style>
      {client && (<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingRight: 40 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>👤 {client.name}{client.blacklisted && <Tag color="red" style={{ marginLeft: 8 }}>ЧС</Tag>}</h1>
          <div style={{ fontSize: 18, color: '#888', display: 'flex', alignItems: 'center', gap: 8 }}>
            {client.phone}
            <Tooltip title="Копировать"><Button size="small" type="text" icon={<CopyOutlined />} onClick={copyPhone} style={{ color: '#888' }} /></Tooltip>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Обращения ({displayedContacts.length})</h3>
          <Button type="primary" onClick={() => {
            localStorage.setItem('searchClientId', clientId);
            window.dispatchEvent(new CustomEvent('searchClient', { detail: { clientId } }));
            if (window.location.hash.includes('clients:search') || document.querySelector('.ant-card-head-title')?.textContent === '🔍 Поиск') onClose();
            else window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'clients:search' } }));
          }}>📋 Заявки</Button>
          <Space>
            <Button icon={<EditOutlined />} onClick={() => setEditMode(!editMode)}>Редактировать</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewContactOpen(true)}>Новое обращение</Button>
          </Space>
        </div>

        <DndContext sensors={[sensors]} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayedContacts.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <Table
              columns={contactColumns}
              dataSource={displayedContacts}
              rowKey="id"
              loading={loading}
              size="small"
              scroll={{ x: 1100 }}
              pagination={false}
              style={{ borderRadius: 8, overflow: 'hidden' }}
              components={editMode ? { body: { row: DragRow } } : {}}
              rowClassName={editMode ? 'draggable-row' : ''}
            />
          </SortableContext>
        </DndContext>

        <Modal title="Новое обращение" open={newContactOpen} onCancel={() => { setNewContactOpen(false); setErrors({}); setAdvertisingError(false); }} onOk={handleCreateContact} okText="Создать">
          <p>Тип: <span style={{ color: 'red' }}>*</span> {errors.type && <span style={{ color: 'red', fontSize: 12 }}>{errors.type}</span>}</p>
          <Select value={newContact.type} onChange={(v) => { setNewContact({ ...newContact, type: v }); setErrors({ ...errors, type: '' }); }} status={errors.type ? 'error' : ''} style={{ width: '100%', marginBottom: 12 }}
            options={[{ value: 'звонок', label: '📞 Звонок' }, { value: 'сообщение', label: '💬 Сообщение' }]} />
          <p>Направление: <span style={{ color: 'red' }}>*</span> {errors.direction && <span style={{ color: 'red', fontSize: 12 }}>{errors.direction}</span>}</p>
          <Select value={newContact.direction} onChange={(v) => { setNewContact({ ...newContact, direction: v }); setErrors({ ...errors, direction: '' }); }} status={errors.direction ? 'error' : ''} style={{ width: '100%', marginBottom: 12 }}
            options={[{ value: 'входящий', label: '📥 Входящий' }, { value: 'исходящий', label: '📤 Исходящий' }]} />
          <p>Статус:</p>
          <Select value={newContact.status} onChange={(v) => setNewContact({ ...newContact, status: v })} style={{ width: '100%', marginBottom: 12 }} options={statusOptions} />
          <p>Примечания: <span style={{ color: 'red' }}>*</span> {errors.notes && <span style={{ color: 'red', fontSize: 12 }}>{errors.notes}</span>}</p>
          <Input.TextArea value={newContact.notes} onChange={(e) => { setNewContact({ ...newContact, notes: e.target.value }); setErrors({ ...errors, notes: '' }); }} status={errors.notes ? 'error' : ''} rows={3} />
          <div style={{ marginTop: 12, marginBottom: 12 }}>
            <p><span style={{ color: '#ff4d4f' }}>* </span>Реклама:</p>
            <AdvertisingSelect value={advertisingId} onChange={(v) => { setAdvertisingId(v); if (v) setAdvertisingError(false); }} showError={advertisingError} />
          </div>
        </Modal>

        <Modal title="Редактировать обращение" open={editContactOpen} onCancel={() => setEditContactOpen(false)} onOk={handleUpdateContact} okText="Сохранить">
          {editContact && (<>
            <p>Тип:</p>
            <Select value={editContact.type} onChange={(v) => setEditContact({ ...editContact, type: v })} style={{ width: '100%', marginBottom: 12 }}
              options={[{ value: 'звонок', label: 'Звонок' }, { value: 'сообщение', label: 'Сообщение' }]} />
            <p>Направление:</p>
            <Select value={editContact.direction} onChange={(v) => setEditContact({ ...editContact, direction: v })} style={{ width: '100%', marginBottom: 12 }}
              options={[{ value: 'входящий', label: 'Входящий' }, { value: 'исходящий', label: 'Исходящий' }]} />
            <p>Статус:</p>
            <Select value={editContact.status} onChange={(v) => setEditContact({ ...editContact, status: v })} style={{ width: '100%', marginBottom: 12 }} options={statusOptions} />
            <p>Примечания:</p>
            <Input.TextArea value={editContact.notes} onChange={(e) => setEditContact({ ...editContact, notes: e.target.value })} rows={3} />
            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <p><span style={{ color: '#ff4d4f' }}>* </span>Реклама:</p>
              <AdvertisingSelect value={editAdvertisingId} onChange={setEditAdvertisingId} />
            </div>
          </>)}
        </Modal>
      </>)}
    </Modal>
  );
}

export default ClientCardModal;