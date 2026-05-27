import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, message, AutoComplete } from 'antd';
import api from '../../services/api';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';

function AdvertisingLevel({ tree, value, onChange, showError }) {
  const [selectedId, setSelectedId] = useState(value);
  const options = tree.map(n => ({ value: n.id, label: n.name }));
  const selectedNode = tree.find(n => n.id === selectedId);
  const hasChildren = selectedNode?.children?.length > 0;

  useEffect(() => {
    if (value === null) setSelectedId(null);
  }, [value]);

  const handleChange = (v) => {
    setSelectedId(v);
    const node = tree.find(n => n.id === v);
    if (!node?.children?.length) {
      onChange(v);
    }
  };

  const handleChildFinal = (finalId) => {
    onChange(finalId);
  };

  const isEmpty = showError && !selectedId;

  return (
    <div>
      <Select
        placeholder="Выберите категорию"
        allowClear
        style={{ width: '100%' }}
        value={selectedId}
        onChange={handleChange}
        options={options}
        status={isEmpty ? 'error' : ''}
      />
      {hasChildren && (
        <div style={{ marginTop: 8 }}>
          <AdvertisingLevel
            tree={selectedNode.children}
            value={null}
            onChange={handleChildFinal}
            showError={showError}
          />
        </div>
      )}
    </div>
  );
}

function AdvertisingSelect({ value, onChange, showError }) {
  const [tree, setTree] = useState([]);

  useEffect(() => {
    api.get('/advertising-categories/tree', { params: { show_in_order_only: true } })
      .then(r => setTree(r.data || []))
      .catch(() => {});
  }, []);

  return (
    <div>
      <AdvertisingLevel tree={tree} value={value} onChange={onChange} showError={showError} />
    </div>
  );
}

