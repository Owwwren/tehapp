import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Card, Tag, Button, Space, Select, message, theme,
  Modal, Input, InputNumber
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';
import { DatePicker } from 'antd';
import ClientCardModal from '../../components/ClientCardModal';
import VlozheniaButton from '../../components/VlozheniaButton';
import CommentsHistoryModal from '../../components/CommentsHistoryModal';
import OrderDetailModal from '../../components/OrderDetailModal';
import PhotoUploader from '../../components/PhotoUploader';

function AssignedOrders() {
        const [orders, setOrders] = useState([]);
        const [loading, setLoading] = useState(false);
        const [calendar, setCalendar] = useState({});
        const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
        const [filterStatus, setFilterStatus] = useState(null);
        const currentMonth = dayjs();
        const { token } = theme.useToken();
        const isDark = token.colorBgContainer === '#141414' || token.colorBgBase === '#000';

        // Все данные для фильтров загружены сразу
        const [allDepartments, setAllDepartments] = useState([]);
        const [allRegions, setAllRegions] = useState([]);
        const [allCities, setAllCities] = useState([]);
        const [allBranches, setAllBranches] = useState([]);

        // Выбранные значения
        const [filterDepartment, setFilterDepartment] = useState(null);
        const [filterRegion, setFilterRegion] = useState(null);
        const [filterCity, setFilterCity] = useState(null);
        const [filterBranch, setFilterBranch] = useState(null);

        // Отфильтрованные списки для селектов
        const departmentOptions = allDepartments.map(d => ({ value: d.id, label: d.name }));
        const regionOptions = allRegions
                .filter(r => !filterDepartment || r.departments?.some(d => d.id === filterDepartment))
                .map(r => ({ value: r.id, label: r.name }));
        const cityOptions = allCities
                .filter(c => !filterRegion || c.region_id === filterRegion)
                .map(c => ({ value: c.id, label: c.name }));
        const branchOptions = allBranches
                .filter(b => (!filterCity || b.city_id === filterCity) && b.type === 'БТ')
                .map(b => ({ value: b.id, label: b.name }));

        const [detailOpen, setDetailOpen] = useState(false);
        const [selectedOrder, setSelectedOrder] = useState(null);
        const [masters, setMasters] = useState([]);
        const [workComment, setWorkComment] = useState('');
        const [photos, setPhotos] = useState([]);
        const [commentsHistory, setCommentsHistory] = useState([]);
        const [historyOpen, setHistoryOpen] = useState(false);

        const [prepaidModalOpen, setPrepaidModalOpen] = useState(false);
        const [prepaidAmount, setPrepaidAmount] = useState(null);
        const [pricesModalOpen, setPricesModalOpen] = useState(false);
        const [pricesTotal, setPricesTotal] = useState(null);
        const [pricesParts, setPricesParts] = useState(null);
        const [cancelModalOpen, setCancelModalOpen] = useState(false);
        const [cancelReason, setCancelReason] = useState('');
        const [rescheduleOpen, setRescheduleOpen] = useState(false);
        const [rescheduleDate, setRescheduleDate] = useState(null);
        const [pendingOrderId, setPendingOrderId] = useState(null);
        const [clientCardOpen, setClientCardOpen] = useState(false);
        const [selectedClientId, setSelectedClientId] = useState(null);
        const [rejectModalOpen, setRejectModalOpen] = useState(false);
        const [rejectReason, setRejectReason] = useState('');

        const [statuses, setStatuses] = useState([]);
        const [rejectReasons, setRejectReasons] = useState([]);
        const [cancelReasons, setCancelReasons] = useState([]);

        const fetchCalendar = useCallback(async () => {
                try {
                        const response = await api.get('/orders/calendar', {
                                params: { year: currentMonth.year(), month: currentMonth.month() + 1 }
                        });
                        const daysMap = {};
                        (response.data || []).forEach(d => { daysMap[d.day] = d.count; });
                        setCalendar(daysMap);
                } catch (e) { console.error('Ошибка календаря:', e); }
        }, [currentMonth]);

        const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
                const params = { scheduled_date: selectedDate };
                if (filterStatus) params.status_id = filterStatus;
                if (filterBranch) params.branch_id = filterBranch;
                if (filterCity && !filterBranch) params.city_id = filterCity;
                if (filterRegion && !filterCity) params.region_id = filterRegion;
                if (filterDepartment && !filterRegion) params.department_id = filterDepartment;
                const response = await api.get('/orders/', { params });
                const hiddenStatuses = [5, 6, 11, 12, 15];
                setOrders(response.data.filter(o => !hiddenStatuses.includes(o.status_id)));
        } catch (e) { message.error('Ошибка'); }
        finally { setLoading(false); }
        }, [selectedDate, filterStatus, filterBranch, filterCity, filterRegion, filterDepartment]);

        const refreshAll = useCallback(() => { fetchOrders(); fetchCalendar(); }, [fetchOrders, fetchCalendar]);

        useEffect(() => {
                api.get('/order-statuses/').then(r => setStatuses(r.data)).catch(() => {});
                api.get('/reject-reasons/').then(r => setRejectReasons(r.data)).catch(() => {});
                api.get('/cancel-reasons/').then(r => setCancelReasons(r.data)).catch(() => {});
                api.get('/departments/').then(r => setAllDepartments(r.data)).catch(() => {});
                api.get('/regions/').then(r => setAllRegions(r.data)).catch(() => {});
                api.get('/cities/').then(r => setAllCities(r.data)).catch(() => {});
                api.get('/branches/').then(r => setAllBranches(r.data)).catch(() => {});
                fetchCalendar();
                fetchOrders();
                fetchMasters();
        }, []);

        useEffect(() => { fetchOrders(); }, [fetchOrders]);

        useEffect(() => {
                const interval = setInterval(() => { fetchOrders(); fetchCalendar(); }, 5000);
                return () => clearInterval(interval);
        }, [fetchOrders, fetchCalendar]);

        const handleDepartmentChange = (v) => {
                setFilterDepartment(v);
                setFilterRegion(null);
                setFilterCity(null);
                setFilterBranch(null);
        };

        const handleRegionChange = (v) => {
                setFilterRegion(v);
                setFilterCity(null);
                setFilterBranch(null);
        };

        const handleCityChange = (v) => {
                setFilterCity(v);
                setFilterBranch(null);
        };

        const openDetail = async (order) => {
                try {
                        const response = await api.get(`/orders/${order.id}`);
                        setSelectedOrder(response.data);
                        setWorkComment(response.data.description_work || '');
                        setDetailOpen(true);
                        fetchPhotos(order.id);
                } catch (e) { console.error(e); }
        };

        const fetchMasters = async () => {
        try {
                const response = await api.get('/users/available', { params: { date: selectedDate } });
                const mastersList = response.data;
                for (const m of mastersList) {
                m.master_technics = (m.technic_ids || []).map(tid => ({ technic_id: tid }));
                }
                setMasters(mastersList);
        } catch (e) { console.error('Ошибка загрузки мастеров:', e); }
        };

        const fetchPhotos = async (orderId) => {
                try { const r = await api.get(`/orders/${orderId}/photos`); setPhotos(r.data); } catch (e) {}
        };

        const fetchCommentsHistory = async (orderId) => {
                try { const r = await api.get(`/orders/${orderId}/comments`); setCommentsHistory(r.data); setHistoryOpen(true); } catch (e) {}
        };

        const handleAssignFromTable = async (orderId, masterId) => {
                try { await api.put(`/orders/${orderId}/assign`, null, { params: { master_id: masterId } }); message.success('Мастер назначен'); refreshAll(); } catch (e) { message.error('Ошибка'); }
        };

        const handleStatus = async (id, statusId) => {
                try { await api.put(`/orders/${id}/status`, null, { params: { status_id: statusId } }); message.success('Статус обновлён'); setDetailOpen(false); refreshAll(); } catch (e) { message.error('Ошибка'); }
        };

        const handlePrepaidSubmit = async () => {
                if (!pendingOrderId) return;
                try {
                        const sdDate = document.getElementById('sd-date')?.value || dayjs().format('YYYY-MM-DD');
                        await api.put(`/orders/${pendingOrderId}/prices`, null, { params: { price_prepaid: prepaidAmount || 0 } });
                        await api.put(`/orders/${pendingOrderId}/status`, null, { params: { status_id: 4 } });
                        message.success('СД'); setPrepaidModalOpen(false); setPrepaidAmount(null); setPendingOrderId(null); setDetailOpen(false); refreshAll();
                } catch (e) { message.error('Ошибка'); }
        };

        const handlePricesSubmit = async () => {
                const total = pricesTotal || 0; const parts = pricesParts || 0;
                try {
                        await api.put(`/orders/${pendingOrderId}/prices`, null, { params: { price_total: total, price_parts: parts, price_remainder: total - (prepaidAmount || 0), price_net: total - parts } });
                        await api.put(`/orders/${pendingOrderId}/status`, null, { params: { status_id: 5 } });
                        message.success('Выполнена'); setPricesModalOpen(false); setDetailOpen(false); refreshAll();
                } catch (e) { message.error('Ошибка'); }
        };

        const handleCancelRequest = async () => {
                if (!cancelReason) return;
                try { await api.put(`/orders/${pendingOrderId}/request-cancel`, null, { params: { reason: cancelReason } }); message.success('Отмена запрошена'); setCancelModalOpen(false); setCancelReason(''); refreshAll(); } catch (e) { message.error('Ошибка'); }
        };

        const handleReschedule = async () => {
                if (!rescheduleDate || !selectedOrder) return;
                try { await api.put(`/orders/${selectedOrder.id}/reschedule`, null, { params: { scheduled_time: dayjs(rescheduleDate).format('YYYY-MM-DD HH:mm') } }); message.success('Дата изменена'); setRescheduleOpen(false); setDetailOpen(false); refreshAll(); } catch (e) { message.error('Ошибка'); }
        };

        const handleSaveComment = async () => {
                try { await api.put(`/orders/${selectedOrder.id}/comment`, null, { params: { description_work: workComment } }); message.success('Сохранено'); setSelectedOrder(o => ({ ...o, description_work: workComment })); } catch (e) { message.error('Ошибка'); }
        };

        const handleReject = async () => {
                if (!rejectReason || !pendingOrderId) return;
                try { await api.put(`/orders/${pendingOrderId}/status`, null, { params: { status_id: 6 } }); await api.put(`/orders/${pendingOrderId}/comment`, null, { params: { description_work: `[ОТКАЗ] ${rejectReason}` } }); message.success('Отказ'); setRejectModalOpen(false); setRejectReason(''); setPendingOrderId(null); refreshAll(); } catch (e) { message.error('Ошибка'); }
        };

        const handleCopy = () => {
                if (!selectedOrder) return;
                navigator.clipboard.writeText([`Заявка №${selectedOrder.id}`, `Клиент: ${selectedOrder.client?.name || '—'}`, `Телефон: ${selectedOrder.phone || '—'}`, `Адрес: ${selectedOrder.address || '—'}`, `Тип: ${selectedOrder.technic_type?.name || '—'}`, `Дата: ${selectedOrder.scheduled_time ? dayjs(selectedOrder.scheduled_time).format('DD.MM.YYYY HH:mm') : '—'}`, `Мастер: ${selectedOrder.master ? selectedOrder.master.first_name + ' ' + selectedOrder.master.last_name : '—'}`].join('\n')).then(() => message.success('Скопировано'));
        };

        const columns = [
                { title: '№', dataIndex: 'id', key: 'id', width: 60 },
                { title: 'Время', key: 'time', width: 80, render: (_, r) => r.scheduled_time ? dayjs(r.scheduled_time).format('HH:mm') : '—' },
                { title: 'Клиент', key: 'client', render: (_, r) => (<span>{r.client?.name || '—'}{r.client?.blacklisted && <Tag color="red" style={{ marginLeft: 4 }}>ЧС</Tag>}</span>) },
                { title: 'Телефон', key: 'phone', render: (_, r) => r.phone || '—' },
                { title: 'Адрес', key: 'address', render: (_, r) => r.address || '—' },
                { title: 'Тип', key: 'technic', render: (_, r) => r.technic_type?.code || '—', width: 60 },
                { title: 'Мастер', key: 'master', width: 180,
                        render: (_, r) => (
                                <Select size="small" placeholder="Назначить" style={{ width: 160 }} value={r.master_id || undefined}
                                        onChange={(mid) => handleAssignFromTable(r.id, mid)}
                                        onClick={() => !masters.length && fetchMasters()}
                                        options={masters.filter(m => !r.technic_type_id || m.master_technics?.some(mt => mt.technic_id === r.technic_type_id)).map(m => ({ value: m.id, label: `${m.last_name} ${m.first_name}` }))} />
                        )
                },
                { title: 'Статус', key: 'status', width: 150, render: (_, r) => r.status ? <Tag style={{ background: r.status.color || '#6B7280', color: r.status.text_color || '#fff', fontWeight: 'bold', fontSize: 14, padding: '4px 12px', border: 'none' }}>{r.status.name}</Tag> : '—' },
                { title: 'Фактор', key: 'source', width: 100, render: (_, r) => (!r.source || r.source === 'обычная') ? null : <Tag>{r.source}</Tag> },
                { title: 'Действия', key: 'actions', width: 340, align: 'right',
                        render: (_, r) => (
                                <Space>
                                        {r.status?.id === 1 && r.master_id && <Button size="small" type="primary" onClick={() => handleStatus(r.id, 2)}>Принять</Button>}
                                        {r.status?.id === 2 && <Button size="small" type="primary" onClick={() => handleStatus(r.id, 3)}>В работе</Button>}
                                        {r.status?.id === 3 && <Button size="small" type="primary" onClick={() => handleStatus(r.id, 13)}>Вышел</Button>}
                                        {r.status?.id === 13 && (<><Button size="small" onClick={() => { setPendingOrderId(r.id); setPrepaidAmount(null); setPrepaidModalOpen(true); }}>СД</Button><Button size="small" type="primary" onClick={() => { setPendingOrderId(r.id); setPricesTotal(r.price_total || null); setPricesParts(r.price_parts || null); setPrepaidAmount(r.price_prepaid || 0); setPricesModalOpen(true); }}>Выполнил</Button><Button size="small" danger onClick={() => { setPendingOrderId(r.id); setRejectModalOpen(true); }}>Отказ</Button><Button size="small" danger onClick={() => { setPendingOrderId(r.id); setCancelModalOpen(true); }}>Отмена</Button></>)}
                                        {r.status?.id === 4 && <Button size="small" type="primary" onClick={() => { setPendingOrderId(r.id); setPricesTotal(r.price_total || null); setPricesParts(r.price_parts || null); setPrepaidAmount(r.price_prepaid || 0); setPricesModalOpen(true); }}>Выполнил</Button>}
                                        <Button size="small" type="link" onClick={() => openDetail(r)}>Открыть</Button>
                                        <VlozheniaButton onClick={() => { setSelectedClientId(r.client_id); setClientCardOpen(true); }} />
                                </Space>
                        ),
                },
        ];

        const borderColor = isDark ? '#303030' : '#e8e8e8'; const headerBg = isDark ? '#1f1f1f' : '#f5f5f5'; const headerColor = isDark ? '#bbb' : '#555';
        const rowBg = isDark ? '#141414' : '#fafafa'; const cellBg = isDark ? '#1a1a1a' : '#fff'; const selectedBg = isDark ? '#333' : '#e8e8e8';
        const todayBg = isDark ? '#222' : '#f0f0f0'; const todayColor = isDark ? '#ddd' : '#333'; const countColor = isDark ? '#91caff' : '#333';
        const zeroColor = isDark ? '#444' : '#bbb'; const textColor = isDark ? '#bbb' : '#555';
        const daysInMonth = currentMonth.daysInMonth();

        return (
                <>
                        <Card title="📅 Назначенные" extra={<Button icon={<ReloadOutlined />} onClick={refreshAll}>Обновить</Button>}>
                                <div style={{ marginBottom: 16, overflowX: 'auto' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: 4, color: textColor }}>{currentMonth.format('MMMM YYYY')}</div>
                                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, borderRadius: 6, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
                                                <thead><tr><th style={{ padding: '6px 8px', background: headerBg, color: headerColor, textAlign: 'center', fontWeight: 600, borderBottom: `1px solid ${borderColor}` }}>День</th>
                                                {Array.from({ length: daysInMonth }).map((_, i) => { const day = i + 1; const ds = currentMonth.format('YYYY-MM-') + String(day).padStart(2, '0'); const isToday = ds === dayjs().format('YYYY-MM-DD'); const isSel = ds === selectedDate; return <th key={day} onClick={() => setSelectedDate(ds)} style={{ padding: '6px 4px', background: isSel ? selectedBg : isToday ? todayBg : rowBg, color: isToday ? todayColor : headerColor, cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: isToday ? 600 : 400, borderBottom: `1px solid ${borderColor}`, borderLeft: `1px solid ${borderColor}` }}>{day}</th>; })}
                                                </tr></thead>
                                                <tbody><tr><td style={{ padding: '6px 8px', fontWeight: 600, background: rowBg, textAlign: 'center', color: textColor }}>Заявок</td>
                                                {Array.from({ length: daysInMonth }).map((_, i) => { const day = i + 1; const ds = currentMonth.format('YYYY-MM-') + String(day).padStart(2, '0'); const count = calendar[ds] || 0; const isSel = ds === selectedDate; return <td key={day} onClick={() => setSelectedDate(ds)} style={{ padding: '6px 4px', cursor: 'pointer', textAlign: 'center', background: isSel ? selectedBg : cellBg, fontWeight: count > 0 ? 600 : 400, color: count > 0 ? countColor : zeroColor, borderLeft: `1px solid ${borderColor}` }}>{count || '—'}</td>; })}
                                                </tr></tbody>
                                        </table>
                                </div>

                                <Space style={{ marginBottom: 16 }} wrap>
                                        <Select placeholder="Направление" allowClear style={{ width: 150 }} value={filterDepartment} onChange={handleDepartmentChange} options={departmentOptions} />
                                        <Select placeholder="Регион" allowClear style={{ width: 150 }} value={filterRegion} onChange={handleRegionChange} options={regionOptions} />
                                        <Select placeholder="Город" allowClear style={{ width: 150 }} value={filterCity} onChange={handleCityChange} options={cityOptions} />
                                        <Select placeholder="Филиал" allowClear style={{ width: 150 }} value={filterBranch} onChange={setFilterBranch} options={branchOptions} />
                                        <Select placeholder="Все статусы" allowClear style={{ width: 160 }} onChange={setFilterStatus} options={statuses.filter(s => [1, 2, 3, 13, 4, 5, 6].includes(s.id)).map(s => ({ value: s.id, label: s.name }))} />
                                </Space>

                                <Table columns={columns} dataSource={orders} rowKey="id" loading={loading} size="small" scroll={{ x: 1300 }} />
                        </Card>

                        <OrderDetailModal open={detailOpen} onClose={() => setDetailOpen(false)} order={selectedOrder} workComment={workComment} onCommentChange={(e) => setWorkComment(e.target.value)} onSaveComment={handleSaveComment} onReschedule={() => { setRescheduleDate(selectedOrder?.scheduled_time ? dayjs(selectedOrder.scheduled_time) : dayjs()); setRescheduleOpen(true); }} onCopy={handleCopy} onHistoryClick={() => selectedOrder && fetchCommentsHistory(selectedOrder.id)} onOrderUpdate={refreshAll} photosSection={selectedOrder && <PhotoUploader entityType="order" entityId={selectedOrder.id} photos={photos} onPhotosChange={setPhotos} />} />

                        <CommentsHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} comments={commentsHistory} />
                        <Modal title="СД" open={prepaidModalOpen} onCancel={() => setPrepaidModalOpen(false)} onOk={handlePrepaidSubmit} okText="Перевести в СД" width={400}><p>Сумма предоплаты:</p><InputNumber style={{ width: '100%', marginBottom: 16 }} suffix="₽" value={prepaidAmount} onChange={setPrepaidAmount} /><p>Дата закрытия СД:</p><DatePicker id="sd-date" defaultValue={dayjs()} style={{ width: '100%' }} format="YYYY-MM-DD" /></Modal>
                        <Modal title="Закрытие заявки" open={pricesModalOpen} onCancel={() => setPricesModalOpen(false)} onOk={handlePricesSubmit} okText="ОК" width={400}><p>Предоплата: <strong>{prepaidAmount || 0} ₽</strong></p><p>Общая сумма:</p><InputNumber style={{ width: '100%' }} suffix="₽" value={pricesTotal} onChange={setPricesTotal} /><p>Запчасти:</p><InputNumber style={{ width: '100%' }} suffix="₽" value={pricesParts} onChange={setPricesParts} /><p>Остаток: <strong>{(pricesTotal || 0) - (prepaidAmount || 0)} ₽</strong></p><p>Чистая: <strong>{(pricesTotal || 0) - (pricesParts || 0)} ₽</strong></p></Modal>
                        <Modal title="Причина отмены" open={cancelModalOpen} onCancel={() => setCancelModalOpen(false)} onOk={handleCancelRequest} okText="Отменить"><Select value={cancelReason} onChange={setCancelReason} style={{ width: '100%', marginBottom: 12 }} placeholder="Выберите причину" options={cancelReasons.map(r => ({ value: r.name, label: r.name }))} /><Input.TextArea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Или введите свою причину..." rows={3} /></Modal>
                        <Modal title="Изменить дату" open={rescheduleOpen} onCancel={() => setRescheduleOpen(false)} onOk={handleReschedule} okText="Сохранить"><DatePicker showTime format="YYYY-MM-DD HH:mm" value={rescheduleDate} onChange={setRescheduleDate} style={{ width: '100%' }} /></Modal>
                        <Modal title="Причина отказа" open={rejectModalOpen} onCancel={() => setRejectModalOpen(false)} onOk={handleReject} okText="Отказать"><Select value={rejectReason} onChange={setRejectReason} style={{ width: '100%', marginBottom: 12 }} placeholder="Выберите причину" options={rejectReasons.map(r => ({ value: r.name, label: r.name }))} /><Input.TextArea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Или введите свою причину..." rows={2} /></Modal>
                        <ClientCardModal clientId={selectedClientId} open={clientCardOpen} onClose={() => setClientCardOpen(false)} />
                </>
        );
}

export default AssignedOrders;