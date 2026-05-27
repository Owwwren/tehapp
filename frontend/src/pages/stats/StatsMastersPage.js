import React, { useState, useEffect } from 'react';
import { Card, DatePicker, Button, Table, Row, Col, Select, Modal, Space } from 'antd';
import { ReloadOutlined, BarChartOutlined, UnorderedListOutlined, SwapOutlined } from '@ant-design/icons';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../services/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const COMPARE_COLORS = ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

function MasterChartsModal({ open, onClose, title, data, allData }) {
  if (!data) return null;

  const byDayArr = Object.entries(data.by_day || {}).sort(([a], [b]) => a.localeCompare(b)).map(([day, vals]) => ({
    day: day.slice(5),
    completed: vals.completed || 0,
    cancelled: vals.cancelled || 0,
    warranty: vals.warranty || 0,
    zero: vals.zero || 0,
    total: vals.total || 0,
  }));

  const salaryByWeekArr = Object.entries(data.salary_by_week || {}).sort(([a], [b]) => a.localeCompare(b)).map(([week, amount]) => ({
    week: week.slice(5),
    amount,
  }));

  const moneyPct = data.total ? Math.round(data.completed / data.total * 1000) / 10 : 0;

  let efficiencyData;
  if (allData) {
    efficiencyData = allData
      .filter(d => d.master_id !== 'summary' && d.total > 0)
      .map(d => ({
        name: d.master_name,
        efficiency: d.total ? Math.round((d.completed + d.sd - d.fake) / d.total * 1000) / 10 : 0,
      }));
  } else {
    efficiencyData = [{
      name: title.replace('📊 ', ''),
      efficiency: data.total ? Math.round((data.completed + data.sd - data.fake) / data.total * 1000) / 10 : 0,
    }];
  }

  return (
    <Modal title={title} open={open} onCancel={onClose} footer={null} width={900}>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card size="small" title="📉 Средний чек по дням">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={byDayArr}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}т`} /><ReTooltip /><Line type="monotone" dataKey="total" stroke="#1677ff" strokeWidth={2} dot={{ r: 3 }} name="Заявок" /></LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="💵 ЗП по неделям (3 мес)">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={salaryByWeekArr}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="week" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}т`} /><ReTooltip formatter={(v) => `${v?.toLocaleString()} ₽`} /><Line type="monotone" dataKey="amount" stroke="#722ed1" strokeWidth={2} dot={{ r: 4 }} name="ЗП" /></LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card size="small" title="📊 Заказы по дням">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={byDayArr}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><ReTooltip /><Legend /><Line type="monotone" dataKey="completed" stroke="#52c41a" strokeWidth={2} dot={{ r: 3 }} name="Выполнено" /><Line type="monotone" dataKey="cancelled" stroke="#f5222d" strokeWidth={2} dot={{ r: 3 }} name="Отмены" /><Line type="monotone" dataKey="warranty" stroke="#faad14" strokeWidth={2} dot={{ r: 3 }} name="Гарантии" /><Line type="monotone" dataKey="zero" stroke="#fa8c16" strokeWidth={2} dot={{ r: 3 }} name="Нули" /></LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="📊 Процент в деньги">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart><Pie data={[{ name: 'В деньги', value: moneyPct }, { name: 'Остальное', value: 100 - moneyPct }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={({ payload }) => payload.name === 'В деньги' ? `${moneyPct}%` : ''}><Cell fill="#52c41a" /><Cell fill="#f5222d" /></Pie><ReTooltip formatter={(v) => `${v}%`} /></PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card size="small" title="📈 Эффективность">
            <ResponsiveContainer width="100%" height={allData ? 100 + efficiencyData.length * 30 : 180}>
              <LineChart data={efficiencyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} /><YAxis domain={[0, 100]} /><ReTooltip formatter={(v) => `${v}%`} /><Line type="monotone" dataKey="efficiency" stroke="#1677ff" strokeWidth={2} dot={{ r: 5 }} name="Эффективность" /></LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </Modal>
  );
}

