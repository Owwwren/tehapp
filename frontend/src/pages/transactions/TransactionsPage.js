import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, Select, message, Tag, DatePicker, theme, Tooltip } from 'antd';
import { PlusOutlined, ReloadOutlined, PaperClipOutlined } from '@ant-design/icons';
import api from '../../services/api';
import PhotoUploader from '../../components/PhotoUploader';
import dayjs from 'dayjs';
const { RangePicker } = DatePicker;

function TransactionsPage() {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer === '#141414' || token.colorBgBase === '#000';
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const [txPhotos, setTxPhotos] = useState([]);
  const [isRefund, setIsRefund] = useState(false);
  const [clientsList, setClientsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [typeId, setTypeId] = useState(null);
  const [categoryOther, setCategoryOther] = useState(false);
  const [branchesList, setBranchesList] = useState([]);
  const [branchId, setBranchId] = useState(null);
  const [filterTypeId, setFilterTypeId] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterDateRange, setFilterDateRange] = useState(null);
  const [isNegative, setIsNegative] = useState(false);
  const [txLocalFiles, setTxLocalFiles] = useState([]);
  const [viewTxId, setViewTxId] = useState(null);
  const [balance, setBalance] = useState({ fact_cassa: 0, income: 0, expense: 0, balance: 0 });
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [transactionCategories, setTransactionCategories] = useState([]);

  // Каскадные фильтры
  const [allDepartments, setAllDepartments] = useState([]);
  const [allRegions, setAllRegions] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [filterDepartment, setFilterDepartment] = useState(null);
  const [filterRegion, setFilterRegion] = useState(null);
  const [filterCity, setFilterCity] = useState(null);
  const [filterBranch, setFilterBranch] = useState(null);

  const departmentOptions = allDepartments.map(d => ({ value: d.id, label: d.name }));
  const regionOptions = allRegions.filter(r => !filterDepartment || r.departments?.some(d => d.id === filterDepartment)).map(r => ({ value: r.id, label: r.name }));
  const cityOptions = allCities.filter(c => !filterRegion || c.region_id === filterRegion).map(c => ({ value: c.id, label: c.name }));
  const branchOptions = allBranches.filter(b => (!filterCity || b.city_id === filterCity)).map(b => ({ value: b.id, label: `${b.name} (${b.type})` }));

  const refreshAll = () => { fetchTransactions(); fetchBalance(); };

  useEffect(() => {
    refreshAll();
    api.get('/transactions/types').then(r => setTransactionTypes(r.data)).catch(() => {});
    api.get('/transaction-categories/').then(r => setTransactionCategories(r.data)).catch(() => {});
    api.get('/departments/').then(r => setAllDepartments(r.data)).catch(() => {});
    api.get('/regions/').then(r => setAllRegions(r.data)).catch(() => {});
    api.get('/cities/').then(r => setAllCities(r.data)).catch(() => {});
    api.get('/branches/').then(r => { setAllBranches(r.data); setBranchesList(r.data); }).catch(() => {});
    const interval = setInterval(() => refreshAll(), 5000);
    return () => clearInterval(interval);
  }, [filterTypeId, filterStatus, filterCategory, filterDateRange, filterBranch, filterCity, filterRegion, filterDepartment]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterTypeId) params.type_id = filterTypeId;
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      if (filterBranch) params.branch_id = filterBranch;
      else if (filterCity) params.city_id = filterCity;
      else if (filterRegion) params.region_id = filterRegion;
      else if (filterDepartment) params.department_id = filterDepartment;
      if (filterDateRange) {
        params.date_from = filterDateRange[0].format('YYYY-MM-DD');
        params.date_to = filterDateRange[1].format('YYYY-MM-DD');
      }
      const response = await api.get('/transactions/', { params });
      setTransactions(response.data);
    } catch (error) { message.error('Ошибка загрузки транзакций'); }
    finally { setLoading(false); }
  };

  const fetchBalance = async () => {
    try {
      const params = {};
      if (filterBranch) params.branch_id = filterBranch;
      if (filterDateRange) {
        params.date_from = filterDateRange[0].format('YYYY-MM-DD');
        params.date_to = filterDateRange[1].format('YYYY-MM-DD');
      }
      const res = await api.get('/transactions/balance', { params });
      setBalance(res.data);
    } catch (e) { console.error('Ошибка загрузки баланса:', e); }
  };

  const handleSubmit = async (values) => {
    if (txLocalFiles.length === 0) { message.error('Прикрепите хотя бы одно фото'); return; }
    try {
      const response = await api.post('/transactions/', null, { params: values });
      const txId = response.data.id;
      for (const lf of txLocalFiles) {
        const formData = new FormData();
        formData.append('file', lf.file);
        await api.post(`/transactions/${txId}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      if (values.category === 'Возврат' && values.client_id) {
        await api.put(`/clients/${values.client_id}/update-returned`, null, { params: { amount: values.amount } });
      }
      message.success('Транзакция создана');
      form.resetFields();
      setTxLocalFiles([]); setTypeId(null); setBranchId(null); setIsRefund(false); setCategoryOther(false);
      setClientsList([]); setOrdersList([]); setModalOpen(false);
      refreshAll();
    } catch (error) { message.error('Ошибка'); }
  };

  const handleConfirm = async (id) => {
    try { await api.put(`/transactions/${id}/confirm`); message.success('Транзакция подтверждена'); refreshAll(); }
    catch (error) { message.error('Ошибка'); }
  };

  const handleCancel = async (id) => {
    try { await api.put(`/transactions/${id}/cancel`); message.success('Транзакция обнулена'); refreshAll(); }
    catch (error) { message.error('Ошибка'); }
  };

  const fetchTxPhotos = async (txId) => {
    try {
      const response = await api.get(`/transactions/${txId}/photos`);
      setTxPhotos(response.data);
      setViewTxId(txId);
    } catch (e) { message.error('Ошибка загрузки фото'); }
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Удалить транзакцию?', content: 'Транзакция будет удалена безвозвратно.',
      okText: 'Удалить', cancelText: 'Отмена', okType: 'danger',
      onOk: async () => {
        try { await api.delete(`/transactions/${id}`); message.success('Транзакция удалена'); refreshAll(); }
        catch (error) { message.error('Ошибка удаления'); }
      }
    });
  };

  const handleDepartmentChange = (v) => { setFilterDepartment(v); setFilterRegion(null); setFilterCity(null); setFilterBranch(null); };
  const handleRegionChange = (v) => { setFilterRegion(v); setFilterCity(null); setFilterBranch(null); };
  const handleCityChange = (v) => { setFilterCity(v); setFilterBranch(null); };

  const statusColors = { created: 'blue', confirmed: 'green', cancelled: 'red' };
  const statusNames = { created: 'Создана', confirmed: 'Подтверждена', cancelled: 'Обнулена' };

  const columns = [
    { title: '№', dataIndex: 'id', key: 'id', width: 60 },
    { title: 'Дата', dataIndex: 'created_at', key: 'created_at', width: 120, render: (t) => t ? dayjs(t).format('DD.MM HH:mm') : '—' },
    { title: 'Статус', dataIndex: 'status', key: 'status', width: 130, render: (v) => <Tag color={statusColors[v] || 'default'}>{statusNames[v] || v}</Tag> },
    { title: 'Тип', dataIndex: 'type', key: 'type', width: 100, render: (t) => t ? <Tag color={t.direction === 'income' ? 'green' : 'red'}>{t.name}</Tag> : '—' },
    { title: 'Сумма', dataIndex: 'amount', key: 'amount', render: (v) => v ? `${v} ₽` : '—' },
    { title: 'Категория', dataIndex: 'category', key: 'category', render: (v) => { if (v === 'Возврат') return <Tag color="orange">{v}</Tag>; if (v === 'Негативный отзыв') return <Tag color="red">{v}</Tag>; return v; }},
    { title: 'Описание', dataIndex: 'description', key: 'description' },
    {
      title: 'Действия', key: 'actions', width: 220,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<PaperClipOutlined />} onClick={() => fetchTxPhotos(record.id)} />
          {record.status === 'created' && <Button size="small" type="link" onClick={() => handleConfirm(record.id)}>Подтвердить</Button>}
          {(record.status === 'created' || record.status === 'confirmed') && <Button size="small" type="link" danger onClick={() => handleCancel(record.id)}>Обнулить</Button>}
          {record.status === 'cancelled' && <>
            <Button size="small" type="link" onClick={async () => { try { await api.put(`/transactions/${record.id}/restore`); message.success('Транзакция восстановлена'); refreshAll(); } catch (e) { message.error('Ошибка'); } }}>Вернуть</Button>
            <Button size="small" type="link" danger onClick={() => handleDelete(record.id)}>Удалить</Button>
          </>}
        </Space>
      ),
    },
  ];

  return (
    <Card title="💰 Транзакции" extra={<Space><Button icon={<ReloadOutlined />} onClick={refreshAll}>Обновить</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Создать</Button></Space>}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select placeholder="Тип" allowClear style={{ width: 130 }} value={filterTypeId} onChange={setFilterTypeId}
          options={transactionTypes.map(t => ({ value: t.id, label: t.name }))} />
        <Select placeholder="Статус" allowClear style={{ width: 150 }} value={filterStatus} onChange={setFilterStatus}
          options={[{ value: 'created', label: 'Создана' }, { value: 'confirmed', label: 'Подтверждена' }, { value: 'cancelled', label: 'Обнулена' }]} />
        <Select placeholder="Категория" allowClear style={{ width: 170 }} value={filterCategory} onChange={setFilterCategory}
          options={transactionCategories.filter(c => !filterTypeId || c.type_id === filterTypeId).map(c => ({ value: c.name, label: c.name }))} />
        <RangePicker value={filterDateRange} onChange={setFilterDateRange} format="DD.MM.YYYY" style={{ width: 240 }} />
        <Select placeholder="Направление" allowClear style={{ width: 150 }} value={filterDepartment} onChange={handleDepartmentChange} options={departmentOptions} />
        <Select placeholder="Регион" allowClear style={{ width: 150 }} value={filterRegion} onChange={handleRegionChange} options={regionOptions} />
        <Select placeholder="Город" allowClear style={{ width: 150 }} value={filterCity} onChange={handleCityChange} options={cityOptions} />
        <Select placeholder="Филиал" allowClear style={{ width: 180 }} value={filterBranch} onChange={setFilterBranch} options={branchOptions} />
        <Button icon={<ReloadOutlined />} onClick={() => { setFilterTypeId(null); setFilterStatus(null); setFilterCategory(null); setFilterDateRange(null); setFilterDepartment(null); setFilterRegion(null); setFilterCity(null); setFilterBranch(null); }}>Сбросить</Button>
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 16, padding: 12, background: isDark ? '#1f1f1f' : '#f5f5f5', borderRadius: 8 }}>
        <div><div style={{ fontSize: 12, color: '#888' }}>Факт касса</div><div style={{ fontSize: 18, fontWeight: 600, color: '#10B981' }}>{balance.fact_cassa.toLocaleString()} ₽</div></div>
        <Tooltip title={<span>Подтверждено: {transactions.filter(t => t.type?.direction === 'income' && t.status === 'confirmed').reduce((s, t) => s + parseFloat(t.amount || 0), 0).toLocaleString()} ₽<br />Не подтверждено: {transactions.filter(t => t.type?.direction === 'income' && t.status === 'created').reduce((s, t) => s + parseFloat(t.amount || 0), 0).toLocaleString()} ₽</span>}><div style={{ cursor: 'default' }}><div style={{ fontSize: 12, color: '#888' }}>+ Приходы</div><div style={{ fontSize: 18, fontWeight: 600, color: '#10B981' }}>{balance.income.toLocaleString()} ₽</div></div></Tooltip>
        <Tooltip title={<span>Подтверждено: {transactions.filter(t => t.type?.direction === 'expense' && t.status === 'confirmed').reduce((s, t) => s + parseFloat(t.amount || 0), 0).toLocaleString()} ₽<br />Не подтверждено: {transactions.filter(t => t.type?.direction === 'expense' && t.status === 'created').reduce((s, t) => s + parseFloat(t.amount || 0), 0).toLocaleString()} ₽</span>}><div style={{ cursor: 'default' }}><div style={{ fontSize: 12, color: '#888' }}>− Расходы</div><div style={{ fontSize: 18, fontWeight: 600, color: '#EF4444' }}>{balance.expense.toLocaleString()} ₽</div></div></Tooltip>
        <div><div style={{ fontSize: 12, color: '#888' }}>Остаток</div><div style={{ fontSize: 18, fontWeight: 600, color: '#2563EB' }}>{balance.balance.toLocaleString()} ₽</div></div>
      </div>

      <Table columns={columns} dataSource={transactions} rowKey="id" loading={loading} size="small" />

      <Modal title="Новая транзакция" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={500}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="type_id" label="Тип" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="Выберите тип" onChange={(v) => { setTypeId(v); setIsRefund(false); setCategoryOther(false); setBranchId(null); form.setFieldsValue({ category: null, client_id: null, order_id: null, amount: null, description: null, branch_id: null }); setOrdersList([]); setTxLocalFiles([]); }}
                options={transactionTypes.map(t => ({ value: t.id, label: t.name }))} />
            </Form.Item>
            <Form.Item name="branch_id" label="Филиал" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="Выберите филиал" disabled={!typeId} onChange={(v) => { setBranchId(v); setIsRefund(false); setCategoryOther(false); form.setFieldsValue({ category: null, client_id: null, order_id: null, amount: null, description: null }); setOrdersList([]); setTxLocalFiles([]); }}
                options={allBranches.map(b => ({ value: b.id, label: b.name }))} />
            </Form.Item>
          </div>
          {typeId && (
            <Form.Item name="category" label="Категория" rules={[{ required: true, message: 'Выберите категорию' }]}>
              <Select placeholder="Выберите категорию" disabled={!branchId}
                onChange={(v) => {
                  setIsRefund(v === 'Возврат');
                  setCategoryOther(v === 'Другое (приход)' || v === 'Другое (расход)');
                  setIsNegative(v === 'Негативный отзыв');
                  form.setFieldsValue({ client_id: null, order_id: null, description: null, amount: null });
                  setOrdersList([]); setTxLocalFiles([]);
                }}
                options={transactionCategories.filter(c => c.type_id === typeId).map(c => ({ value: c.name, label: c.name }))} />
            </Form.Item>
          )}
          {isRefund && (<>
            <Form.Item name="client_id" label="Клиент" rules={[{ required: true }]}><Select placeholder="Введите имя или телефон" showSearch optionFilterProp="label" allowClear notFoundContent="Введите имя или телефон для поиска" onClear={() => { form.setFieldsValue({ order_id: null }); setOrdersList([]); }} onSearch={async (val) => { if (!val || val.length < 2) { setClientsList([]); return; } try { const res = await api.get('/clients/', { params: { search: val } }); setClientsList(res.data); } catch (e) { setClientsList([]); } }} onChange={async (clientId) => { if (!clientId) { form.setFieldsValue({ order_id: null }); setOrdersList([]); return; } form.setFieldsValue({ order_id: null }); const res = await api.get('/orders/', { params: { client_id: clientId } }); setOrdersList(res.data); if (res.data.length > 0) { form.setFieldsValue({ order_id: res.data[0].id, amount: res.data[0].price_total }); } }} filterOption={false} options={clientsList.map(c => ({ value: c.id, label: `${c.name} (${c.phone})` }))} /></Form.Item>
            <Form.Item name="order_id" label="Заявка" rules={[{ required: true }]}><Select placeholder="Введите ID или выберите" showSearch optionFilterProp="label" allowClear notFoundContent={ordersList.length === 0 ? 'Сначала выберите клиента или введите ID заявки' : 'Не найдено'} onSearch={async (val) => { if (!val || val.length < 1) { if (!val) { form.setFieldsValue({ client_id: null }); setOrdersList([]); } return; } if (!isNaN(val)) { try { const res = await api.get(`/orders/${val}`); if (res.data) { form.setFieldsValue({ client_id: res.data.client_id, amount: res.data.price_total }); const clientOrders = await api.get('/orders/', { params: { client_id: res.data.client_id } }); setOrdersList(clientOrders.data); } } catch (e) { form.setFieldsValue({ client_id: null }); setOrdersList([]); } } }} onClear={() => { form.setFieldsValue({ client_id: null }); setOrdersList([]); }} onChange={(v) => { if (!v) { form.setFieldsValue({ client_id: null }); setOrdersList([]); return; } const order = ordersList.find(o => o.id == v); if (order) { form.setFieldsValue({ client_id: order.client_id, amount: order.price_total }); } }} filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())} options={ordersList.map(o => ({ value: o.id, label: `№${o.id} — ${o.status?.name || '—'} — ${o.price_total || 0}₽` }))} /></Form.Item>
          </>)}
          <Form.Item name="amount" label="Сумма" rules={[{ required: true }]}><Input type="number" placeholder="5000" disabled={(isRefund && !form.getFieldValue('order_id') && !form.getFieldValue('client_id')) || (!isRefund && !form.getFieldValue('category'))} /></Form.Item>
          <Form.Item name="description" label="Описание" rules={(categoryOther || isRefund || isNegative) ? [{ required: true, message: isRefund ? 'Укажите причину возврата' : 'Введите описание' }] : []}><Input.TextArea rows={2} disabled={(isRefund && !form.getFieldValue('order_id') && !form.getFieldValue('client_id')) || (!isRefund && !form.getFieldValue('category'))} placeholder={isRefund ? 'Причина возврата' : isNegative ? 'Обязательно для негативного отзыва' : categoryOther ? 'Обязательно при выборе «Другое»' : ''} /></Form.Item>
          {form.getFieldValue('category') && (
            <div style={{ marginBottom: 16 }}>
              <PhotoUploader entityType="transaction" entityId={null} photos={[]} onPhotosChange={() => {}} localFiles={txLocalFiles} onLocalFilesChange={setTxLocalFiles} />
            </div>
          )}
          <Form.Item><Button type="primary" htmlType="submit" block>Создать</Button></Form.Item>
        </Form>
      </Modal>
      <Modal title="📎 Фото транзакции" open={!!viewTxId} onCancel={() => setViewTxId(null)} footer={null} width={500}>
        <PhotoUploader entityType="transaction" entityId={viewTxId} photos={txPhotos} onPhotosChange={setTxPhotos} instantUpload={true} />
      </Modal>
    </Card>
  );
}

export default TransactionsPage;