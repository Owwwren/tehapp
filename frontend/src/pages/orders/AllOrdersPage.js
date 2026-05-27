import React, { useState, useEffect } from 'react';
import { Card, Select, DatePicker, Button, Space, Row, Col, Input, Table, Tag, Modal, InputNumber, message, theme } from 'antd';
import { SearchOutlined, ClearOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import ClientCardModal from '../../components/ClientCardModal';
import VlozheniaButton from '../../components/VlozheniaButton';
import CommentsHistoryModal from '../../components/CommentsHistoryModal';
import OrderDetailModal from '../../components/OrderDetailModal';
import PhotoUploader from '../../components/PhotoUploader';

dayjs.locale('ru');

const { RangePicker } = DatePicker;

function getMonday(today) {
        const day = today.day();
        const offset = day === 0 ? -6 : 1 - day;
        return today.add(offset, 'day');
}

function AllOrdersPage() {
        const [loading, setLoading] = useState(false);
        const [masters, setMasters] = useState([]);
        const [statuses, setStatuses] = useState([]);
        const [orders, setOrders] = useState([]);
        const [detailOpen, setDetailOpen] = useState(false);
        const [selectedOrder, setSelectedOrder] = useState(null);

        const [dateType, setDateType] = useState('created_at');
        const [dateRange, setDateRange] = useState(() => {
                const monday = getMonday(dayjs());
                return [monday, monday.add(6, 'day')];
        });
        const [masterId, setMasterId] = useState(null);
        const [statusId, setStatusId] = useState(null);
        const [technicId, setTechnicId] = useState(null);
        const [sortBy, setSortBy] = useState('id_desc');
        const [search, setSearch] = useState('');
        const [factorFilter, setFactorFilter] = useState(null);
        const [confirmType, setConfirmType] = useState(null);
        const [stats, setStats] = useState({});
        const [weekStats, setWeekStats] = useState([0, 0, 0, 0, 0, 0, 0]);
        const [clientCardOpen, setClientCardOpen] = useState(false);
        const [selectedClientId, setSelectedClientId] = useState(null);
        const [paymentOpen, setPaymentOpen] = useState(false);
        const [paymentOrder, setPaymentOrder] = useState(null);
        const [paymentPercent, setPaymentPercent] = useState(0);
        const [okkOpen, setOKKOpen] = useState(false);
        const [okkContractLeft, setOKKContractLeft] = useState(null);
        const [okkTechWorks, setOKKTechWorks] = useState(null);
        const [okkWorksMatch, setOKKWorksMatch] = useState(null);
        const [okkMasterPhoneLeft, setOKKMasterPhoneLeft] = useState(null);
        const [okkClientAmount, setOKKClientAmount] = useState(null);
        const [okkWarrantyDays, setOKKWarrantyDays] = useState(14);
        const [okkSatisfied, setOKKSatisfied] = useState(null);
        const [okkComment, setOKKComment] = useState('');
        const [rescheduleOpen, setRescheduleOpen] = useState(false);
        const [rescheduleDate, setRescheduleDate] = useState(null);
        const [workComment, setWorkComment] = useState('');
        const [commentsHistory, setCommentsHistory] = useState([]);
        const [historyOpen, setHistoryOpen] = useState(false);
        const [photos, setPhotos] = useState([]);
        const [technics, setTechnics] = useState([]);
        const [factors, setFactors] = useState([]);
        const [cancelReasons, setCancelReasons] = useState([]);

        const [allDepartments, setAllDepartments] = useState([]);
        const [allRegions, setAllRegions] = useState([]);
        const [allCities, setAllCities] = useState([]);
        const [allBranches, setAllBranches] = useState([]);
        const [filterDepartment, setFilterDepartment] = useState(null);
        const [filterRegion, setFilterRegion] = useState(null);
        const [filterCity, setFilterCity] = useState(null);
        const [filterBranch, setFilterBranch] = useState(null);
        const [cancelReason, setCancelReason] = useState(null);

        const departmentOptions = allDepartments.map(d => ({ value: d.id, label: d.name }));
        const regionOptions = allRegions.filter(r => !filterDepartment || r.departments?.some(d => d.id === filterDepartment)).map(r => ({ value: r.id, label: r.name }));
        const cityOptions = allCities.filter(c => !filterRegion || c.region_id === filterRegion).map(c => ({ value: c.id, label: c.name }));
        const branchOptions = allBranches.filter(b => (!filterCity || b.city_id === filterCity)).map(b => ({ value: b.id, label: `${b.name} (${b.type})` }));

        const { token } = theme.useToken();
        const isDark = token.colorBgContainer === '#141414' || token.colorBgBase === '#000';

        useEffect(() => {
                api.get('/users/').then(r => setMasters(r.data.filter(u => u.role?.code === 'master'))).catch(() => {});
                api.get('/order-statuses/').then(r => setStatuses(r.data)).catch(() => {});
                api.get('/technics/').then(r => setTechnics(r.data)).catch(() => {});
                api.get('/factors/').then(r => setFactors(r.data)).catch(() => {});
                api.get('/cancel-reasons/').then(r => setCancelReasons(r.data)).catch(() => {});
                api.get('/departments/').then(r => setAllDepartments(r.data)).catch(() => {});
                api.get('/regions/').then(r => setAllRegions(r.data)).catch(() => {});
                api.get('/cities/').then(r => setAllCities(r.data)).catch(() => {});
                api.get('/branches/').then(r => setAllBranches(r.data)).catch(() => {});
        }, []);

        useEffect(() => {
                fetchWeekStats();
                fetchStats();
                fetchOrders();
                const interval = setInterval(() => { fetchWeekStats(); fetchStats(); fetchOrders(); }, 5000);
                return () => clearInterval(interval);
        }, [dateRange, dateType, statusId, masterId, filterCity, filterBranch, filterRegion, filterDepartment, technicId, search, sortBy, cancelReason, factorFilter, confirmType]);

        const fetchPhotos = async (orderId) => {
                try { const r = await api.get(`/orders/${orderId}/photos`); setPhotos(r.data); } catch (e) {}
        };

        const getWeekDays = () => ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
        const getWeekDates = () => { const monday = getMonday(dayjs()); return Array.from({ length: 7 }, (_, i) => monday.add(i, 'day').format('DD')); };

        const fetchWeekStats = async () => {
                try {
                        const monday = getMonday(dayjs());
                        const res = await api.get('/orders/week-stats', { params: { date_from: monday.format('YYYY-MM-DD'), date_to: monday.add(6, 'day').format('YYYY-MM-DD') } });
                        const stats = [0, 0, 0, 0, 0, 0, 0];
                        (res.data || []).forEach(d => { const day = new Date(d.day).getDay(); stats[day === 0 ? 6 : day - 1] = d.count; });
                        setWeekStats(stats);
                } catch (e) {}
        };

        const fetchStats = async () => {
                try {
                        const start = dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD') : getMonday(dayjs()).format('YYYY-MM-DD');
                        const end = dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD') : getMonday(dayjs()).add(6, 'day').format('YYYY-MM-DD');
                        const params = { date_from: start, date_to: end, master_id: masterId, status_id: statusId, technic_type_id: technicId };
                        if (filterBranch) params.branch_id = filterBranch;
                        else if (filterCity) params.city_id = filterCity;
                        else if (filterRegion) params.region_id = filterRegion;
                        else if (filterDepartment) params.department_id = filterDepartment;
                        if (cancelReason) params.cancel_reason = cancelReason;
                        if (factorFilter) params.factor = factorFilter;
                        if (confirmType) params.confirmed = confirmType;
                        if (search) params.search = search;
                        const res = await api.get('/orders/stats', { params });
                        setStats(res.data);
                } catch (e) {}
        };

        const refreshAll = () => { fetchOrders(); fetchStats(); fetchWeekStats(); };

        const fetchOrders = async () => {
                setLoading(true);
                try {
                        const start = dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD') : getMonday(dayjs()).format('YYYY-MM-DD');
                        const end = dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD') : getMonday(dayjs()).add(6, 'day').format('YYYY-MM-DD');
                        const params = { date_from: start, date_to: end, dt_type: dateType };
                        if (statusId) params.status_id = statusId;
                        if (masterId) params.master_id = masterId;
                        if (filterBranch) params.branch_id = filterBranch;
                        else if (filterCity) params.city_id = filterCity;
                        else if (filterRegion) params.region_id = filterRegion;
                        else if (filterDepartment) params.department_id = filterDepartment;
                        if (technicId) params.technic_type_id = technicId;
                        if (search) params.search = search;
                        if (sortBy) params.sort = sortBy;
                        if (confirmType) params.confirmed = confirmType;
                        if (cancelReason) params.cancel_reason = cancelReason;
                        if (factorFilter) params.factor = factorFilter;
                        const res = await api.get('/orders/', { params });
                        setOrders(res.data);
                } catch (e) {}
                finally { setLoading(false); }
        };

        const fetchCommentsHistory = async (orderId) => {
                try { const r = await api.get(`/orders/${orderId}/comments`); setCommentsHistory(r.data); setHistoryOpen(true); } catch (e) {}
        };

        const handlePaymentSubmit = async () => {
                try { await api.post('/order-payments/', null, { params: { order_id: paymentOrder.id, master_id: paymentOrder.master_id, amount: paymentOrder?.price_net || 0, percent: paymentPercent } }); message.success('Оплата подтверждена'); setPaymentOpen(false); refreshAll(); } catch (e) { message.error('Ошибка'); }
        };

        const handleOKKSubmit = async () => {
                try { await api.put(`/orders/${selectedOrder.id}/okk-check`, null, { params: { okk_contract_left: okkContractLeft, okk_tech_works: okkTechWorks, okk_works_match: okkWorksMatch, okk_master_phone_left: okkMasterPhoneLeft, okk_client_amount: okkClientAmount, okk_warranty_days: okkWarrantyDays, okk_satisfied: okkSatisfied, comment: okkComment } }); message.success('ОКК обновлён'); setOKKOpen(false); refreshAll(); } catch (e) { message.error('Ошибка'); }
        };

        const handleReschedule = async () => {
                if (!rescheduleDate || !selectedOrder) return;
                try { await api.put(`/orders/${selectedOrder.id}/reschedule`, null, { params: { scheduled_time: dayjs(rescheduleDate).format('YYYY-MM-DD HH:mm') } }); message.success('Дата изменена'); setRescheduleOpen(false); setDetailOpen(false); refreshAll(); } catch (e) { message.error('Ошибка'); }
        };

        const handleSaveComment = async () => {
                try { await api.put(`/orders/${selectedOrder.id}/comment`, null, { params: { description_work: workComment } }); message.success('Сохранено'); setSelectedOrder(o => ({ ...o, description_work: workComment })); refreshAll(); } catch (e) { message.error('Ошибка'); }
        };

        const handleDepartmentChange = (v) => { setFilterDepartment(v); setFilterRegion(null); setFilterCity(null); setFilterBranch(null); };
        const handleRegionChange = (v) => { setFilterRegion(v); setFilterCity(null); setFilterBranch(null); };
        const handleCityChange = (v) => { setFilterCity(v); setFilterBranch(null); };

        const borderColor = isDark ? '#303030' : '#e8e8e8';
        const headerBg = isDark ? '#1f1f1f' : '#f5f5f5';
        const headerColor = isDark ? '#bbb' : '#555';
        const rowBg = isDark ? '#141414' : '#fafafa';
        const cellBg = isDark ? '#1a1a1a' : '#fff';
        const countColor = isDark ? '#91caff' : '#2563EB';
        const zeroColor = isDark ? '#555' : '#999';
        const textColor = isDark ? '#bbb' : '#555';

        const orderColumns = [
        { title: '№', dataIndex: 'id', key: 'id', width: 50 },
        { title: 'Дата', key: 'scheduled', width: 65, render: (_, r) => r.scheduled_time ? <div style={{ fontSize: 11, lineHeight: 1.3 }}>{dayjs(r.scheduled_time).format('DD.MM')}<br/>{dayjs(r.scheduled_time).format('HH:mm')}</div> : '—' },
        { title: 'Клиент', key: 'client', width: 120, render: (_, r) => <div style={{ wordBreak: 'break-word', lineHeight: 1.3 }}>{r.client?.name || '—'}{r.client?.blacklisted && <Tag color="red" style={{ marginLeft: 4, fontSize: 10 }}>ЧС</Tag>}</div> },
        { title: 'Телефон', key: 'phone', width: 100, render: (_, r) => <span style={{ fontSize: 12 }}>{r.phone || '—'}</span> },
        { title: 'Адрес', key: 'address', width: 130, render: (_, r) => <div style={{ wordBreak: 'break-word', lineHeight: 1.3, fontSize: 11 }}>{r.address || '—'}</div> },
        { title: 'Тип', key: 'technic', width: 45, render: (_, r) => r.technic_type?.code || '—' },
        { title: 'Мастер', key: 'master', width: 110, render: (_, r) => r.master ? <span style={{ fontSize: 11 }}>{r.master.last_name}<br/>{r.master.first_name}</span> : '—' },
        { title: 'Статус', key: 'status', width: 100, render: (_, r) => r.status ? <Tag style={{ background: r.status.color || '#6B7280', color: r.status.text_color || '#fff', fontWeight: 'bold', fontSize: 11, padding: '2px 6px', border: 'none' }}>{r.status.name}</Tag> : '—' },
        { title: 'Фактор', key: 'source', width: 55, render: (_, r) => (!r.source || r.source === 'обычная') ? null : <Tag style={{ fontSize: 10 }}>{r.source}</Tag> },
        { title: 'Общ', key: 'total', width: 55, render: (_, r) => <span style={{ fontSize: 11 }}>{r.price_total ? `${r.price_total} ₽` : '0 ₽'}</span> },
        { title: 'Пред', key: 'prepaid', width: 55, render: (_, r) => <span style={{ fontSize: 11 }}>{r.price_prepaid ? `${r.price_prepaid} ₽` : '0 ₽'}</span> },
        { title: 'Ост', key: 'remainder', width: 55, render: (_, r) => <span style={{ fontSize: 11 }}>{r.price_remainder ? `${r.price_remainder} ₽` : '0 ₽'}</span> },
        { title: 'Зпч', key: 'parts', width: 50, render: (_, r) => <span style={{ fontSize: 11 }}>{r.price_parts ? `${r.price_parts} ₽` : '0 ₽'}</span> },
        { title: 'Чист', key: 'net', width: 55, render: (_, r) => <span style={{ fontSize: 11 }}>{r.price_net ? `${r.price_net} ₽` : '0 ₽'}</span> },
        { title: 'ОКК', key: 'okk', width: 60, render: (_, r) => r.okk_checked ? <Tag color="green" style={{ fontSize: 10 }}>✓</Tag> : <Tag color="red" style={{ fontSize: 10 }}>✗</Tag> },
        { title: 'Подтв', key: 'payment', width: 85, render: (_, r) => r.payments?.length > 0 ? <Tag color="green" style={{ fontSize: 10 }}>✓</Tag> : r.status?.id === 5 ? <Button size="small" type="primary" style={{ fontSize: 10, padding: '0 4px' }} onClick={() => { setPaymentOrder(r); setPaymentPercent(0); setPaymentOpen(true); }}>Подтв</Button> : null },
        { title: '', key: 'actions', width: 100, render: (_, r) => <Space size={4}><Button size="small" type="link" style={{ fontSize: 10, padding: 0 }} onClick={async () => { try { const res = await api.get(`/orders/${r.id}`); setSelectedOrder(res.data); setWorkComment(res.data.description_work || ''); setDetailOpen(true); fetchPhotos(r.id); } catch (e) {} }}>Откр</Button><VlozheniaButton onClick={() => { setSelectedClientId(r.client_id); setClientCardOpen(true); }} /></Space> },
        ];

        const weekTotal = weekStats.reduce((a, b) => a + b, 0);

        return (
                <Card title="📋 Все заявки" extra={<Button icon={<ReloadOutlined />} onClick={refreshAll}>Обновить</Button>}>
                        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                                <Col span={4}>
                                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Дата</div><Select value={dateType} onChange={setDateType} style={{ width: '100%', marginBottom: 12 }}><Select.Option value="created_at">Создания</Select.Option><Select.Option value="scheduled_time">Прибытия</Select.Option><Select.Option value="completed_at">Выполнения</Select.Option></Select>
                                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Статус</div><Select value={statusId} onChange={setStatusId} placeholder="Все" allowClear style={{ width: '100%', marginBottom: 12 }}>{statuses.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}</Select>
                                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Фактор</div><Select value={factorFilter} onChange={setFactorFilter} placeholder="Все" allowClear style={{ width: '100%' }}>{factors.map(f => <Select.Option key={f.name} value={f.name}>{f.name}</Select.Option>)}</Select>
                                </Col>
                                <Col span={5}>
                                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Период</div><RangePicker value={dateRange} onChange={(d) => setDateRange(d || [getMonday(dayjs()), getMonday(dayjs()).add(6, 'day')])} format="DD.MM.YYYY" style={{ width: '100%', marginBottom: 12 }} />
                                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Подтверждённые</div><Select value={confirmType} onChange={setConfirmType} placeholder="Все" allowClear style={{ width: '100%' }}><Select.Option value="yes">Да</Select.Option><Select.Option value="no">Нет</Select.Option></Select>
                                </Col>
                                <Col span={4}>
                                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Мастер</div><Select value={masterId} onChange={setMasterId} placeholder="Все" allowClear style={{ width: '100%', marginBottom: 12 }}>{masters.map(m => <Select.Option key={m.id} value={m.id}>{m.last_name} {m.first_name}</Select.Option>)}</Select>
                                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Категория</div><Select value={technicId} onChange={setTechnicId} placeholder="Вся техника" allowClear style={{ width: '100%' }}>{technics.map(t => <Select.Option key={t.id} value={t.id}>{t.code} — {t.name}</Select.Option>)}</Select>
                                </Col>
                                <Col span={5}>
                                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Причина отказа</div>
                                        <Select value={cancelReason} onChange={setCancelReason} placeholder="Введите или выберите" allowClear showSearch style={{ width: '100%', marginBottom: 12 }} filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())} onSearch={setCancelReason} options={cancelReasons.map(r => ({ value: r.name, label: r.name }))} />
                                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Сортировка</div><Select value={sortBy} onChange={setSortBy} style={{ width: '100%' }}><Select.Option value="id_desc">№ ↓</Select.Option><Select.Option value="id_asc">№ ↑</Select.Option><Select.Option value="date_desc">Дата ↓</Select.Option><Select.Option value="date_asc">Дата ↑</Select.Option><Select.Option value="remainder_desc">Остаток ↓</Select.Option><Select.Option value="remainder_asc">Остаток ↑</Select.Option></Select>
                                </Col>
                                <Col span={6}>
                                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Направление</div><Select placeholder="Все" allowClear style={{ width: '100%', marginBottom: 8 }} value={filterDepartment} onChange={handleDepartmentChange} options={departmentOptions} />
                                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Регион</div><Select placeholder="Все" allowClear style={{ width: '100%', marginBottom: 8 }} value={filterRegion} onChange={handleRegionChange} options={regionOptions} />
                                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Город</div><Select placeholder="Все" allowClear style={{ width: '100%', marginBottom: 8 }} value={filterCity} onChange={handleCityChange} options={cityOptions} />
                                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Филиал</div><Select placeholder="Все" allowClear style={{ width: '100%', marginBottom: 8 }} value={filterBranch} onChange={setFilterBranch} options={branchOptions} />
                                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Поиск</div><Input prefix={<SearchOutlined />} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="№, клиент, адрес" style={{ marginBottom: 12 }} />
                                        <Button icon={<ClearOutlined />} onClick={() => { const monday = getMonday(dayjs()); setDateType('created_at'); setDateRange([monday, monday.add(6, 'day')]); setMasterId(null); setCancelReason(null); setFilterDepartment(null); setFilterRegion(null); setFilterCity(null); setFilterBranch(null); setStatusId(null); setTechnicId(null); setSortBy('id_desc'); setSearch(''); setFactorFilter(null); setConfirmType(null); }}>Очистить</Button>
                                </Col>
                        </Row>

                        <div style={{ marginBottom: 24, overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, borderRadius: 8, border: `1px solid ${borderColor}`, overflow: 'hidden' }}><thead><tr><th style={{ padding: '6px 6px', background: headerBg, color: headerColor, fontWeight: 600, textAlign: 'center', borderBottom: `1px solid ${borderColor}` }}>День</th>{getWeekDays().map((d, i) => <th key={i} style={{ padding: '6px 4px', background: headerBg, color: headerColor, fontWeight: 600, textAlign: 'center', borderBottom: `1px solid ${borderColor}`, borderLeft: `1px solid ${borderColor}` }}>{d}</th>)}<th style={{ padding: '6px 6px', background: headerBg, color: headerColor, fontWeight: 700, textAlign: 'center', borderBottom: `1px solid ${borderColor}`, borderLeft: `1px solid ${borderColor}` }}>∑</th></tr></thead><tbody><tr><td style={{ padding: '6px 6px', background: rowBg, color: textColor, fontWeight: 600, textAlign: 'center' }}>Число</td>{getWeekDates().map((d, i) => <td key={i} style={{ padding: '6px 4px', background: rowBg, color: textColor, textAlign: 'center', borderLeft: `1px solid ${borderColor}` }}>{d}</td>)}<td style={{ padding: '6px 6px', background: rowBg, borderLeft: `1px solid ${borderColor}` }}></td></tr><tr><td style={{ padding: '6px 6px', background: rowBg, color: textColor, fontWeight: 600, textAlign: 'center' }}>Заявки</td>{weekStats.map((c, i) => <td key={i} style={{ padding: '6px 4px', background: cellBg, textAlign: 'center', fontWeight: c > 0 ? 700 : 400, color: c > 0 ? countColor : zeroColor, borderLeft: `1px solid ${borderColor}` }}>{c || '—'}</td>)}<td style={{ padding: '6px 6px', background: cellBg, textAlign: 'center', fontWeight: 700, color: weekTotal > 0 ? countColor : zeroColor, borderLeft: `1px solid ${borderColor}` }}>{weekTotal || '—'}</td></tr></tbody></table></div>
                        <div style={{ marginBottom: 24, overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, borderRadius: 8, border: `1px solid ${borderColor}`, overflow: 'hidden' }}><thead><tr>{['Касса', 'Факт К', 'Заказов', 'Отмен', 'Не заказов', 'Отм + Не зак', 'Выполнено', 'Отмен %', 'Не зак %', 'Отм+Нез %', 'Эфф-ть', 'Ср. чек', 'Ноль', 'Недоезд', 'Макс', 'Прочие', 'СД'].map((h, i) => <th key={i} style={{ padding: '6px 4px', background: headerBg, color: headerColor, fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap', borderLeft: i > 0 ? `1px solid ${borderColor}` : 'none', borderBottom: `1px solid ${borderColor}` }}>{h}</th>)}</tr></thead><tbody><tr>{[stats.cassa || 0, stats.fact_cassa || 0, stats.total || 0, stats.cancelled || 0, stats.not_orders || 0, stats.cancelled_and_not || 0, stats.completed || 0, stats.cancelled_pct || 0, stats.not_orders_pct || 0, stats.cancelled_and_not_pct || 0, stats.efficiency || 0, stats.avg_check || 0, stats.zero_count || 0, stats.no_show || 0, stats.max_check || 0, '—', stats.sd || 0].map((v, i) => <td key={i} style={{ padding: '6px 4px', background: cellBg, color: textColor, textAlign: 'center', whiteSpace: 'nowrap', borderLeft: i > 0 ? `1px solid ${borderColor}` : 'none' }}>{v}</td>)}</tr></tbody></table></div>

                        <Table columns={orderColumns} dataSource={orders} rowKey="id" loading={loading} size="small" scroll={{ x: 1100 }} />
                        <ClientCardModal clientId={selectedClientId} open={clientCardOpen} onClose={() => setClientCardOpen(false)} />

                        <Modal title="Подтверждение оплаты" open={paymentOpen} onCancel={() => setPaymentOpen(false)} onOk={handlePaymentSubmit} okText="Подтвердить" width={400}>
                                {paymentOrder && <><p><strong>Заявка №{paymentOrder.id}</strong></p><p><strong>Клиент:</strong> {paymentOrder.client?.name}</p><p><strong>Общая сумма:</strong> {paymentOrder.price_total} ₽</p><p><strong>Мастер:</strong> {paymentOrder.master ? `${paymentOrder.master.last_name} ${paymentOrder.master.first_name}` : '—'}</p><p><strong>Процент мастера (%):</strong></p><InputNumber value={paymentPercent} onChange={setPaymentPercent} style={{ width: '100%', marginBottom: 12 }} min={0} max={100} /><p><strong>Чистая: {paymentOrder?.price_net || 0} ₽</strong></p><p><strong>Мастеру: {Math.round((paymentOrder?.price_net || 0) * paymentPercent / 100)} ₽</strong></p><p><strong>Компании: {Math.round((paymentOrder?.price_net || 0) * (1 - paymentPercent / 100))} ₽</strong></p></>}
                        </Modal>

                        <OrderDetailModal
                                open={detailOpen}
                                onClose={() => setDetailOpen(false)}
                                order={selectedOrder}
                                workComment={workComment}
                                onCommentChange={(e) => setWorkComment(e.target.value)}
                                onSaveComment={handleSaveComment}
                                onReschedule={() => {
                                        setRescheduleDate(selectedOrder?.scheduled_time ? dayjs(selectedOrder.scheduled_time) : dayjs());
                                        setRescheduleOpen(true);
                                }}
                                onCopy={() => {
                                        navigator.clipboard.writeText([
                                                `Заявка №${selectedOrder.id}`,
                                                `Клиент: ${selectedOrder.client?.name || '—'}`,
                                                `Телефон: ${selectedOrder.phone || '—'}`,
                                        ].join('\n')).then(() => message.success('Скопировано'));
                                }}
                                onHistoryClick={() => fetchCommentsHistory(selectedOrder.id)}
                                onOrderUpdate={refreshAll}
                                photosSection={
                                        selectedOrder && (
                                                <PhotoUploader
                                                        entityType="order"
                                                        entityId={selectedOrder.id}
                                                        photos={photos}
                                                        onPhotosChange={setPhotos}
                                                />
                                        )
                                }
                        />

                        <Modal title="Редактировать ОКК" open={okkOpen} onCancel={() => setOKKOpen(false)} onOk={handleOKKSubmit} okText="Сохранить" width={550}>
                                {selectedOrder && (<>
                                        <p>Оставил ли мастер договор?</p><Select value={okkContractLeft} onChange={setOKKContractLeft} style={{ width: '100%', marginBottom: 16 }}><Select.Option value={true}>Да</Select.Option><Select.Option value={false}>Нет</Select.Option></Select>
                                        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                                                <div style={{ flex: 1 }}><p>Доволен ли клиент?</p><Select value={okkSatisfied} onChange={setOKKSatisfied} style={{ width: '100%' }}><Select.Option value="yes">Да, доволен</Select.Option><Select.Option value="partly">Частично</Select.Option><Select.Option value="no">Нет, недоволен</Select.Option><Select.Option value="negative">Негатив</Select.Option></Select></div>
                                                <div style={{ flex: 1 }}><p>Работает ли техника?</p><Select value={okkTechWorks} onChange={setOKKTechWorks} style={{ width: '100%' }}><Select.Option value="yes">Да</Select.Option><Select.Option value="partly">Частично</Select.Option><Select.Option value="no">Нет</Select.Option></Select></div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                                                <div style={{ flex: 1 }}><p>Совпадают ли работы?</p><Select value={okkWorksMatch} onChange={setOKKWorksMatch} style={{ width: '100%' }}><Select.Option value="yes">Да</Select.Option><Select.Option value="partly">Частично</Select.Option><Select.Option value="no">Нет</Select.Option></Select></div>
                                                <div style={{ flex: 1 }}><p>Сумма со слов клиента</p><InputNumber value={okkClientAmount} onChange={setOKKClientAmount} style={{ width: '100%' }} suffix="₽" /></div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                                                <div style={{ flex: 1 }}><p>Оставил ли мастер номер?</p><Select value={okkMasterPhoneLeft} onChange={setOKKMasterPhoneLeft} style={{ width: '100%' }}><Select.Option value={true}>Да</Select.Option><Select.Option value={false}>Нет</Select.Option></Select></div>
                                                <div style={{ flex: 1 }}><p>Гарантия (дней)</p><InputNumber value={okkWarrantyDays} onChange={setOKKWarrantyDays} style={{ width: '100%' }} min={0} /></div>
                                        </div>
                                        <p>Комментарий</p><Input.TextArea value={okkComment} onChange={(e) => setOKKComment(e.target.value)} rows={3} />
                                </>)}
                        </Modal>

                        <Modal title="Изменить дату" open={rescheduleOpen} onCancel={() => setRescheduleOpen(false)} onOk={handleReschedule} okText="Сохранить">
                                <DatePicker showTime format="YYYY-MM-DD HH:mm" value={rescheduleDate} onChange={setRescheduleDate} style={{ width: '100%' }} />
                        </Modal>

                        <CommentsHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} comments={commentsHistory} />
                </Card>
        );
}

export default AllOrdersPage;