function CompareMastersModal({ open, onClose, masters }) {
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => { if (!open) setSelectedIds([]); }, [open]);

  const selectedMasters = selectedIds.length > 0
    ? masters.filter(m => selectedIds.includes(m.master_id))
    : masters.filter(m => m.master_id !== 'summary');

  const allDays = new Set(); const allWeeks = new Set();
  selectedMasters.forEach(m => { Object.keys(m.by_day || {}).forEach(d => allDays.add(d)); Object.keys(m.salary_by_week || {}).forEach(w => allWeeks.add(w)); });
  const sortedDays = [...allDays].sort().map(d => d.slice(5)); const sortedWeeks = [...allWeeks].sort().map(w => w.slice(5));

  const avgCheckByDayData = sortedDays.map(day => { const point = { day }; selectedMasters.forEach(m => { const found = Object.entries(m.by_day || {}).find(([d]) => d.slice(5) === day); point[m.master_name] = found ? Math.round((m.cassa || 0) / (m.total || 1)) : 0; }); return point; });
  const totalByDayData = sortedDays.map(day => { const point = { day }; selectedMasters.forEach(m => { const found = Object.entries(m.by_day || {}).find(([d]) => d.slice(5) === day); point[m.master_name] = found ? found[1].total || 0 : 0; }); return point; });
  const salaryByWeekData = sortedWeeks.map(week => { const point = { week }; selectedMasters.forEach(m => { const found = Object.entries(m.salary_by_week || {}).find(([w]) => w.slice(5) === week); point[m.master_name] = found ? found[1] : 0; }); return point; });
  const ordersBreakdownData = sortedDays.map(day => { const point = { day }; let completed = 0, cancelled = 0, warranty = 0, zero = 0; selectedMasters.forEach(m => { const found = Object.entries(m.by_day || {}).find(([d]) => d.slice(5) === day); if (found) { completed += found[1].completed || 0; cancelled += found[1].cancelled || 0; warranty += found[1].warranty || 0; zero += found[1].zero || 0; } }); return { day, completed, cancelled, warranty, zero }; });
  const efficiencyData = selectedMasters.map(m => ({ name: m.master_name, efficiency: m.total ? Math.round((m.completed + m.sd - m.fake) / m.total * 1000) / 10 : 0 }));
  const moneyPctData = selectedMasters.map(m => ({ name: m.master_name, pct: m.total ? Math.round(m.completed / m.total * 1000) / 10 : 0 }));

  return (
    <Modal title="🔄 Сравнение мастеров" open={open} onCancel={onClose} footer={null} width={1000}>
      <div style={{ marginBottom: 16 }}>
        <p>Выберите мастеров (если не выбраны — все):</p>
        <Select mode="multiple" value={selectedIds} onChange={setSelectedIds} placeholder="Все мастера" style={{ width: '100%' }}
          options={masters.filter(m => m.master_id !== 'summary').map(m => ({ value: m.master_id, label: m.master_name }))} />
      </div>
      {selectedMasters.length > 0 && (<>
        <Row gutter={[16, 16]}><Col span={12}><Card size="small" title="💰 Средний чек по дням"><ResponsiveContainer width="100%" height={250}><LineChart data={avgCheckByDayData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}т`} /><ReTooltip /><Legend />{selectedMasters.map((m, i) => <Line key={m.master_id} type="monotone" dataKey={m.master_name} stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />)}</LineChart></ResponsiveContainer></Card></Col><Col span={12}><Card size="small" title="📉 Заявки по дням"><ResponsiveContainer width="100%" height={250}><LineChart data={totalByDayData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><ReTooltip /><Legend />{selectedMasters.map((m, i) => <Line key={m.master_id} type="monotone" dataKey={m.master_name} stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />)}</LineChart></ResponsiveContainer></Card></Col></Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}><Col span={12}><Card size="small" title="💵 ЗП по неделям"><ResponsiveContainer width="100%" height={250}><LineChart data={salaryByWeekData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="week" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}т`} /><ReTooltip formatter={(v) => `${v?.toLocaleString()} ₽`} /><Legend />{selectedMasters.map((m, i) => <Line key={m.master_id} type="monotone" dataKey={m.master_name} stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />)}</LineChart></ResponsiveContainer></Card></Col><Col span={12}><Card size="small" title="📊 Заказы по дням (разбивка)"><ResponsiveContainer width="100%" height={250}><LineChart data={ordersBreakdownData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><ReTooltip /><Legend /><Line type="monotone" dataKey="completed" stroke="#52c41a" strokeWidth={2} dot={{ r: 3 }} name="Выполнено" /><Line type="monotone" dataKey="cancelled" stroke="#f5222d" strokeWidth={2} dot={{ r: 3 }} name="Отмены" /><Line type="monotone" dataKey="warranty" stroke="#faad14" strokeWidth={2} dot={{ r: 3 }} name="Гарантии" /><Line type="monotone" dataKey="zero" stroke="#fa8c16" strokeWidth={2} dot={{ r: 3 }} name="Нули" /></LineChart></ResponsiveContainer></Card></Col></Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}><Col span={12}><Card size="small" title="📊 Процент в деньги"><ResponsiveContainer width="100%" height={250}><LineChart data={moneyPctData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} /><YAxis domain={[0, 100]} /><ReTooltip formatter={(v) => `${v}%`} /><Line type="monotone" dataKey="pct" stroke="#52c41a" strokeWidth={2} dot={{ r: 5, fill: '#52c41a' }} name="В деньги %" /></LineChart></ResponsiveContainer></Card></Col><Col span={12}><Card size="small" title="📈 Эффективность"><ResponsiveContainer width="100%" height={250}><LineChart data={efficiencyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} /><YAxis domain={[0, 100]} /><ReTooltip formatter={(v) => `${v}%`} /><Line type="monotone" dataKey="efficiency" stroke="#1677ff" strokeWidth={2} dot={{ r: 5 }} name="Эффективность" /></LineChart></ResponsiveContainer></Card></Col></Row>
      </>)}
    </Modal>
  );
}

