import React, { useState, useEffect } from 'react';
import { Card, DatePicker, Button, Table, Row, Col, Select, Tooltip as AntTooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];
const TECH_NAMES = { 1: 'Холодильники', 2: 'Стиральные', 3: 'Варочные', 4: 'Духовые', 5: 'Посудомоечные' };

function StatsCitiesPage() {
  const [dateRange, setDateRange] = useState([dayjs().startOf('week'), dayjs().endOf('week')]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCities, setSelectedCities] = useState([]);

  const [allDepartments, setAllDepartments] = useState([]);
  const [allRegions, setAllRegions] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [filterDepartment, setFilterDepartment] = useState(null);
  const [filterRegion, setFilterRegion] = useState(null);
  const [filterCity, setFilterCity] = useState(null);

  const departmentOptions = allDepartments.map(d => ({ value: d.id, label: d.name }));
  const regionOptions = allRegions.filter(r => !filterDepartment || r.departments?.some(d => d.id === filterDepartment)).map(r => ({ value: r.id, label: r.name }));
  const cityOptions = allCities.filter(c => !filterRegion || c.region_id === filterRegion).map(c => ({ value: c.id, label: c.name }));

  useEffect(() => {
    api.get('/departments/').then(r => setAllDepartments(r.data)).catch(() => {});
    api.get('/regions/').then(r => setAllRegions(r.data)).catch(() => {});
    api.get('/cities/').then(r => setAllCities(r.data)).catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange?.[0]) params.date_from = dateRange[0].format('YYYY-MM-DD');
      if (dateRange?.[1]) params.date_to = dateRange[1].format('YYYY-MM-DD');
      if (filterCity) params.city_id = filterCity;
      else if (filterRegion) params.region_id = filterRegion;
      else if (filterDepartment) params.department_id = filterDepartment;
      const res = await api.get('/statistics/cities', { params });
      setData(res.data || []);
    } catch (e) { console.error('Ошибка загрузки статистики:', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [dateRange, filterCity, filterRegion, filterDepartment]);

  const handleDepartmentChange = (v) => { setFilterDepartment(v); setFilterRegion(null); setFilterCity(null); };
  const handleRegionChange = (v) => { setFilterRegion(v); setFilterCity(null); };

  const displayData = selectedCities.length > 0
    ? data.filter(r => selectedCities.includes(r.city_id))
    : data;

  const totals = displayData.reduce((acc, r) => {
    acc.total += r.total; acc.completed += r.completed; acc.cancelled_cc += r.cancelled_cc;
    acc.cancelled_bt += r.cancelled_bt; acc.fake += r.fake; acc.rejected += r.rejected; 
    acc.no_show += (r.no_show || 0); acc.sd += r.sd;
    acc.cancelled += r.cancelled; acc.cassa += r.cassa; acc.fact_cassa += r.fact_cassa;
    acc.prepaid += r.prepaid; acc.parts += r.parts; acc.remainder += r.remainder; acc.net += r.net; acc.zero_count += r.zero_count;
    acc.completed_cassa += r.completed_cassa || 0;
    return acc;
  }, { total: 0, completed: 0, completed_cassa: 0, cancelled_cc: 0, cancelled_bt: 0, fake: 0, rejected: 0, no_show: 0, sd: 0, cancelled: 0, cassa: 0, fact_cassa: 0, prepaid: 0, parts: 0, remainder: 0, net: 0, zero_count: 0 });

  const calcEfficiency = (r) => r.total ? Math.round((r.completed + r.sd - r.rejected - r.fake) / r.total * 1000) / 10 : 0;
  const calcMoneyPct = (r) => r.total ? Math.round(r.completed / r.total * 1000) / 10 : 0;
  const calcAvgCompleted = (r) => r.completed ? Math.round((r.completed_cassa || r.cassa) / r.completed) : 0;
  const calcMargin = (r) => r.cassa ? Math.round(r.net / r.cassa * 1000) / 10 : 0;

  const fullData = [
    ...displayData.map(r => ({
      ...r,
      efficiency: calcEfficiency(r),
      money_pct: calcMoneyPct(r),
      avg_completed: calcAvgCompleted(r),
      margin: calcMargin(r),
    })),
    {
      city_id: 'summary', city_name: 'Итого', ...totals,
      efficiency: calcEfficiency(totals),
      money_pct: calcMoneyPct(totals),
      avg_completed: totals.completed ? Math.round((totals.completed_cassa || 0) / totals.completed) : 0,
      margin: calcMargin(totals),
      avg_check: displayData.length ? Math.round(displayData.reduce((s, r) => s + (r.avg_check * r.total), 0) / totals.total) : 0,
      max_check: displayData.length ? Math.max(...displayData.map(r => r.max_check)) : 0,
      cancelled_pct: totals.total ? Math.round(totals.cancelled / totals.total * 1000) / 10 : 0,
      sd_pct: totals.total ? Math.round(totals.sd / totals.total * 1000) / 10 : 0,
    },
  ];

  const bold = (v) => <strong>{v}</strong>;
  const pctColor = (v) => ({ color: v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#f5222d', fontWeight: 500 });

  const columns = [
    { title: 'Город', dataIndex: 'city_name', width: 130, render: (v, r) => r.city_id === 'summary' ? bold(v) : v },
    { title: 'Заявок', dataIndex: 'total', width: 55, render: (v, r) => r.city_id === 'summary' ? bold(v) : v },
    { title: 'Вып', dataIndex: 'completed', width: 45, render: (v, r) => r.city_id === 'summary' ? bold(v) : v },
    { title: 'СД', dataIndex: 'sd', width: 35, render: (v, r) => r.city_id === 'summary' ? bold(v) : v },
    { title: 'Отказ', dataIndex: 'rejected', width: 45, render: (v, r) => r.city_id === 'summary' ? bold(v) : v },
    { title: 'Вброс', dataIndex: 'fake', width: 45, render: (v, r) => r.city_id === 'summary' ? bold(v) : v },
    { title: 'ОтмКЦ', dataIndex: 'cancelled_cc', width: 50, render: (v, r) => r.city_id === 'summary' ? bold(v) : v },
    { title: 'ОтмБТ', dataIndex: 'cancelled_bt', width: 50, render: (v, r) => r.city_id === 'summary' ? bold(v) : v },
    { title: 'Недоезд', dataIndex: 'no_show', width: 55, render: (v, r) => r.city_id === 'summary' ? bold(v) : v },
    { title: 'Ноль', dataIndex: 'zero_count', width: 40, render: (v, r) => r.city_id === 'summary' ? bold(v) : v },
    { title: 'Касса', dataIndex: 'cassa', width: 75, render: (v) => `${v?.toLocaleString()} ₽` },
    { title: 'Факт К', dataIndex: 'fact_cassa', width: 75, render: (v) => `${v?.toLocaleString()} ₽` },
    { title: 'Предоп', dataIndex: 'prepaid', width: 70, render: (v) => `${v?.toLocaleString()} ₽` },
    { title: 'Зпч', dataIndex: 'parts', width: 60, render: (v) => `${v?.toLocaleString()} ₽` },
    { title: 'Остаток', dataIndex: 'remainder', width: 70, render: (v) => `${v?.toLocaleString()} ₽` },
    { title: 'Чистая', dataIndex: 'net', width: 70, render: (v) => `${v?.toLocaleString()} ₽` },
    { title: '% Вып', dataIndex: 'money_pct', width: 55, render: (v) => <span style={pctColor(v)}>{v}%</span> },
    { title: '% Отм', dataIndex: 'cancelled_pct', width: 50, render: (v, r) => r.city_id === 'summary' ? bold(`${v}%`) : `${v}%` },
    { title: '% в ₽', dataIndex: 'money_pct', width: 50, render: (v) => <span style={pctColor(v)}>{v}%</span> },
    { title: 'Эфф-ть', dataIndex: 'efficiency', width: 55, render: (v) => <span style={pctColor(v)}>{v}%</span> },
    { title: 'Маржа', dataIndex: 'margin', width: 55, render: (v) => <span style={pctColor(v)}>{v}%</span> },
    { title: 'Ср. чек', dataIndex: 'avg_check', width: 70, render: (v) => `${v?.toLocaleString()} ₽` },
    { title: 'Ср. чек вып', dataIndex: 'avg_completed', width: 75, render: (v) => `${v?.toLocaleString()} ₽` },
    { title: 'Макс', dataIndex: 'max_check', width: 60, render: (v) => `${v?.toLocaleString()} ₽` },
  ];

  // Графики
  const daysMap = {};
  displayData.forEach(r => { Object.entries(r.by_day || {}).forEach(([day, count]) => { daysMap[day] = (daysMap[day] || 0) + count; }); });
  const dailyData = Object.entries(daysMap).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day: day.slice(5), count }));

  const avgByDayMap = {}; const avgCountMap = {};
  displayData.forEach(r => { Object.entries(r.by_day || {}).forEach(([day, count]) => { avgByDayMap[day] = (avgByDayMap[day] || 0) + (r.cassa || 0); avgCountMap[day] = (avgCountMap[day] || 0) + count; }); });
  const avgDailyData = Object.entries(avgByDayMap).sort(([a], [b]) => a.localeCompare(b)).map(([day, sum]) => ({ day: day.slice(5), avg: avgCountMap[day] ? Math.round(sum / avgCountMap[day]) : 0 }));

  // Воронка
  const cancelledFakeTotal = (totals.cancelled_cc || 0) + (totals.cancelled_bt || 0) + (totals.fake || 0);
  const funnelMax = Math.max(totals.total, 1);
  const funnelData = [
    { name: 'Всего', value: totals.total, pct: 100, fill: '#1677ff' },
    { name: 'СД', value: totals.sd, pct: Math.round(totals.sd / funnelMax * 100), fill: '#722ed1' },
    { name: 'Отмены+Вброс+Отказы', value: cancelledFakeTotal + totals.rejected, pct: Math.round((cancelledFakeTotal + totals.rejected) / funnelMax * 100), fill: '#faad14' },
    { name: 'Выполнено', value: totals.completed, pct: Math.round(totals.completed / funnelMax * 100), fill: '#52c41a' },
  ];
  const funnelBreakdown = [
    { name: 'Отмены КЦ', value: totals.cancelled_cc, fill: '#faad14' },
    { name: 'Отмены БТ', value: totals.cancelled_bt, fill: '#fa8c16' },
    { name: 'Вброс', value: totals.fake, fill: '#eb2f96' },
    { name: 'Отказы', value: totals.rejected, fill: '#f5222d' },
  ];

  // Техника
  const techMap = {};
  displayData.forEach(r => { Object.entries(r.technics || {}).forEach(([id, count]) => { techMap[id] = (techMap[id] || 0) + count; }); });
  const techData = Object.entries(techMap).map(([id, count]) => ({ name: TECH_NAMES[id] || `Тип ${id}`, value: count }));

  // Процент в деньги
  const moneyPct = totals.total ? Math.round(totals.completed / totals.total * 1000) / 10 : 0;

  const showCompare = displayData.length > 1;
  const compareData = displayData.map(r => ({
    name: r.city_name,
    efficiency: calcEfficiency(r),
    margin: calcMargin(r),
    avg_completed: calcAvgCompleted(r),
    cancelled: r.cancelled,
  }));

  return (
    <Card title="📊 Статистика — Города" extra={<Button icon={<ReloadOutlined />} onClick={fetchData}>Обновить</Button>}>
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        <Col>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Период</div>
          <RangePicker value={dateRange} onChange={setDateRange} format="DD.MM.YYYY" />
        </Col>
        <Col>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Направление</div>
          <Select placeholder="Все" allowClear style={{ width: 150 }} value={filterDepartment} onChange={handleDepartmentChange} options={departmentOptions} />
        </Col>
        <Col>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Регион</div>
          <Select placeholder="Все" allowClear style={{ width: 150 }} value={filterRegion} onChange={handleRegionChange} options={regionOptions} />
        </Col>
        <Col>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Город</div>
          <Select placeholder="Все" allowClear style={{ width: 150 }} value={filterCity} onChange={setFilterCity} options={cityOptions} />
        </Col>
        {data.length > 1 && (
          <Col>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Города</div>
            <Select
              mode="multiple"
              value={selectedCities}
              onChange={setSelectedCities}
              placeholder="Все города"
              allowClear
              style={{ minWidth: 280 }}
              maxTagCount={2}
              options={data.map(r => ({ value: r.city_id, label: r.city_name }))}
            />
          </Col>
        )}
      </Row>

      <Table dataSource={fullData} rowKey="city_id" columns={columns} loading={loading} size="small" scroll={{ x: 1800 }} pagination={false}
        rowClassName={(r) => r.city_id === 'summary' ? 'summary-row' : ''}
        style={{ marginBottom: 32 }} />

      {/* Ряд 1 */}
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card size="small" title="💰 Средний чек по дням">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={avgDailyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}т`} /><ReTooltip formatter={(v) => `${v?.toLocaleString()} ₽`} /><Line type="monotone" dataKey="avg" stroke="#722ed1" strokeWidth={2} dot={{ r: 3 }} /></LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="📉 Динамика заявок по дням">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><ReTooltip /><Line type="monotone" dataKey="count" stroke="#1677ff" strokeWidth={2} dot={{ r: 3 }} /></LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Ряд 2 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Card size="small" title="📋 Воронка заказов" style={{ minHeight: 350 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260, gap: 0, padding: '0 10px' }}>
              {funnelData.map((item, idx) => {
                const isComposite = idx === 2;
                const maxValue = Math.max(...funnelData.map(d => d.value), 1);
                const pct = Math.round(item.value / maxValue * 100);
                const compositeValue = item.value;
                return (
                  <div key={idx} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                    <div style={{ fontSize: 9, color: '#888', width: 90, textAlign: 'right', lineHeight: 1.2, flexShrink: 0 }}>{item.name}</div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                      {isComposite ? (
                        compositeValue > 0 ? (
                          <div style={{ width: `${Math.round(compositeValue / maxValue * 100)}%`, minWidth: 60, height: 16, borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                            {funnelBreakdown.map((b, bi) => {
                              const bpct = compositeValue > 0 ? Math.round(b.value / compositeValue * 100) : 0;
                              return bpct > 0 ? (
                                <AntTooltip key={bi} title={`${b.name}: ${b.value} шт.`}>
                                  <div style={{ width: `${bpct}%`, height: '100%', backgroundColor: b.fill, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8 }}>
                                    {b.value}
                                  </div>
                                </AntTooltip>
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <div style={{ width: '5%', minWidth: 30, height: 16, backgroundColor: '#eee', borderRadius: 3 }} />
                        )
                      ) : (
                        <div style={{ width: `${pct}%`, minWidth: item.value > 0 ? 30 : 0, height: 16, backgroundColor: item.fill, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 500 }}>
                          {item.value > 0 ? item.value : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap', fontSize: 9 }}>
              <span style={{ color: '#1677ff' }}>● Всего: {totals.total}</span>
              <span style={{ color: '#722ed1' }}>● СД: {totals.sd}</span>
              {funnelBreakdown.map((e, i) => (
                <span key={i} style={{ color: e.fill }}>● {e.name}: {e.value}</span>
              ))}
              <span style={{ color: '#52c41a' }}>● Выполнено: {totals.completed}</span>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="🔧 Распределение по технике" style={{ minHeight: 350 }}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart><Pie data={techData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={40} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>{techData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><ReTooltip /></PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="📊 Процент в деньги" style={{ minHeight: 350 }}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'В деньги', value: moneyPct },
                    { name: 'Остальное', value: 100 - moneyPct },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={40}
                  label={({ payload }) => payload.name === 'В деньги' ? `${moneyPct}%` : ''}
                >
                  <Cell fill="#52c41a" />
                  <Cell fill="#f5222d" />
                </Pie>
                <ReTooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Ряд 3 и 4 — только если >1 города */}
      {showCompare && (
        <>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Card size="small" title="📈 Эффективность по городам">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={compareData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" domain={[0, 100]} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} /><ReTooltip formatter={(v) => `${v}%`} /><Bar dataKey="efficiency" fill="#1677ff" radius={[0,6,6,0]} /></BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="💎 Маржа % по городам">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={compareData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" domain={[0, 100]} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} /><ReTooltip formatter={(v) => `${v}%`} /><Bar dataKey="margin" fill="#52c41a" radius={[0,6,6,0]} /></BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Card size="small" title="💵 Средний чек по городам">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={compareData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}т`} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} /><ReTooltip formatter={(v) => `${v?.toLocaleString()} ₽`} /><Bar dataKey="avg_completed" fill="#722ed1" radius={[0,6,6,0]} /></BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="❌ Отмены по городам">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={compareData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} /><ReTooltip /><Bar dataKey="cancelled" fill="#f5222d" radius={[0,6,6,0]} /></BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Card>
  );
}

export default StatsCitiesPage;