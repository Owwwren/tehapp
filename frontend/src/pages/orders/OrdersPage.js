import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Tag, Button, Space, Select, Modal, Input, message, Tooltip } from 'antd';
import { PlusOutlined, ReloadOutlined, HistoryOutlined } from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';
import OrderForm from './OrderForm';
import AssignedOrders from './AssignedOrders';
import AllOrdersPage from './AllOrdersPage';
import { DatePicker } from 'antd';
import OKKPage from './OKKPage';
import ClientCardModal from '../../components/ClientCardModal';
import VlozheniaButton from '../../components/VlozheniaButton';
import CommentsHistoryModal from '../../components/CommentsHistoryModal';
import OrderDetailModal from '../../components/OrderDetailModal';
import PhotoUploader from '../../components/PhotoUploader';

function OrdersPage({ subPage }) {
        const [orders, setOrders] = useState([]);
        const [loading, setLoading] = useState(false);
        const [filterStatus, setFilterStatus] = useState(null);
        const [modalOpen, setModalOpen] = useState(false);
        const [detailOpen, setDetailOpen] = useState(false);
        const [selectedOrder, setSelectedOrder] = useState(null);

        const [workComment, setWorkComment] = useState('');
        const [photos, setPhotos] = useState([]);
        const [commentsHistory, setCommentsHistory] = useState([]);
        const [historyOpen, setHistoryOpen] = useState(false);
        const [previewPhoto, setPreviewPhoto] = useState(null);
        const [rescheduleOpen, setRescheduleOpen] = useState(false);
        const [rescheduleDate, setRescheduleDate] = useState(null);
        const [clientCardOpen, setClientCardOpen] = useState(false);
        const [selectedClientId, setSelectedClientId] = useState(null);
        const [statuses, setStatuses] = useState([]);

        // Фильтры
        const [allDepartments, setAllDepartments] = useState([]);
        const [allRegions, setAllRegions] = useState([]);
        const [allCities, setAllCities] = useState([]);
        const [allBranches, setAllBranches] = useState([]);
        const [filterDepartment, setFilterDepartment] = useState(null);
        const [filterRegion, setFilterRegion] = useState(null);
        const [filterCity, setFilterCity] = useState(null);
        const [filterBranch, setFilterBranch] = useState(null);

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

        const fetchOrders = useCallback(async () => {
                setLoading(true);
                try {
                        const params = {};
                        if (filterStatus) params.status_id = filterStatus;
                        if (filterBranch) params.branch_id = filterBranch;
                        if (filterCity && !filterBranch) params.city_id = filterCity;
                        if (filterRegion && !filterCity) params.region_id = filterRegion;
                        if (filterDepartment && !filterRegion) params.department_id = filterDepartment;
                        const response = await api.get('/orders/', { params });
                        setOrders(response.data);
                } catch (error) { message.error('Ошибка загрузки заявок'); }
                finally { setLoading(false); }
        }, [filterStatus, filterBranch, filterCity, filterRegion, filterDepartment]);

        const refreshAll = () => { fetchOrders(); };

        useEffect(() => {
                api.get('/order-statuses/').then(r => setStatuses(r.data)).catch(() => {});
                api.get('/departments/').then(r => setAllDepartments(r.data)).catch(() => {});
                api.get('/regions/').then(r => setAllRegions(r.data)).catch(() => {});
                api.get('/cities/').then(r => setAllCities(r.data)).catch(() => {});
                api.get('/branches/').then(r => setAllBranches(r.data)).catch(() => {});
        }, []);

        useEffect(() => { fetchOrders(); }, [fetchOrders]);

        useEffect(() => {
                const interval = setInterval(() => fetchOrders(), 5000);
                return () => clearInterval(interval);
        }, [fetchOrders]);

        const openDetail = async (order) => {
                try {
                        const response = await api.get(`/orders/${order.id}`);
                        const data = response.data;
                        setSelectedOrder(data);
                        setWorkComment(data.description_work || '');
                        setDetailOpen(true);
                        fetchPhotos(order.id);
                } catch (error) { console.error('Ошибка загрузки заявки:', error); }
        };

        const fetchPhotos = async (orderId) => {
                try { const r = await api.get(`/orders/${orderId}/photos`); setPhotos(r.data); } catch (e) {}
        };

        const fetchCommentsHistory = async (orderId) => {
                try { const r = await api.get(`/orders/${orderId}/comments`); setCommentsHistory(r.data); setHistoryOpen(true); } catch (e) {}
        };

        const handleReschedule = async () => {
                if (!rescheduleDate || !selectedOrder) return;
                try {
                        await api.put(`/orders/${selectedOrder.id}/reschedule`, null, { params: { scheduled_time: dayjs(rescheduleDate).format('YYYY-MM-DD HH:mm') } });
                        message.success('Дата изменена');
                        setRescheduleOpen(false); setDetailOpen(false); refreshAll();
                } catch (e) { message.error('Ошибка'); }
        };

        const handleSaveComment = async () => {
                try {
                        await api.put(`/orders/${selectedOrder.id}/comment`, null, { params: { description_work: workComment } });
                        message.success('Комментарий сохранён');
                        setSelectedOrder({ ...selectedOrder, description_work: workComment });
                } catch (e) { message.error('Ошибка сохранения комментария'); }
        };

        const handleCopy = () => {
                if (!selectedOrder) return;
                const text = [`Заявка №${selectedOrder.id}`, `Клиент: ${selectedOrder.client?.name || '—'}`, `Телефон: ${selectedOrder.phone || '—'}`, `Адрес: ${selectedOrder.address || '—'}`, `Тип: ${selectedOrder.technic_type?.name || '—'}`, `Описание: ${selectedOrder.description_original || '—'}`, `Дата: ${selectedOrder.scheduled_time ? dayjs(selectedOrder.scheduled_time).format('DD.MM.YYYY HH:mm') : '—'}`, `Мастер: ${selectedOrder.master ? selectedOrder.master.first_name + ' ' + selectedOrder.master.last_name : '—'}`].join('\n');
                navigator.clipboard.writeText(text).then(() => message.success('Скопировано'));
        };

        const handleDepartmentChange = (v) => { setFilterDepartment(v); setFilterRegion(null); setFilterCity(null); setFilterBranch(null); };
        const handleRegionChange = (v) => { setFilterRegion(v); setFilterCity(null); setFilterBranch(null); };
        const handleCityChange = (v) => { setFilterCity(v); setFilterBranch(null); };

        const columns = [
                { title: '№', dataIndex: 'id', key: 'id', width: 60 },
                { title: 'Дата', dataIndex: 'created_at', key: 'created_at', width: 110, render: (t) => t ? dayjs(t).format('DD.MM HH:mm') : '—' },
                { title: 'Клиент', key: 'client', render: (_, r) => (<span>{r.client?.name || '—'}{r.client?.blacklisted && <Tag color="red" style={{ marginLeft: 4 }}>ЧС</Tag>}</span>) },
                { title: 'Телефон', key: 'phone', render: (_, r) => r.phone || '—' },
                { title: 'Адрес', key: 'address', render: (_, r) => r.address || '—' },
                { title: 'Тип', key: 'technic', render: (_, r) => r.technic_type?.code || '—', width: 60 },
                { title: 'Мастер', key: 'master', render: (_, r) => r.master ? `${r.master.first_name} ${r.master.last_name}` : '—' },
                { title: 'Статус', dataIndex: 'status', key: 'status', width: 150,
                        render: (s) => s ? <Tag style={{ background: s.color || '#6B7280', color: s.text_color || '#fff', fontWeight: 'bold', fontSize: 15, padding: '6px 16px', border: 'none', letterSpacing: 0.5 }}>{s.name}</Tag> : '—'
                },
                { title: 'Фактор', key: 'source', width: 100, render: (_, r) => { if (!r.source || r.source === 'обычная') return null; return <Tag>{r.source}</Tag>; } },
                { title: 'Действия', key: 'actions', width: 180,
                        render: (_, r) => (<><Button size="small" type="link" onClick={() => openDetail(r)}>Открыть</Button><VlozheniaButton onClick={() => { setSelectedClientId(r.client_id); setClientCardOpen(true); }} /></>),
                },
        ];

        if (subPage === 'orders:assigned') return <AssignedOrders />;
        if (subPage === 'orders:all') return <AllOrdersPage />;
        if (subPage === 'orders:okk') return <OKKPage />;

        return (
                <Card title="📋 Заявки КЦ" extra={
                        <Space>
                                <Select placeholder="Статус" allowClear style={{ width: 160 }} onChange={setFilterStatus} options={statuses.map(s => ({ value: s.id, label: s.name }))} />
                                <Button icon={<ReloadOutlined />} onClick={fetchOrders}>Обновить</Button>
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Создать</Button>
                        </Space>
                }>
                        <Space style={{ marginBottom: 16 }} wrap>
                                <Select placeholder="Направление" allowClear style={{ width: 150 }} value={filterDepartment} onChange={handleDepartmentChange} options={departmentOptions} />
                                <Select placeholder="Регион" allowClear style={{ width: 150 }} value={filterRegion} onChange={handleRegionChange} options={regionOptions} />
                                <Select placeholder="Город" allowClear style={{ width: 150 }} value={filterCity} onChange={handleCityChange} options={cityOptions} />
                                <Select placeholder="Филиал" allowClear style={{ width: 150 }} value={filterBranch} onChange={setFilterBranch} options={branchOptions} />
                        </Space>

                        <Table columns={columns} dataSource={orders} rowKey="id" loading={loading} scroll={{ x: 1300 }} size="small" />
                        <OrderForm open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchOrders} />

                        <OrderDetailModal open={detailOpen} onClose={() => setDetailOpen(false)} order={selectedOrder} workComment={workComment} onCommentChange={(e) => setWorkComment(e.target.value)} onSaveComment={handleSaveComment} onReschedule={() => { setRescheduleDate(selectedOrder?.scheduled_time ? dayjs(selectedOrder.scheduled_time) : dayjs()); setRescheduleOpen(true); }} onCopy={handleCopy} onHistoryClick={() => selectedOrder && fetchCommentsHistory(selectedOrder.id)} onOrderUpdate={refreshAll} photosSection={selectedOrder && <PhotoUploader entityType="order" entityId={selectedOrder.id} photos={photos} onPhotosChange={setPhotos} />} />

                        <CommentsHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} comments={commentsHistory} />
                        <Modal open={!!previewPhoto} footer={null} onCancel={() => setPreviewPhoto(null)} width="fit-content" centered style={{ maxWidth: '90vw' }}>{previewPhoto && <img src={previewPhoto} alt="Фото" style={{ maxWidth: '85vw', maxHeight: '80vh' }} />}</Modal>
                        <Modal title="Изменить дату и время" open={rescheduleOpen} onCancel={() => setRescheduleOpen(false)} onOk={handleReschedule} okText="Сохранить"><DatePicker showTime format="YYYY-MM-DD HH:mm" value={rescheduleDate} onChange={setRescheduleDate} style={{ width: '100%' }} /></Modal>
                        <ClientCardModal clientId={selectedClientId} open={clientCardOpen} onClose={() => setClientCardOpen(false)} />
                </Card>
        );
}

export default OrdersPage;