function OrderForm({ open, onClose, onSuccess }) {
  const [form] = Form.useForm();
  useEffect(() => {
    if (open) {
      form.setFieldsValue({ scheduled_time: dayjs().add(1, 'hour') });
    }
  }, [open]);
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState([]);
  const [branches, setBranches] = useState([]);
  const [clientOptions, setClientOptions] = useState([]);
  const [selectedCityId, setSelectedCityId] = useState(null);
  const [technics, setTechnics] = useState([]);
  const [factors, setFactors] = useState([]);
  const [advertisingId, setAdvertisingId] = useState(null);
  const [advertisingRequired, setAdvertisingRequired] = useState(false);
  const [advertisingError, setAdvertisingError] = useState(false);
  const [clientNameInput, setClientNameInput] = useState('');

  useEffect(() => {
    if (open) {
      api.get('/cities/').then(r => setCities(r.data)).catch(() => {});
      api.get('/technics/').then(r => setTechnics(r.data)).catch(() => {});
      api.get('/factors/').then(r => setFactors(r.data)).catch(() => {});
      setAdvertisingId(null);
      setAdvertisingError(false);
      setClientNameInput('');
      api.get('/advertising-categories/tree', { params: { show_in_order_only: true } })
        .then(r => setAdvertisingRequired((r.data || []).length > 0))
        .catch(() => setAdvertisingRequired(false));
    }
  }, [open]);

  const handleCityChange = async (cityId) => {
    setSelectedCityId(cityId);
    form.setFieldValue('branch_id', null);
    try {
      const response = await api.get('/branches/', { params: { city_id: cityId } });
      const btBranches = response.data.filter(b => b.type === 'БТ');
      setBranches(btBranches);
    } catch (e) {
      setBranches([]);
    }
  };

  const fetchClients = async (search) => {
    if (!search || search.length < 2) {
      setClientOptions([]);
      return;
    }
    try {
      const response = await api.get('/clients/', { params: { search } });
      setClientOptions(response.data.map(c => ({
        value: c.name,
        label: `${c.name} (${c.phone})`,
        client: c,
      })));
    } catch (e) {
      setClientOptions([]);
    }
  };

  const fillClientFields = (option) => {
    if (option.client) {
      form.setFieldsValue({
        client_id: option.client.id,
        phone: option.client.phone,
        address: option.client.address,
      });
    }
  };

  const handleSubmit = async (values) => {
    if (advertisingRequired && !advertisingId) {
      setAdvertisingError(true);
      message.error('Выберите рекламу полностью (все уровни)');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...values, advertising_category_id: advertisingId || null };
      
      if (!payload.client_id || isNaN(parseInt(payload.client_id))) {
        if (!payload.phone) {
          message.error('Укажите телефон клиента');
          setLoading(false);
          return;
        }
        // Ищем клиента по точному совпадению телефона
        const searchRes = await api.get('/clients/', { params: { search: payload.phone } });
        const existingByPhone = searchRes.data.find(c => c.phone === payload.phone);
        
        if (existingByPhone) {
          payload.client_id = existingByPhone.id;
        } else {
          // Создаём нового клиента — имя берём из поля Клиент
          const clientName = clientNameInput || 'Клиент';
          const clientRes = await api.post('/clients/', null, { 
            params: { 
              name: clientName, 
              phone: payload.phone, 
              address: payload.address, 
              city_id: payload.city_id,
              branch_id: payload.branch_id,
            } 
          });
          payload.client_id = clientRes.data.id;
        }
      }
      
      if (typeof payload.client_id === 'string') {
        payload.client_id = parseInt(payload.client_id, 10);
      }
      
      if (values.scheduled_time && typeof values.scheduled_time !== 'string') {
        payload.scheduled_time = values.scheduled_time.format('YYYY-MM-DD HH:mm');
      }
      
      await api.post('/orders/', null, { params: payload });
      message.success('Заявка создана');
      form.resetFields();
      setAdvertisingId(null);
      setAdvertisingError(false);
      setClientNameInput('');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      message.error('Ошибка при создании заявки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Новая заявка" open={open} onCancel={onClose} footer={null} width={500}>
      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ status_id: 14, scheduled_time: dayjs().add(1, 'hour') }}>
        <Form.Item label="Клиент" required rules={[{ required: true, message: 'Введите или выберите клиента' }]}>
          <AutoComplete
            options={clientOptions}
            onSearch={(val) => { fetchClients(val); setClientNameInput(val); }}
            onSelect={(value, option) => { fillClientFields(option); setClientNameInput(option.client?.name || value); }}
            placeholder="Введите имя или телефон клиента"
          />
        </Form.Item>
        <Form.Item name="client_id" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="phone" label="Телефон" rules={[{ required: true, message: 'Введите или выберите телефон' }]}>
          <AutoComplete
            options={clientOptions}
            onSearch={fetchClients}
            onSelect={(value, option) => fillClientFields(option)}
            placeholder="Введите телефон"
          />
        </Form.Item>
        <Form.Item name="address" label="Адрес" rules={[{ required: true, message: 'Введите или выберите адрес' }]}>
          <AutoComplete
            options={clientOptions}
            onSearch={fetchClients}
            onSelect={(value, option) => fillClientFields(option)}
            placeholder="Введите адрес"
          />
        </Form.Item>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="city_id" label="Город" rules={[{ required: true, message: 'Выберите город' }]} style={{ flex: 1 }}>
            <Select
              placeholder="Город"
              showSearch
              optionFilterProp="label"
              onChange={handleCityChange}
              options={cities.map(c => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item name="branch_id" label="Филиал" rules={[{ required: true, message: 'Выберите филиал' }]} style={{ flex: 1 }}>
            <Select
              placeholder="Филиал"
              disabled={!selectedCityId}
              options={branches.map(b => ({ value: b.id, label: b.name }))}
            />
          </Form.Item>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="technic_type_id" label="Тип техники" rules={[{ required: true, message: 'Выберите тип техники' }]} style={{ flex: 1 }}>
            <Select placeholder="Тип" allowClear options={technics.map(t => ({ value: t.id, label: t.name }))} />
          </Form.Item>
          <Form.Item name="source" label="Фактор" rules={[{ required: true, message: 'Выберите фактор' }]} style={{ flex: 1 }}>
            <Select placeholder="Фактор" allowClear options={factors.map(f => ({ value: f.name, label: f.name }))} />
          </Form.Item>
        </div>
        {advertisingRequired && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: '#ff4d4f' }}>* </span>
              <span>Реклама</span>
            </div>
            <AdvertisingSelect value={advertisingId} onChange={(v) => { setAdvertisingId(v); if (v) setAdvertisingError(false); }} showError={advertisingError} />
          </div>
        )}
        <Form.Item name="scheduled_time" rules={[{ required: true, message: 'Выберите дату и время' }]} label="Дата и время">
          <DatePicker showTime format="YYYY-MM-DD HH:mm" placeholder="Дата и время выезда" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="description_original" label="Комментарий" rules={[{ required: true }]}>
          <Input.TextArea placeholder="Комментарий" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>Создать</Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default OrderForm;