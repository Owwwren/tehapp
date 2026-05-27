import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Button, Modal, Select, Input, InputNumber, message, Descriptions, Space } from 'antd';
import { ReloadOutlined, HistoryOutlined, PhoneOutlined, TeamOutlined } from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';
import ClientCardModal from '../../components/ClientCardModal';
import CommentsHistoryModal from '../../components/CommentsHistoryModal';

function OKKPage() {
        const [orders, setOrders] = useState([]);
        const [loading, setLoading] = useState(false);
        const [okkOpen, setOKKOpen] = useState(false);
        const [selectedOrder, setSelectedOrder] = useState(null);
        const [commentsHistory, setCommentsHistory] = useState([]);
        const [historyOpen, setHistoryOpen] = useState(false);

        const [okkContractLeft, setOKKContractLeft] = useState(null);
        const [okkTechWorks, setOKKTechWorks] = useState(null);
        const [okkWorksMatch, setOKKWorksMatch] = useState(null);
        const [okkMasterPhoneLeft, setOKKMasterPhoneLeft] = useState(null);
        const [okkClientAmount, setOKKClientAmount] = useState(null);
        const [okkWarrantyDays, setOKKWarrantyDays] = useState(14);
        const [okkSatisfied, setOKKSatisfied] = useState(null);
        const [okkComment, setOKKComment] = useState('');
        const [clientCardOpen, setClientCardOpen] = useState(false);
        const [selectedClientId, setSelectedClientId] = useState(null);

        const fetchOrders = async () => {
                setLoading(true);
                try {
                        const [res5, res6] = await Promise.all([
                                api.get('/orders/', { params: { status_id: 5 } }),
                                api.get('/orders/', { params: { status_id: 6 } }),
                        ]);
                        const all = [...res5.data, ...res6.data].filter(o => !o.okk_checked);
                        setOrders(all);
                } catch (e) { message.error('Ошибка загрузки'); }
                finally { setLoading(false); }
        };

        const refreshAll = () => { fetchOrders(); };

        useEffect(() => {
                fetchOrders();
                const interval = setInterval(() => fetchOrders(), 5000);
                return () => clearInterval(interval);
        }, []);

        const fetchCommentsHistory = async (orderId) => {
                try {
                        const response = await api.get(`/orders/${orderId}/comments`);
                        setCommentsHistory(response.data);
                        setHistoryOpen(true);
                } catch (e) { console.error('Ошибка загрузки истории:', e); }
        };

        const handleOKKSubmit = async () => {
                if (okkContractLeft === null) { message.error('Укажите, оставил ли мастер договор'); return; }
                if (!okkSatisfied) { message.error('Укажите, доволен ли клиент'); return; }
                if (!okkTechWorks) { message.error('Укажите, работает ли техника'); return; }
                if (!okkWorksMatch) { message.error('Укажите, совпадают ли работы'); return; }
                if (okkMasterPhoneLeft === null) { message.error('Укажите, оставил ли мастер свой номер'); return; }
                if (okkClientAmount === null) { message.error('Укажите сумму со слов клиента'); return; }
                if (okkWarrantyDays === null) { message.error('Укажите гарантию (дней)'); return; }
                if (!okkComment) { message.error('Введите комментарий'); return; }

                try {
                        await api.put(`/orders/${selectedOrder.id}/okk-check`, null, {
                                params: { okk_contract_left: okkContractLeft, okk_tech_works: okkTechWorks, okk_works_match: okkWorksMatch, okk_master_phone_left: okkMasterPhoneLeft, okk_client_amount: okkClientAmount, okk_warranty_days: okkWarrantyDays, okk_satisfied: okkSatisfied, comment: okkComment }
                        });
                        message.success('Проверка качества сохранена');
                        setOKKOpen(false);
                        refreshAll();
                } catch (e) { message.error('Ошибка'); }
        };

        const openOKK = (order) => {
                setSelectedOrder(order);
                setOKKContractLeft(null); setOKKTechWorks(null); setOKKWorksMatch(null);
                setOKKMasterPhoneLeft(null); setOKKClientAmount(null); setOKKWarrantyDays(14);
                setOKKSatisfied(null); setOKKComment(''); setOKKOpen(true);
        };

        const columns = [
                { title: '№', dataIndex: 'id', key: 'id', width: 60 },
                { title: 'Дата', key: 'date', width: 110, render: (_, r) => r.created_at ? dayjs(r.created_at).format('DD.MM HH:mm') : '—' },
                { title: 'Клиент', key: 'client', render: (_, r) => <span>{r.client?.name || '—'}{r.client?.blacklisted && <Tag color="red" style={{ marginLeft: 4 }}>ЧС</Tag>}</span> },
                { title: 'Телефон', key: 'phone', render: (_, r) => r.phone || '—' },
                { title: 'Адрес', key: 'address', render: (_, r) => r.address || '—' },
                { title: 'Мастер', key: 'master', render: (_, r) => r.master ? `${r.master.last_name} ${r.master.first_name}` : '—' },
                { title: 'Статус', key: 'status', width: 140, render: (_, r) => r.status ? (
                        <Tag style={{
                                background: r.status.color || '#6B7280',
                                color: r.status.text_color || '#fff',
                                fontWeight: 'bold',
                                fontSize: 15,
                                padding: '6px 16px',
                                border: 'none',
                                letterSpacing: 0.5,
                        }}>{r.status.name}</Tag>
                ) : '—' },
                { title: 'Сумма', key: 'price', width: 80, render: (_, r) => r.price_total ? `${r.price_total} ₽` : '—' },
                { title: 'Действия', key: 'actions', width: 120, render: (_, r) => <Button type="primary" size="small" onClick={() => openOKK(r)}>Проверить</Button> },
        ];

        return (
                <Card title="🔍 Проверка ОКК" extra={<Button icon={<ReloadOutlined />} onClick={fetchOrders}>Обновить</Button>}>
                        <Table columns={columns} dataSource={orders} rowKey="id" loading={loading} size="small" />

                        <Modal title="🔍 Проверка качества" open={okkOpen} onCancel={() => setOKKOpen(false)} onOk={handleOKKSubmit} okText="Сохранить" width={550}>
                                {selectedOrder && (<>
                                        <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
                                                <Descriptions.Item label="Клиент">{selectedOrder.client?.name}</Descriptions.Item>
                                                <Descriptions.Item label="Телефон"><a href={`tel:${selectedOrder.phone}`}><PhoneOutlined /> {selectedOrder.phone}</a></Descriptions.Item>
                                                <Descriptions.Item label="Мастер" span={2}>{selectedOrder.master ? `${selectedOrder.master.last_name} ${selectedOrder.master.first_name}` : '—'}</Descriptions.Item>
                                                <Descriptions.Item label="Сумма">{selectedOrder.price_total || '—'} ₽</Descriptions.Item>
                                                <Descriptions.Item label="Адрес">{selectedOrder.address}</Descriptions.Item>
                                        </Descriptions>
                                        <p>Оставил ли мастер договор?</p><Select value={okkContractLeft} onChange={setOKKContractLeft} style={{ width: '100%', marginBottom: 16 }}><Select.Option value={true}>Да</Select.Option><Select.Option value={false}>Нет</Select.Option></Select>
                                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                                                <div style={{ flex: 1 }}><p>Доволен ли клиент?</p><Select value={okkSatisfied} onChange={setOKKSatisfied} style={{ width: '100%' }}><Select.Option value="yes">Да, доволен</Select.Option><Select.Option value="partly">Частично</Select.Option><Select.Option value="no">Нет, недоволен</Select.Option><Select.Option value="negative">Негатив</Select.Option></Select></div>
                                                <div style={{ flex: 1 }}><p>Работает ли техника?</p><Select value={okkTechWorks} onChange={setOKKTechWorks} style={{ width: '100%' }}><Select.Option value="yes">Да</Select.Option><Select.Option value="partly">Частично</Select.Option><Select.Option value="no">Нет</Select.Option></Select></div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                                                <div style={{ flex: 1 }}><p>Совпадают ли работы?</p><Select value={okkWorksMatch} onChange={setOKKWorksMatch} style={{ width: '100%' }}><Select.Option value="yes">Да</Select.Option><Select.Option value="partly">Частично</Select.Option><Select.Option value="no">Нет</Select.Option></Select></div>
                                                <div style={{ flex: 1 }}><p>Сумма со слов клиента</p><InputNumber value={okkClientAmount} onChange={setOKKClientAmount} style={{ width: '100%' }} suffix="₽" /></div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                                                <div style={{ flex: 1 }}><p>Оставил ли мастер номер?</p><Select value={okkMasterPhoneLeft} onChange={setOKKMasterPhoneLeft} style={{ width: '100%' }}><Select.Option value={true}>Да</Select.Option><Select.Option value={false}>Нет</Select.Option></Select></div>
                                                <div style={{ flex: 1 }}><p>Гарантия (дней)</p><InputNumber value={okkWarrantyDays} onChange={setOKKWarrantyDays} style={{ width: '100%' }} min={0} /></div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <p style={{ margin: 0 }}>Комментарий</p>
                                                <Space><Button size="small" type="primary" icon={<TeamOutlined />} onClick={() => { setSelectedClientId(selectedOrder.client_id); setClientCardOpen(true); }} style={{ background: '#8B5CF6', borderColor: '#8B5CF6', borderRadius: 6 }} /><Button size="small" icon={<HistoryOutlined />} onClick={() => fetchCommentsHistory(selectedOrder.id)}>История</Button></Space>
                                        </div>
                                        <Input.TextArea value={okkComment} onChange={(e) => setOKKComment(e.target.value)} rows={3} />
                                </>)}
                        </Modal>

                        <CommentsHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} comments={commentsHistory} />
                        <ClientCardModal clientId={selectedClientId} open={clientCardOpen} onClose={() => setClientCardOpen(false)} />
                </Card>
        );
}

export default OKKPage;