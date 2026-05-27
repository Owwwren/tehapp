import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Input, Tag, Modal, Form, message, Select, Switch } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../services/api';
import ClientCardModal from '../../components/ClientCardModal';
import ClientSearchPage from './ClientSearchPage';
import VlozheniaButton from '../../components/VlozheniaButton';

function ClientsPage({ subPage }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [clientCardOpen, setClientCardOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [editForm] = Form.useForm();

  const [allDepartments, setAllDepartments] = useState([]);
  const [allRegions, setAllRegions] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [filterDepartment, setFilterDepartment] = useState(null);
  const [filterRegion, setFilterRegion] = useState(null);
  const [filterCity, setFilterCity] = useState(null);
  const [filterBranch, setFilterBranch] = useState(null);

  const [formDepartments, setFormDepartments] = useState([]);
  const [formRegions, setFormRegions] = useState([]);
  const [formCities, setFormCities] = useState([]);
  const [formBranches, setFormBranches] = useState([]);

  const departmentOptions = allDepartments.map(d => ({ value: d.id, label: d.name }));
  const regionOptions = allRegions.filter(r => !filterDepartment || r.departments?.some(d => d.id === filterDepartment)).map(r => ({ value: r.id, label: r.name }));
  const cityOptions = allCities.filter(c => !filterRegion || c.region_id === filterRegion).map(c => ({ value: c.id, label: c.name }));
  const branchOptions = allBranches.filter(b => (!filterCity || b.city_id === filterCity)).map(b => ({ value: b.id, label: `${b.name} (${b.type})` }));

  const formDepartmentOptions = formDepartments.map(d => ({ value: d.id, label: d.name }));
  const formRegionOptions = formRegions.filter(r => !form.getFieldValue('department_id') || r.departments?.some(d => d.id === form.getFieldValue('department_id'))).map(r => ({ value: r.id, label: r.name }));
  const formCityOptions = formCities.filter(c => !form.getFieldValue('region_id') || c.region_id === form.getFieldValue('region_id')).map(c => ({ value: c.id, label: c.name }));
  const formBranchOptions = formBranches.filter(b => (!form.getFieldValue('city_id') || b.city_id === form.getFieldValue('city_id'))).map(b => ({ value: b.id, label: `${b.name} (${b.type})` }));

  useEffect(() => {
    api.get('/departments/').then(r => { setAllDepartments(r.data); setFormDepartments(r.data); }).catch(() => {});
    api.get('/regions/').then(r => { setAllRegions(r.data); setFormRegions(r.data); }).catch(() => {});
    api.get('/cities/').then(r => { setAllCities(r.data); setFormCities(r.data); }).catch(() => {});
    api.get('/branches/').then(r => { setAllBranches(r.data); setFormBranches(r.data); }).catch(() => {});
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterBranch) params.branch_id = filterBranch;
      else if (filterCity) params.city_id = filterCity;
      else if (filterRegion) params.region_id = filterRegion;
      else if (filterDepartment) params.department_id = filterDepartment;
      const response = await api.get('/clients/', { params });
      setClients(response.data);
    } catch (error) {
      console.error('Ошибка загрузки клиентов:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = () => { fetchClients(); };

  useEffect(() => {
    fetchClients();
    const interval = setInterval(() => fetchClients(), 5000);
    return () => clearInterval(interval);
  }, [search, filterBranch, filterCity, filterRegion, filterDepartment]);

  useEffect(() => {
    setClientCardOpen(false);
  }, [subPage]);

  const handleCreate = async (values) => {
    try {
      await api.post('/clients/', null, { params: values });
      message.success('Клиент создан');
      form.resetFields();
      setModalOpen(false);
      refreshAll();
    } catch (error) {
      message.error('Ошибка при создании клиента');
    }
  };

  const handleEdit = async (values) => {
    try {
      await api.put(`/clients/${editClient.id}`, null, { params: values });
      message.success('Клиент обновлён');
      setEditModalOpen(false);
      refreshAll();
    } catch (error) { message.error('Ошибка'); }
  };

  const handleDepartmentChange = (v) => { setFilterDepartment(v); setFilterRegion(null); setFilterCity(null); setFilterBranch(null); };
  const handleRegionChange = (v) => { setFilterRegion(v); setFilterCity(null); setFilterBranch(null); };
  const handleCityChange = (v) => { setFilterCity(v); setFilterBranch(null); };

  const handleFormDepartmentChange = (v) => {
    form.setFieldsValue({ region_id: null, city_id: null, branch_id: null });
    editForm.setFieldsValue({ region_id: null, city_id: null, branch_id: null });
    if (v) api.get('/regions/', { params: { department_id: v } }).then(r => setFormRegions(r.data));
    else setFormRegions(allRegions);
    setFormCities([]); setFormBranches([]);
  };

  const handleFormRegionChange = (v) => {
    form.setFieldsValue({ city_id: null, branch_id: null });
    editForm.setFieldsValue({ city_id: null, branch_id: null });
    if (v) api.get('/cities/').then(r => setFormCities(r.data));
    else setFormCities(allCities);
    setFormBranches([]);
  };

  const handleFormCityChange = (v) => {
    form.setFieldsValue({ branch_id: null });
    editForm.setFieldsValue({ branch_id: null });
    if (v) api.get('/branches/', { params: { city_id: v } }).then(r => setFormBranches(r.data));
    else setFormBranches(allBranches);
  };

  const openCreate = () => {
    form.resetFields();
    setFormRegions(allRegions);
    setFormCities(allCities);
    setFormBranches(allBranches);
    setModalOpen(true);
  };

  const openEdit = (client) => {
    setEditClient(client);
    editForm.setFieldsValue({
      name: client.name,
      phone: client.phone,
      address: client.address,
      notes: client.notes,
      blacklisted: client.blacklisted,
      department_id: null,
      region_id: null,
      city_id: client.city_id,
      branch_id: client.branch_id,
    });
    setFormRegions(allRegions);
    setFormCities(allCities);
    setFormBranches(allBranches);
    setEditModalOpen(true);
  };

  const columns = [
    { title: '№', dataIndex: 'id', key: 'id', width: 60 },
    { title: 'Имя', key: 'name',
      render: (_, r) => r.blacklisted ? <span>{r.name} <Tag color="red">ЧС</Tag></span> : r.name
    },
    { title: 'Телефон', dataIndex: 'phone', key: 'phone' },
    { title: 'Филиал', key: 'branch', width: 150, render: (_, r) => r.branch?.name || '—' },
    { title: 'Всего заявок', dataIndex: 'total_orders', key: 'total_orders', width: 100 },
    { title: 'Выручка', key: 'earned', width: 100, render: (_, r) => r.total_earned ? `${r.total_earned} ₽` : '0 ₽' },
    { title: 'Возвраты', key: 'returned', width: 100, render: (_, r) => r.returned ? `${r.returned} ₽` : '0 ₽' },
    { title: 'Итого', key: 'total', width: 100, render: (_, r) => {
      const total = (r.total_earned || 0) - (r.returned || 0);
      return `${total} ₽`;
    }},
    { title: 'Адрес', dataIndex: 'address', key: 'address' },
    { title: 'Примечание', key: 'notes', render: (_, r) => r.notes || '—' },
    {
      title: 'Действия', key: 'actions', width: 200,
      render: (_, r) => (
        <Space>
          <VlozheniaButton onClick={() => { setSelectedClientId(r.id); setClientCardOpen(true); }} />
          <Button size="small" onClick={() => openEdit(r)}>Редактировать</Button>
        </Space>
      ),
    },
  ];

  if (subPage === 'clients:search') {
    return <ClientSearchPage />;
  }

  return (
    <Card
      title="👥 Клиенты"
      extra={
        <Space>
          <Input
            placeholder="Поиск по имени или телефону"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 250 }}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchClients}>Обновить</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Добавить</Button>
        </Space>
      }
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Select placeholder="Направление" allowClear style={{ width: 150 }} value={filterDepartment} onChange={handleDepartmentChange} options={departmentOptions} />
        <Select placeholder="Регион" allowClear style={{ width: 150 }} value={filterRegion} onChange={handleRegionChange} options={regionOptions} />
        <Select placeholder="Город" allowClear style={{ width: 150 }} value={filterCity} onChange={handleCityChange} options={cityOptions} />
        <Select placeholder="Филиал" allowClear style={{ width: 180 }} value={filterBranch} onChange={setFilterBranch} options={branchOptions} />
      </Space>

      <Table columns={columns} dataSource={clients} rowKey="id" loading={loading} size="small" />

      <Modal title="Новый клиент" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="Имя" rules={[{ required: true, message: 'Введите имя' }]}>
            <Input placeholder="Иван Иванов" />
          </Form.Item>
          <Form.Item name="phone" label="Телефон" rules={[{ required: true, message: 'Введите телефон' }]}>
            <Input placeholder="+79991234567" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="department_id" label="Направление" rules={[{ required: true, message: 'Выберите' }]} style={{ flex: 1 }}>
              <Select placeholder="Выберите" allowClear options={formDepartmentOptions} onChange={handleFormDepartmentChange} />
            </Form.Item>
            <Form.Item name="region_id" label="Регион" rules={[{ required: true, message: 'Выберите' }]} style={{ flex: 1 }}>
              <Select placeholder="Выберите" allowClear options={formRegionOptions} onChange={handleFormRegionChange} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="city_id" label="Город" rules={[{ required: true, message: 'Выберите' }]} style={{ flex: 1 }}>
              <Select placeholder="Выберите" allowClear options={formCityOptions} onChange={handleFormCityChange} />
            </Form.Item>
            <Form.Item name="branch_id" label="Филиал" rules={[{ required: true, message: 'Выберите' }]} style={{ flex: 1 }}>
              <Select placeholder="Выберите" allowClear options={formBranchOptions} />
            </Form.Item>
          </div>
          <Form.Item name="address" label="Адрес" rules={[{ required: true, message: 'Введите адрес' }]}>
            <Input placeholder="ул. Ленина, д. 5" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>Создать</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Редактировать клиента" open={editModalOpen} onCancel={() => setEditModalOpen(false)} footer={null}>
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="name" label="Имя" rules={[{ required: true, message: 'Введите имя' }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="Телефон" rules={[{ required: true, message: 'Введите телефон' }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="department_id" label="Направление" rules={[{ required: true, message: 'Выберите' }]} style={{ flex: 1 }}>
              <Select placeholder="Выберите" allowClear options={formDepartmentOptions} onChange={handleFormDepartmentChange} />
            </Form.Item>
            <Form.Item name="region_id" label="Регион" rules={[{ required: true, message: 'Выберите' }]} style={{ flex: 1 }}>
              <Select placeholder="Выберите" allowClear options={formRegionOptions} onChange={handleFormRegionChange} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="city_id" label="Город" rules={[{ required: true, message: 'Выберите' }]} style={{ flex: 1 }}>
              <Select placeholder="Выберите" allowClear options={formCityOptions} onChange={handleFormCityChange} />
            </Form.Item>
            <Form.Item name="branch_id" label="Филиал" rules={[{ required: true, message: 'Выберите' }]} style={{ flex: 1 }}>
              <Select placeholder="Выберите" allowClear options={formBranchOptions} />
            </Form.Item>
          </div>
          <Form.Item name="address" label="Адрес" rules={[{ required: true, message: 'Введите адрес' }]}>
            <Input />
          </Form.Item>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ flex: 1 }}>Комментарий</span>
            <span style={{ marginRight: 8 }}>ЧС</span>
            <Switch checked={editClient?.blacklisted} onChange={(v) => { setEditClient({ ...editClient, blacklisted: v }); editForm.setFieldsValue({ blacklisted: v }); }} />
          </div>
          <Form.Item name="notes" style={{ marginBottom: 8 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="blacklisted" hidden>
            <Input />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button danger onClick={() => {
              Modal.confirm({
                title: 'Удалить клиента?',
                content: `Вы уверены, что хотите удалить клиента «${editClient?.name}»?`,
                okText: 'Удалить',
                cancelText: 'Отмена',
                okType: 'danger',
                onOk: async () => {
                  try {
                    await api.delete(`/clients/${editClient.id}`);
                    message.success('Клиент удалён');
                    setEditModalOpen(false);
                    refreshAll();
                  } catch (e) {
                    if (e.response?.status === 409) {
                      message.error('Нельзя удалить клиента с заявками');
                    } else {
                      message.error('Ошибка удаления');
                    }
                  }
                }
              });
            }}>Удалить клиента</Button>
            <Button type="primary" htmlType="submit" block>Сохранить</Button>
          </div>
        </Form>
      </Modal>
      <ClientCardModal clientId={selectedClientId} open={clientCardOpen} onClose={() => setClientCardOpen(false)} />
    </Card>
  );
}

export default ClientsPage;