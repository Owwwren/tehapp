import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Button, Space, Modal, Form, Input, Select, message, DatePicker } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';
import PhotoUploader from '../../components/PhotoUploader';

const roleColors = {
  admin: 'red', master: 'blue', operator: 'green', logist: 'orange',
};

function StaffArchivePage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [technics, setTechnics] = useState([]);
  const [userPhotos, setUserPhotos] = useState([]);
  const [localFiles, setLocalFiles] = useState([]);
  const [searchFIO, setSearchFIO] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [filterRole, setFilterRole] = useState(null);

  const [allDepartments, setAllDepartments] = useState([]);
  const [allRegions, setAllRegions] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
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
    api.get('/roles/').then(r => setAllRoles(r.data)).catch(() => {});
    api.get('/technics/').then(r => setTechnics(r.data)).catch(() => {});
  }, []);

  const fetchUserPhotos = async (userId) => {
    try { const res = await api.get(`/users/${userId}/photos`); setUserPhotos(res.data); } catch (e) {}
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterBranch) params.branch_id = filterBranch;
      if (filterCity) params.city_id = filterCity;
      if (filterRegion) params.region_id = filterRegion;
      if (filterDepartment) params.department_id = filterDepartment;
      const response = await api.get('/users/', { params });
      let data = response.data.filter(u => !u.is_active);
      if (searchFIO) {
        const s = searchFIO.toLowerCase();
        data = data.filter(u => (u.last_name || '').toLowerCase().includes(s) || (u.first_name || '').toLowerCase().includes(s) || (u.middle_name || '').toLowerCase().includes(s));
      }
      if (searchPhone) data = data.filter(u => (u.phone || '').includes(searchPhone));
      if (filterRole) data = data.filter(u => u.role?.id === filterRole);
      setUsers(data);
    } catch (e) {} finally { setLoading(false); }
  };

  const refreshAll = () => { fetchUsers(); };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(() => fetchUsers(), 5000);
    return () => clearInterval(interval);
  }, [searchFIO, searchPhone, filterRole, filterBranch, filterCity, filterRegion, filterDepartment]);

  const handleEdit = async (user) => {
    setEditingUser(user);
    setLocalFiles([]);
    const fields = {
      last_name: user.last_name, first_name: user.first_name, middle_name: user.middle_name,
      phone: user.phone, role_id: user.role?.id, username: user.username,
      birth_date: user.birth_date ? dayjs(user.birth_date) : null,
      telegram_nick: user.telegram_nick, address: user.address, passport: user.passport,
      note: user.note, salary: user.salary,
      salary_type: user.commission_percent ? 'pct' : 'rub', commission_percent: user.commission_percent,
      cooperation_note: user.cooperation_note,
      branch_ids: user.branches?.map(b => b.id) || [],
      department_id: null, region_id: null, city_id: null,
    };
    if (user.role?.code === 'master') {
      try { const res = await api.get(`/users/${user.id}/technics`); fields.technic_ids = res.data; } catch (e) {}
    }
    form.setFieldsValue(fields);
    setFormRegions(allRegions);
    setFormCities(allCities);
    setFormBranches(allBranches);
    setModalOpen(true);
    fetchUserPhotos(user.id);
  };

  const handleRestore = async (record) => {
    await api.put(`/users/${record.id}`, null, { params: { is_active: true } });
    message.success('Сотрудник восстановлен');
    refreshAll();
  };

  const handleSubmit = async (values) => {
    try {
      const { technic_ids, salary_type, salary, commission_percent, department_id, region_id, city_id, branch_ids, ...userData } = values;
      if (userData.birth_date) userData.birth_date = typeof userData.birth_date === 'string' ? userData.birth_date : userData.birth_date.format('YYYY-MM-DD');
      if (salary_type === 'rub') { userData.salary = salary; userData.commission_percent = null; }
      else { userData.commission_percent = commission_percent; userData.salary = null; }
      if (branch_ids && branch_ids.length > 0) {
        userData.branch_ids = branch_ids.join(',');
      } else {
        userData.branch_ids = '';
      }
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, null, { params: userData });
        if (technic_ids && userData.role_id === 10) await api.post(`/users/${editingUser.id}/technics`, { technic_ids });
        if (localFiles.length > 0) {
          for (const lf of localFiles) { const fd = new FormData(); fd.append('file', lf.file); await api.post(`/users/${editingUser.id}/photos?photo_type=${lf.type}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); }
          setLocalFiles([]);
        }
      }
      message.success('Сотрудник обновлён');
      form.resetFields(); setEditingUser(null); setUserPhotos([]); setModalOpen(false); refreshAll();
    } catch (e) { message.error('Ошибка'); }
  };

  const handleDepartmentChange = (v) => { setFilterDepartment(v); setFilterRegion(null); setFilterCity(null); setFilterBranch(null); };
  const handleRegionChange = (v) => { setFilterRegion(v); setFilterCity(null); setFilterBranch(null); };
  const handleCityChange = (v) => { setFilterCity(v); setFilterBranch(null); };

  const handleFormDepartmentChange = (v) => {
    form.setFieldsValue({ region_id: null, city_id: null });
    if (v) api.get('/regions/', { params: { department_id: v } }).then(r => setFormRegions(r.data));
    else setFormRegions(allRegions);
    setFormCities([]);
  };

  const handleFormRegionChange = (v) => {
    form.setFieldsValue({ city_id: null });
    if (v) api.get('/cities/', { params: { region_id: v } }).then(r => setFormCities(r.data));
    else setFormCities(allCities);
  };

  const columns = [
    { title: '№', dataIndex: 'id', key: 'id', width: 60 },
    { title: 'Фамилия', dataIndex: 'last_name', key: 'last_name' },
    { title: 'Имя', dataIndex: 'first_name', key: 'first_name' },
    { title: 'Телефон', dataIndex: 'phone', key: 'phone' },
    { title: 'Роль', key: 'role', render: (_, r) => r.role ? <Tag color={roleColors[r.role.code] || 'default'}>{r.role.name}</Tag> : '—' },
    { title: 'Активен', dataIndex: 'is_active', key: 'is_active', render: (v) => v ? <Tag color="green">Да</Tag> : <Tag color="red">Нет</Tag> },
    {
      title: 'Действия', key: 'actions', width: 180,
      render: (_, record) => (
        <Space>
          <Button size="small" type="link" onClick={() => handleEdit(record)}>Ред</Button>
          <Button size="small" type="link" onClick={() => handleRestore(record)}>Восстановить</Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="📦 Архив сотрудников"
      extra={<Button icon={<ReloadOutlined />} onClick={fetchUsers}>Обновить</Button>}
    >
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Input placeholder="🔍 ФИО" value={searchFIO} onChange={(e) => setSearchFIO(e.target.value)} style={{ width: 180 }} allowClear />
        <Input placeholder="📞 Телефон" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} style={{ width: 160 }} allowClear />
        <Select placeholder="👤 Роль" value={filterRole} onChange={setFilterRole} allowClear style={{ width: 180 }} options={allRoles.map(r => ({ value: r.id, label: r.name }))} />
        <Select placeholder="Направление" allowClear style={{ width: 150 }} value={filterDepartment} onChange={handleDepartmentChange} options={departmentOptions} />
        <Select placeholder="Регион" allowClear style={{ width: 150 }} value={filterRegion} onChange={handleRegionChange} options={regionOptions} />
        <Select placeholder="Город" allowClear style={{ width: 150 }} value={filterCity} onChange={handleCityChange} options={cityOptions} />
        <Select placeholder="Филиал" allowClear style={{ width: 180 }} value={filterBranch} onChange={setFilterBranch} options={branchOptions} />
        <Button icon={<ReloadOutlined />} onClick={() => { setSearchFIO(''); setSearchPhone(''); setFilterRole(null); setFilterDepartment(null); setFilterRegion(null); setFilterCity(null); setFilterBranch(null); }}>Сбросить</Button>
      </div>
      <Table columns={columns} dataSource={users} rowKey="id" loading={loading} size="small" />

      <Modal title="Редактировать сотрудника" open={modalOpen} onCancel={() => { setModalOpen(false); setEditingUser(null); form.resetFields(); }} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="last_name" label="Фамилия" rules={[{ required: true }]} style={{ flex: 1 }}><Input placeholder="Иванов" /></Form.Item>
            <Form.Item name="first_name" label="Имя" rules={[{ required: true }]} style={{ flex: 1 }}><Input placeholder="Иван" /></Form.Item>
            <Form.Item name="middle_name" label="Отчество" style={{ flex: 1 }}><Input placeholder="Иванович" /></Form.Item>
          </div>
          <Form.Item name="address" label="Место жительства"><Input placeholder="г. Москва, ул. Ленина, д. 5" /></Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="phone" label="Телефон" rules={[{ required: true }]} style={{ flex: 1 }}><Input placeholder="+79991234567" /></Form.Item>
            <Form.Item name="birth_date" label="Дата рождения" style={{ flex: 1 }}><DatePicker placeholder="ДД.ММ.ГГГГ" format="DD.MM.YYYY" style={{ width: '100%' }} /></Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="username" label="Логин" rules={[{ required: true }]} style={{ flex: 1 }}><Input placeholder="ivanov" /></Form.Item>
            <Form.Item name="password" label="Пароль" style={{ flex: 1 }}><Input.Password placeholder="Новый пароль (не обязательно)" /></Form.Item>
          </div>
          <Form.Item name="telegram_nick" label="Ник телеграм"><Input placeholder="@nickname" /></Form.Item>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="department_id" label="Направление" rules={[{ required: true, message: 'Выберите направление' }]} style={{ flex: 1 }}>
              <Select placeholder="Выберите направление" allowClear options={formDepartmentOptions} onChange={handleFormDepartmentChange} />
            </Form.Item>
            <Form.Item name="region_id" label="Регион" rules={[{ required: true, message: 'Выберите регион' }]} style={{ flex: 1 }}>
              <Select placeholder="Выберите регион" allowClear options={formRegionOptions} onChange={handleFormRegionChange} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="city_id" label="Город" rules={[{ required: true, message: 'Выберите город' }]} style={{ flex: 1 }}>
              <Select placeholder="Выберите город" allowClear options={formCityOptions}
                onChange={(v) => { form.setFieldsValue({ city_id: v }); if (v) api.get('/branches/', { params: { city_id: v } }).then(r => setFormBranches(r.data)); else setFormBranches(allBranches); }} />
            </Form.Item>
          </div>
          <Form.Item name="branch_ids" label="Филиалы" rules={[{ required: true, message: 'Выберите хотя бы один филиал' }]}>
            <Select mode="multiple" placeholder="Выберите филиалы" allowClear options={formBranchOptions} />
          </Form.Item>

          <Form.Item name="role_id" label="Должность" rules={[{ required: true, message: 'Выберите должность' }]}>
            <Select placeholder="Выберите роль" options={allRoles.map(r => ({ value: r.id, label: r.name }))} />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.role_id !== cur.role_id}>
            {({ getFieldValue }) => getFieldValue('role_id') === allRoles.find(r => r.code === 'master')?.id ? (
              <Form.Item name="technic_ids" label="Типы техники" rules={[{ required: true, message: 'Выберите хотя бы один тип' }]}>
                <Select mode="multiple" placeholder="Выберите типы" options={technics.map(t => ({ value: t.id, label: t.name }))} />
              </Form.Item>
            ) : null}
          </Form.Item>
          <Form.Item name="note" label="Примечание"><Input.TextArea rows={2} /></Form.Item>
          {editingUser ? (
            <div style={{ marginBottom: 16 }}><PhotoUploader entityType="user" entityId={editingUser.id} photos={userPhotos} onPhotosChange={setUserPhotos} localFiles={localFiles} onLocalFilesChange={setLocalFiles} instantUpload={false} /></div>
          ) : null}
          <Form.Item><Button type="primary" htmlType="submit" block>Сохранить</Button></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default StaffArchivePage;