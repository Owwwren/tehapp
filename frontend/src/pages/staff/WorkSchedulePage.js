import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Select, Input, Checkbox, message, DatePicker } from 'antd';
import { ReloadOutlined, CopyOutlined, EditOutlined } from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';

function WorkSchedulePage() {
  const [users, setUsers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [weekStart, setWeekStart] = useState(dayjs().startOf('week'));
  const [editMode, setEditMode] = useState({});

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

  useEffect(() => {
    api.get('/departments/').then(r => setAllDepartments(r.data)).catch(() => {});
    api.get('/regions/').then(r => setAllRegions(r.data)).catch(() => {});
    api.get('/cities/').then(r => setAllCities(r.data)).catch(() => {});
    api.get('/branches/').then(r => setAllBranches(r.data)).catch(() => {});
  }, []);

const fetchData = async () => {
    setLoading(true);
    try {
      const scheduleParams = {
        date_from: weekStart.format('YYYY-MM-DD'),
        date_to: weekStart.add(6, 'day').format('YYYY-MM-DD'),
      };
      if (filterBranch) scheduleParams.branch_id = filterBranch;
      else if (filterCity) scheduleParams.city_id = filterCity;
      else if (filterRegion) scheduleParams.region_id = filterRegion;
      else if (filterDepartment) scheduleParams.department_id = filterDepartment;

      const [usersRes, schedulesRes] = await Promise.all([
        api.get('/users/', {
          params: {
            ...(filterBranch ? { branch_id: filterBranch } : {}),
            ...(filterCity ? { city_id: filterCity } : {}),
            ...(filterRegion ? { region_id: filterRegion } : {}),
            ...(filterDepartment ? { department_id: filterDepartment } : {}),
          }
        }),
        api.get('/work-schedules/', { params: scheduleParams })
      ]);
      setUsers(usersRes.data.filter(u => u.is_active));
      setSchedules(schedulesRes.data || []);
      setEditMode({});
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [weekStart, filterBranch, filterCity, filterRegion, filterDepartment]);

  const handleDepartmentChange = (v) => { setFilterDepartment(v); setFilterRegion(null); setFilterCity(null); setFilterBranch(null); };
  const handleRegionChange = (v) => { setFilterRegion(v); setFilterCity(null); setFilterBranch(null); };
  const handleCityChange = (v) => { setFilterCity(v); setFilterBranch(null); };

  const weekDays = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));

  const getSchedule = (userId, dateStr) => {
    return schedules.find(s => s.user_id === userId && s.date === dateStr) || {};
  };

  const startEdit = (userId, dateStr) => {
    const s = getSchedule(userId, dateStr);
    const key = `${userId}-${dateStr}`;
    setEditMode(prev => ({
      ...prev,
      [key]: {
        start_time: s.start_time || '',
        end_time: s.end_time || '',
        is_day_off: s.is_day_off || false,
        comment: s.comment || '',
      }
    }));
  };

  const updateField = (userId, dateStr, field, value) => {
    const key = `${userId}-${dateStr}`;
    setEditMode(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const saveUserDay = async (userId, dateStr) => {
    const key = `${userId}-${dateStr}`;
    const data = editMode[key] || {};
    try {
      await api.post('/work-schedules/', null, {
        params: {
          user_id: userId,
          date: dateStr,
          start_time: data.start_time || null,
          end_time: data.end_time || null,
          is_day_off: data.is_day_off || false,
          comment: data.comment || '',
        }
      });
      message.success('Сохранено');
      setEditMode(prev => { const next = { ...prev }; delete next[key]; return next; });
      fetchData();
    } catch (e) { message.error('Ошибка'); }
  };

  const cancelEdit = (userId, dateStr) => {
    const key = `${userId}-${dateStr}`;
    setEditMode(prev => { const next = { ...prev }; delete next[key]; return next; });
  };

  const copyFromPreviousWeek = async () => {
    try {
      await api.post('/work-schedules/copy-week', null, {
        params: {
          from_date: weekStart.subtract(1, 'week').format('YYYY-MM-DD'),
          to_date: weekStart.format('YYYY-MM-DD'),
        }
      });
      message.success('Скопировано с прошлой недели');
      fetchData();
    } catch (e) { message.error('Нет данных за прошлую неделю'); }
  };

  const columns = [
    { title: 'Сотрудник', dataIndex: 'last_name', key: 'name', width: 180, fixed: 'left',
      render: (_, r) => `${r.last_name} ${r.first_name}` },
    ...weekDays.map((day) => ({
      title: <div style={{ textAlign: 'center' }}>
        <div>{day.format('dd')}</div>
        <div style={{ fontSize: 11, color: '#888' }}>{day.format('DD.MM')}</div>
      </div>,
      key: day.format('YYYY-MM-DD'),
      width: 170,
      render: (_, user) => {
        const dateStr = day.format('YYYY-MM-DD');
        const s = getSchedule(user.id, dateStr);
        const key = `${user.id}-${dateStr}`;
        const editing = editMode[key];
        const isEditing = !!editing;

        // Режим редактирования
        if (isEditing) {
          if (editing.is_day_off) {
            return (
              <div style={{ textAlign: 'center' }}>
                <Checkbox checked onChange={() => updateField(user.id, dateStr, 'is_day_off', false)} />
                <span style={{ color: '#f5222d', marginLeft: 4 }}>Вых</span>
                <div style={{ marginTop: 4 }}>
                  <Button size="small" type="primary" onClick={() => saveUserDay(user.id, dateStr)}>💾</Button>
                  <Button size="small" onClick={() => cancelEdit(user.id, dateStr)} style={{ marginLeft: 4 }}>✖</Button>
                </div>
              </div>
            );
          }
          return (
            <div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <Input size="small" placeholder="С" style={{ width: 50 }} value={editing.start_time}
                  onChange={e => updateField(user.id, dateStr, 'start_time', e.target.value)} />
                <span>—</span>
                <Input size="small" placeholder="До" style={{ width: 50 }} value={editing.end_time}
                  onChange={e => updateField(user.id, dateStr, 'end_time', e.target.value)} />
                <Checkbox checked={false} onChange={() => updateField(user.id, dateStr, 'is_day_off', true)} />
              </div>
              <Input size="small" placeholder="Комм." value={editing.comment}
                onChange={e => updateField(user.id, dateStr, 'comment', e.target.value)}
                style={{ marginTop: 2 }} />
              <div style={{ marginTop: 4 }}>
                <Button size="small" type="primary" onClick={() => saveUserDay(user.id, dateStr)}>💾</Button>
                <Button size="small" onClick={() => cancelEdit(user.id, dateStr)} style={{ marginLeft: 4 }}>✖</Button>
              </div>
            </div>
          );
        }

        // Режим просмотра
        if (s.is_day_off) {
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', color: '#f5222d' }}>Выходной</div>
              {s.comment && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{s.comment}</div>}
              <Button size="small" type="link" icon={<EditOutlined />} onClick={() => startEdit(user.id, dateStr)} />
            </div>
          );
        }

        if (s.start_time || s.end_time) {
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: 14 }}>
                {s.start_time || '—'} — {s.end_time || '—'}
              </div>
              {s.comment && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{s.comment}</div>}
              <Button size="small" type="link" icon={<EditOutlined />} onClick={() => startEdit(user.id, dateStr)} />
            </div>
          );
        }

        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#bbb' }}>—</div>
            <Button size="small" type="link" icon={<EditOutlined />} onClick={() => startEdit(user.id, dateStr)} />
          </div>
        );
      },
    })),
  ];

  return (
    <Card title="📅 График работы" extra={
      <Space>
        <Button icon={<CopyOutlined />} onClick={copyFromPreviousWeek}>Копировать с прошлой недели</Button>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Обновить</Button>
      </Space>
    }>
      <Space style={{ marginBottom: 16 }} wrap>
        <DatePicker value={weekStart} onChange={(d) => setWeekStart(d.startOf('week'))} format="DD.MM.YYYY" picker="week" />
        <Select placeholder="Направление" allowClear style={{ width: 150 }} value={filterDepartment} onChange={handleDepartmentChange} options={departmentOptions} />
        <Select placeholder="Регион" allowClear style={{ width: 150 }} value={filterRegion} onChange={handleRegionChange} options={regionOptions} />
        <Select placeholder="Город" allowClear style={{ width: 150 }} value={filterCity} onChange={handleCityChange} options={cityOptions} />
        <Select placeholder="Филиал" allowClear style={{ width: 180 }} value={filterBranch} onChange={setFilterBranch} options={branchOptions} />
        <Button icon={<ReloadOutlined />} onClick={() => { setFilterDepartment(null); setFilterRegion(null); setFilterCity(null); setFilterBranch(null); }}>Сбросить</Button>
      </Space>

      <Table columns={columns} dataSource={users} rowKey="id" loading={loading} size="small" scroll={{ x: 1300 }} pagination={false} />
    </Card>
  );
}

export default WorkSchedulePage;