function StatsMastersPage() {
  const [dateRange, setDateRange] = useState([dayjs().startOf('week'), dayjs().endOf('week')]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [branchId, setBranchId] = useState(null);
  const [showSummary, setShowSummary] = useState(true);
  const [chartsOpen, setChartsOpen] = useState(false);
  const [chartsTitle, setChartsTitle] = useState('');
  const [chartsData, setChartsData] = useState(null);
  const [chartsMode, setChartsMode] = useState('all');
  const [compareOpen, setCompareOpen] = useState(false);

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
      const params = {};
      if (dateRange?.[0]) params.date_from = dateRange[0].format('YYYY-MM-DD');
      if (dateRange?.[1]) params.date_to = dateRange[1].format('YYYY-MM-DD');
      if (filterBranch) params.branch_id = filterBranch;
      else if (filterCity) params.city_id = filterCity;
      else if (filterRegion) params.region_id = filterRegion;
      else if (filterDepartment) params.department_id = filterDepartment;
      const res = await api.get('/statistics/masters', { params });
      setData(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [dateRange, filterBranch, filterCity, filterRegion, filterDepartment]);

  const handleDepartmentChange = (v) => { setFilterDepartment(v); setFilterRegion(null); setFilterCity(null); setFilterBranch(null); };
  const handleRegionChange = (v) => { setFilterRegion(v); setFilterCity(null); setFilterBranch(null); };
  const handleCityChange = (v) => { setFilterCity(v); setFilterBranch(null); };

  const openMasterCharts = (masterId, masterName) => {
    const master = data.find(d => d.master_id === masterId);
    if (master) { setChartsMode('master'); setChartsTitle(`📊 ${masterName}`); setChartsData(master); setChartsOpen(true); }
  };

  const openAllCharts = () => {
    const summary = buildSummary(); setChartsMode('all'); setChartsTitle('📊 Общая статистика — все мастера'); setChartsData(summary); setChartsOpen(true);
  };

  const buildSummary = () => {
    const summary = { by_day: {}, salary_by_week: {} };
    data.forEach(m => {
      Object.entries(m.by_day || {}).forEach(([day, vals]) => { if (!summary.by_day[day]) summary.by_day[day] = { total: 0, completed: 0, cancelled: 0, warranty: 0, zero: 0 }; summary.by_day[day].total += vals.total || 0; summary.by_day[day].completed += vals.completed || 0; summary.by_day[day].cancelled += vals.cancelled || 0; summary.by_day[day].warranty += vals.warranty || 0; summary.by_day[day].zero += vals.zero || 0; });
      Object.entries(m.salary_by_week || {}).forEach(([week, amount]) => { summary.salary_by_week[week] = (summary.salary_by_week[week] || 0) + amount; });
    });
    summary.total = data.reduce((s, m) => s + m.total, 0); summary.completed = data.reduce((s, m) => s + m.completed, 0);
    summary.sd = data.reduce((s, m) => s + m.sd, 0); summary.fake = data.reduce((s, m) => s + m.fake, 0);
    return summary;
  };

  const totals = data.reduce((acc, r) => {
    acc.total += r.total; acc.completed += r.completed; acc.cancelled += r.cancelled;
    acc.fake += r.fake; acc.warranty += r.warranty; acc.zero += r.zero; acc.sd += r.sd;
    acc.no_show += (r.no_show || 0);
    acc.not_paid_count += r.not_paid_count; acc.not_paid_sum += r.not_paid_sum;
    acc.up_to_1k += r.up_to_1k; acc.up_to_2_5k += r.up_to_2_5k; acc.up_to_10k += r.up_to_10k;
    acc.cassa += r.cassa; acc.parts += r.parts; acc.net += r.net; acc.salary += r.salary;
    if (r.max_check) acc.max_check = Math.max(acc.max_check, r.max_check);
    acc.all_prices.push(...(r.avg_check ? [r.avg_check] : []));
    return acc;
  }, { total: 0, completed: 0, cancelled: 0, fake: 0, warranty: 0, zero: 0, sd: 0, no_show: 0, not_paid_count: 0, not_paid_sum: 0, up_to_1k: 0, up_to_2_5k: 0, up_to_10k: 0, cassa: 0, parts: 0, net: 0, salary: 0, max_check: 0, all_prices: [] });

  const bold = (v) => <strong>{v}</strong>;
  const pct = (v, t) => t ? `${v} (${Math.round(v / t * 100)}%)` : `${v} (0%)`;

  const summaryRow = {
    master_id: 'summary', master_name: 'Итого', ...totals, technics: '',
    cancelled_pct: totals.total ? Math.round(totals.cancelled / totals.total * 1000) / 10 : 0,
    fake_pct: totals.total ? Math.round(totals.fake / totals.total * 1000) / 10 : 0,
    warranty_pct: totals.total ? Math.round(totals.warranty / totals.total * 1000) / 10 : 0,
    zero_pct: totals.total ? Math.round(totals.zero / totals.total * 1000) / 10 : 0,
    no_show_pct: totals.total ? Math.round(totals.no_show / totals.total * 1000) / 10 : 0,
    avg_check: totals.all_prices.length ? Math.round(totals.all_prices.reduce((a,b)=>a+b,0) / totals.all_prices.length) : 0,
    parts_pct: totals.cassa ? Math.round(totals.parts / totals.cassa * 1000) / 10 : 0,
  };

  const fullData = showSummary ? [...data, summaryRow] : data;

  const columns = [
      { title: 'ФИО', dataIndex: 'master_name', width: 130, render: (v, r) => r.master_id === 'summary' ? bold(v) : <Space size={4}>{v}<Button size="small" type="link" icon={<BarChartOutlined />} onClick={() => openMasterCharts(r.master_id, v)} /></Space> },
      { title: 'Категория', dataIndex: 'technics', width: 140, render: (v) => <span style={{ fontSize: 11 }}>{v || '—'}</span> },
      { title: 'Ср.чек', dataIndex: 'avg_check', width: 70, render: (v) => <span style={{ fontSize: 11 }}>{v?.toLocaleString()} ₽</span> },
      { title: 'Касса', dataIndex: 'cassa', width: 75, render: (v) => <span style={{ fontSize: 11 }}>{v?.toLocaleString()} ₽</span> },
      { title: 'ЗП', dataIndex: 'salary', width: 75, render: (v) => <span style={{ fontSize: 11 }}>{v?.toLocaleString()} ₽</span> },
      { title: 'Заказы', dataIndex: 'total', width: 55, render: (v, r) => r.master_id === 'summary' ? bold(v) : <span style={{ fontSize: 11 }}>{v}</span> },
      { title: 'Отмены', dataIndex: 'cancelled', width: 80, render: (v, r) => <span style={{ fontSize: 11 }}>{pct(v, r.total)}</span> },
      { title: 'Не заказы', dataIndex: 'fake', width: 85, render: (v, r) => <span style={{ fontSize: 11 }}>{pct(v, r.total)}</span> },
      { title: 'Гарантии', dataIndex: 'warranty', width: 85, render: (v, r) => <span style={{ fontSize: 11 }}>{pct(v, r.total)}</span> },
      { title: 'Вып', dataIndex: 'completed', width: 55, render: (v, r) => r.master_id === 'summary' ? bold(v) : <span style={{ fontSize: 11 }}>{v}</span> },
      { title: 'Ноль', dataIndex: 'zero', width: 70, render: (v, r) => <span style={{ fontSize: 11 }}>{pct(v, r.total)}</span> },
      { title: 'Недоезд', dataIndex: 'no_show_pct', width: 75, render: (v, r) => r.master_id === 'summary' ? bold(`${v}%`) : <span style={{ fontSize: 11 }}>{v}%</span> },
      { title: 'Макс', dataIndex: 'max_check', width: 70, render: (v) => <span style={{ fontSize: 11 }}>{v?.toLocaleString()} ₽</span> },
      { title: 'ЗПЧ %', dataIndex: 'parts_pct', width: 65, render: (v) => <span style={{ fontSize: 11 }}>{v}%</span> },
      { title: 'Не сдал', dataIndex: 'not_paid_count', width: 65, render: (v, r) => r.master_id === 'summary' ? bold(v) : <span style={{ fontSize: 11 }}>{v}</span> },
      { title: 'Сумма', dataIndex: 'not_paid_sum', width: 75, render: (v) => <span style={{ fontSize: 11 }}>{v?.toLocaleString()} ₽</span> },
      { title: 'СД', dataIndex: 'sd', width: 40, render: (v, r) => r.master_id === 'summary' ? bold(v) : <span style={{ fontSize: 11 }}>{v}</span> },
      { title: '≤1к', dataIndex: 'up_to_1k', width: 45, render: (v, r) => r.master_id === 'summary' ? bold(v) : <span style={{ fontSize: 11 }}>{v}</span> },
      { title: '≤2.5к', dataIndex: 'up_to_2_5k', width: 50, render: (v, r) => r.master_id === 'summary' ? bold(v) : <span style={{ fontSize: 11 }}>{v}</span> },
      { title: '≤10к', dataIndex: 'up_to_10k', width: 50, render: (v, r) => r.master_id === 'summary' ? bold(v) : <span style={{ fontSize: 11 }}>{v}</span> },
    ];

  return (
    <Card title="📊 Статистика — Мастера" extra={<Space><Button icon={<BarChartOutlined />} onClick={openAllCharts}>Графики</Button><Button icon={<SwapOutlined />} onClick={() => setCompareOpen(true)}>Сравнение</Button><Button icon={showSummary ? <UnorderedListOutlined /> : <BarChartOutlined />} onClick={() => setShowSummary(!showSummary)}>{showSummary ? 'Скрыть итог' : 'Общая статистика'}</Button><Button icon={<ReloadOutlined />} onClick={fetchData}>Обновить</Button></Space>}>
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }} wrap>
        <Col><div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Период</div><RangePicker value={dateRange} onChange={setDateRange} format="DD.MM.YYYY" /></Col>
        <Col><div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Направление</div><Select placeholder="Все" allowClear style={{ width: 150 }} value={filterDepartment} onChange={handleDepartmentChange} options={departmentOptions} /></Col>
        <Col><div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Регион</div><Select placeholder="Все" allowClear style={{ width: 150 }} value={filterRegion} onChange={handleRegionChange} options={regionOptions} /></Col>
        <Col><div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Город</div><Select placeholder="Все" allowClear style={{ width: 150 }} value={filterCity} onChange={handleCityChange} options={cityOptions} /></Col>
        <Col><div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Филиал</div><Select placeholder="Все" allowClear style={{ width: 180 }} value={filterBranch} onChange={setFilterBranch} options={branchOptions} /></Col>
      </Row>

      <Table dataSource={fullData} rowKey="master_id" columns={columns} loading={loading} size="small" scroll={{ x: 1800 }} pagination={false} rowClassName={(r) => r.master_id === 'summary' ? 'summary-row' : ''} />

      <MasterChartsModal open={chartsOpen} onClose={() => setChartsOpen(false)} title={chartsTitle} data={chartsData} allData={chartsMode === 'all' ? fullData : null} />
      <CompareMastersModal open={compareOpen} onClose={() => setCompareOpen(false)} masters={data} />
    </Card>
  );
}

export default StatsMastersPage;