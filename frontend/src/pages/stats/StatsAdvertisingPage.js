import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, message, Space, Tree, Row, Col, Tag, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, LeftOutlined, RightOutlined, CopyOutlined, LockOutlined, ClearOutlined } from '@ant-design/icons';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../services/api';
import dayjs from 'dayjs';

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

function StatsAdvertisingPage() {
        const [tree, setTree] = useState([]);
        const [selectedCategory, setSelectedCategory] = useState(null);
        const [expenses, setExpenses] = useState([]);
        const [orders, setOrders] = useState([]);
        const [loading, setLoading] = useState(false);
        const [categoryModalOpen, setCategoryModalOpen] = useState(false);
        const [editingCategory, setEditingCategory] = useState(null);
        const [parentId, setParentId] = useState(null);
        const [categoryForm] = Form.useForm();
        const [expenseModalOpen, setExpenseModalOpen] = useState(false);
        const [editingExpense, setEditingExpense] = useState(null);
        const [expenseForm] = Form.useForm();
        const [budgets, setBudgets] = useState([]);
        const [activeTab, setActiveTab] = useState('expenses');
        const [budgetModalOpen, setBudgetModalOpen] = useState(false);
        const [budgetForm] = Form.useForm();

        const [currentMonth, setCurrentMonth] = useState(dayjs().format('YYYY-MM'));
        const isCurrentMonth = currentMonth === dayjs().format('YYYY-MM');
        const isPastMonth = dayjs(currentMonth + '-01').isBefore(dayjs(), 'month');
        const canEdit = isCurrentMonth || (!isPastMonth && !isCurrentMonth);

        const getAllChildrenIds = (node, includeSelf = true) => {
                let ids = includeSelf ? [node.id] : [];
                if (node.children) {
                        node.children.forEach(child => {
                                ids = ids.concat(getAllChildrenIds(child, true));
                        });
                }
                return ids;
        };

        const getCategoryIds = () => {
                if (!selectedCategory) return null;
                const node = findNodeById(tree, selectedCategory);
                if (!node) return [selectedCategory];
                return getAllChildrenIds(node, true);
        };

        const fetchTree = async () => {
                try {
                        const res = await api.get('/advertising-categories/tree', { params: { month_year: currentMonth } });
                        setTree(res.data || []);
                } catch (e) { console.error(e); }
        };

        const fetchExpenses = async () => {
                setLoading(true);
                try {
                        const [year, month] = currentMonth.split('-');
                        const dateFrom = `${year}-${month}-01`;
                        const dateTo = dayjs(dateFrom).endOf('month').format('YYYY-MM-DD');
                        const params = { date_from: dateFrom, date_to: dateTo };
                        const categoryIds = getCategoryIds();
                        if (categoryIds) {
                                const allExpenses = [];
                                for (const cid of categoryIds) {
                                        const res = await api.get('/advertising/', { params: { ...params, category_id: cid } });
                                        allExpenses.push(...(res.data || []));
                                }
                                setExpenses(allExpenses);
                        } else {
                                const res = await api.get('/advertising/', { params });
                                setExpenses(res.data || []);
                        }
                } catch (e) { console.error(e); }
                finally { setLoading(false); }
        };

        const fetchOrders = async () => {
                setLoading(true);
                try {
                        const categoryIds = getCategoryIds();
                        if (categoryIds) {
                                const allOrders = [];
                                for (const cid of categoryIds) {
                                        const res = await api.get('/orders/', { params: { advertising_category_id: cid, limit: 200 } });
                                        allOrders.push(...(res.data || []));
                                }
                                setOrders(allOrders);
                        } else {
                                const allOrders = [];
                                const allCatIds = tree.flatMap(n => getAllChildrenIds(n, true));
                                for (const cid of allCatIds) {
                                        const res = await api.get('/orders/', { params: { advertising_category_id: cid, limit: 200 } });
                                        allOrders.push(...(res.data || []));
                                }
                                setOrders(allOrders);
                        }
                } catch (e) { console.error(e); }
                finally { setLoading(false); }
        };

        const fetchBudgets = async () => {
                const [year, month] = currentMonth.split('-');
                try {
                        const res = await api.get('/advertising-budgets/', { params: { year: parseInt(year), month: parseInt(month) } });
                        setBudgets(res.data || []);
                } catch (e) { console.error(e); }
        };

        useEffect(() => {
                fetchTree();
                fetchBudgets();
        }, [currentMonth]);

        useEffect(() => {
                fetchExpenses();
                fetchOrders();
        }, [selectedCategory, currentMonth, tree]);

        const changeMonth = (delta) => {
                const m = dayjs(currentMonth + '-01').add(delta, 'month');
                setCurrentMonth(m.format('YYYY-MM'));
                setSelectedCategory(null);
                setActiveTab('expenses');
        };

        const handleCopyPreviousMonth = async () => {
                const prevMonth = dayjs(currentMonth + '-01').subtract(1, 'month').format('YYYY-MM');
                try {
                        await api.post('/advertising-categories/copy-month', null, { params: { from_month: prevMonth, to_month: currentMonth } });
                        message.success('Категории скопированы');
                        await fetchTree();
                        await fetchBudgets();
                } catch (e) {
                        message.error(e.response?.data?.detail || 'Нет данных за предыдущий месяц');
                }
        };

        const handleClearMonth = async () => {
                Modal.confirm({
                        title: 'Очистить месяц?', content: 'Все категории и расходы за этот месяц будут удалены.',
                        okText: 'Удалить', cancelText: 'Отмена', okType: 'danger',
                        onOk: async () => {
                                for (const node of [...tree]) {
                                        try { await api.delete(`/advertising-categories/${node.id}`); } catch (e) {}
                                }
                                message.success('Месяц очищен');
                                await fetchTree(); await fetchBudgets();
                        },
                });
        };

        const findNodeById = (nodes, id) => {
                for (const n of nodes) {
                        if (n.id === id) return n;
                        if (n.children) { const found = findNodeById(n.children, id); if (found) return found; }
                }
                return null;
        };

        const currentBudget = budgets.length > 0 ? budgets[0] : null;
        const totalBudgetAmount = parseFloat(currentBudget?.amount || 0);

        const getBudgetInfo = (pId, editId) => {
                if (!pId) {
                        const roots = tree.filter(n => !n.parent_id);
                        const rootsBudget = roots.filter(n => n.id !== editId).reduce((s, n) => s + parseFloat(n.monthly_budget || 0), 0);
                        const editNode = editId ? findNodeById(tree, editId) : null;
                        const editingBudget = editNode ? parseFloat(editNode.monthly_budget || 0) : 0;
                        const max = totalBudgetAmount - rootsBudget;
                        return { parentBudget: totalBudgetAmount, childrenBudget: rootsBudget, max, editingBudget, isRoot: true };
                }
                const parentNode = findNodeById(tree, pId);
                if (!parentNode) return { parentBudget: Infinity, childrenBudget: 0, max: Infinity, editingBudget: 0, isRoot: false };
                const parentBudget = parseFloat(parentNode.monthly_budget || 0);
                const siblings = (parentNode.children || []).filter(c => c.id !== editId);
                const siblingsBudget = siblings.reduce((s, c) => s + parseFloat(c.monthly_budget || 0), 0);
                const editNode = editId ? findNodeById(tree, editId) : null;
                const editingBudget = editNode ? parseFloat(editNode.monthly_budget || 0) : 0;
                const max = parentBudget - siblingsBudget;
                return { parentBudget, childrenBudget: siblingsBudget, max, editingBudget, isRoot: false };
        };

        const [budgetInfo, setBudgetInfo] = useState({ parentBudget: Infinity, childrenBudget: 0, max: Infinity, editingBudget: 0, isRoot: false });

        const handleOpenCategoryModal = (pId = null, editNode = null) => {
                if (!canEdit) return;
                setParentId(pId);
                setEditingCategory(editNode ? editNode.id : null);
                const info = getBudgetInfo(pId, editNode?.id);
                setBudgetInfo(info);
                if (editNode) {
                        categoryForm.setFieldsValue({ name: editNode.name, monthly_budget: editNode.monthly_budget, description: editNode.description, show_in_order: editNode.show_in_order });
                } else {
                        categoryForm.resetFields();
                        categoryForm.setFieldsValue({ show_in_order: true });
                }
                setCategoryModalOpen(true);
        };

        const handleCategorySubmit = async (values) => {
                try {
                        const data = { name: values.name, monthly_budget: values.monthly_budget != null ? parseFloat(values.monthly_budget) : null, description: values.description || null, show_in_order: values.show_in_order, parent_id: parentId, month_year: currentMonth };
                        if (!data.name) { message.error('Название обязательно'); return; }
                        if (data.show_in_order === undefined) { message.error('Укажите видимость'); return; }
                        const budget = data.monthly_budget || 0;
                        if (budgetInfo.max !== Infinity && budget > budgetInfo.max) {
                                message.error(`Превышает доступный бюджет. Максимум: ${budgetInfo.max.toLocaleString()} ₽`);
                                return;
                        }
                        if (editingCategory) { await api.put(`/advertising-categories/${editingCategory}`, data); message.success('Обновлено'); }
                        else { await api.post('/advertising-categories/', data); message.success('Создано'); }
                        setCategoryModalOpen(false); setEditingCategory(null); setParentId(null);
                        categoryForm.resetFields();
                        await fetchTree();
                        fetchExpenses(); fetchOrders();
                } catch (e) { message.error('Ошибка'); }
        };

        const handleBudgetSubmit = async (values) => {
                if (!canEdit) return;
                try {
                        const [year, month] = currentMonth.split('-');
                        let budget = budgets.length > 0 ? budgets[0] : null;
                        if (budget) { await api.put(`/advertising-budgets/${budget.id}`, values); }
                        else { await api.post('/advertising-budgets/', { year: parseInt(year), month: parseInt(month), amount: values.amount }); }
                        message.success('Бюджет сохранён');
                        setBudgetModalOpen(false);
                        await fetchBudgets();
                } catch (e) { message.error('Ошибка'); }
        };

        const handleExpenseSubmit = async (values) => {
                if (!canEdit) return;
                try {
                        const data = { ...values, category_id: selectedCategory, period_start: values.period_start?.format('YYYY-MM-DD'), period_end: values.period_end?.format('YYYY-MM-DD') };
                        if (editingExpense) { await api.put(`/advertising/${editingExpense}`, data); message.success('Расход обновлён'); }
                        else { await api.post('/advertising/', data); message.success('Расход создан'); }
                        setExpenseModalOpen(false); setEditingExpense(null);
                        expenseForm.resetFields();
                        fetchExpenses();
                        await fetchBudgets();
                } catch (e) { message.error('Ошибка'); }
        };

        const handleDeleteCategory = async (id) => {
                if (!canEdit) return;
                try { await api.delete(`/advertising-categories/${id}`); message.success('Удалено'); await fetchTree(); }
                catch (e) { message.error(e.response?.data?.detail || 'Ошибка'); }
        };

        const handleDeleteExpense = async (id) => {
                if (!canEdit) return;
                try { await api.delete(`/advertising/${id}`); message.success('Удалено'); fetchExpenses(); }
                catch (e) { message.error('Ошибка'); }
        };

        const watchedBudget = Form.useWatch('monthly_budget', categoryForm);
        const currentInputBudget = parseFloat(watchedBudget || 0);
        const remaining = budgetInfo.max === Infinity ? Infinity : budgetInfo.max - currentInputBudget;
        const isOverBudget = budgetInfo.max !== Infinity && currentInputBudget > budgetInfo.max;

        const budgetAmount = totalBudgetAmount;
        const totalExpenses = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + parseFloat(e.amount || 0), 0);
        const pct = budgetAmount > 0 ? Math.round(totalExpenses / budgetAmount * 100) : 0;

        const ordersTotal = orders.length;
        const ordersCompleted = orders.filter(o => o.status_id === 5).length;
        const ordersCassa = orders.filter(o => o.status_id === 5).reduce((s, o) => s + parseFloat(o.price_net || 0), 0);
        const leadCost = ordersTotal > 0 ? Math.round(totalExpenses / ordersTotal) : 0;
        const profit = ordersCassa - totalExpenses;
        const roi = totalExpenses > 0 ? Math.round(ordersCassa / totalExpenses * 100) : 0;

        const expenseColumns = [
                { title: 'ID', dataIndex: 'id', width: 50 },
                { title: 'Период с', dataIndex: 'period_start', width: 110, render: (v) => v ? dayjs(v).format('DD.MM.YYYY') : '—' },
                { title: 'Период по', dataIndex: 'period_end', width: 110, render: (v) => v ? dayjs(v).format('DD.MM.YYYY') : '—' },
                { title: 'Сумма', dataIndex: 'amount', width: 100, render: (v) => `${v?.toLocaleString()} ₽` },
                { title: 'Статус', dataIndex: 'status', width: 120, render: (v) => { const colors = { planned: 'blue', paid: 'green', cancelled: 'red' }; const names = { planned: 'Запланирован', paid: 'Оплачен', cancelled: 'Отменён' }; return <Tag color={colors[v] || 'default'}>{names[v] || v}</Tag>; }},
                { title: 'Заметки', dataIndex: 'notes' },
                ...(canEdit ? [{ title: '', width: 80, render: (_, r) => (
                        <Space><Button size="small" icon={<EditOutlined />} onClick={() => { setEditingExpense(r.id); expenseForm.setFieldsValue({ ...r, period_start: r.period_start ? dayjs(r.period_start) : null, period_end: r.period_end ? dayjs(r.period_end) : null }); setExpenseModalOpen(true); }} /><Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteExpense(r.id)} /></Space>
                )}] : []),
        ];

        const orderColumns = [
                { title: '№', dataIndex: 'id', width: 60 },
                { title: 'Дата', key: 'date', width: 100, render: (_, r) => r.created_at ? dayjs(r.created_at).format('DD.MM HH:mm') : '—' },
                { title: 'Клиент', key: 'client', render: (_, r) => r.client?.name || '—' },
                { title: 'Телефон', key: 'phone', render: (_, r) => r.phone || '—' },
                { title: 'Адрес', key: 'address', render: (_, r) => r.address || '—' },
                { title: 'Тип', key: 'technic', width: 60, render: (_, r) => r.technic_type?.code || '—' },
                { title: 'Статус', key: 'status', width: 120, render: (_, r) => r.status ? <Tag style={{ background: r.status.color || '#6B7280', color: r.status.text_color || '#fff', fontWeight: 'bold', border: 'none' }}>{r.status.name}</Tag> : '—' },
                { title: 'Сумма', key: 'price', width: 80, render: (_, r) => r.price_total ? `${r.price_total} ₽` : '—' },
                { title: 'Чистая', key: 'net', width: 80, render: (_, r) => r.price_net ? `${r.price_net} ₽` : '—' },
        ];

        const dailyOrdersMap = {};
        orders.forEach(o => {
                const day = o.created_at ? dayjs(o.created_at).format('YYYY-MM-DD') : null;
                if (day) dailyOrdersMap[day] = (dailyOrdersMap[day] || 0) + 1;
        });
        const dailyOrdersData = Object.entries(dailyOrdersMap).sort(([a],[b]) => a.localeCompare(b)).map(([day, count]) => ({ day: day.slice(5), count }));

        const dailyCassaMap = {};
        orders.filter(o => o.status_id === 5).forEach(o => {
                const day = o.created_at ? dayjs(o.created_at).format('YYYY-MM-DD') : null;
                if (day) dailyCassaMap[day] = (dailyCassaMap[day] || 0) + parseFloat(o.price_net || 0);
        });
        const dailyCassaData = Object.entries(dailyCassaMap).sort(([a],[b]) => a.localeCompare(b)).map(([day, sum]) => ({ day: day.slice(5), sum }));

        const moneyPct = ordersTotal > 0 ? Math.round(ordersCompleted / ordersTotal * 1000) / 10 : 0;

        const renderTree = (nodes) => nodes.map(node => {
                const nodeBudget = parseFloat(node.monthly_budget || 0);
                const childrenSum = (node.children || []).reduce((s, c) => s + parseFloat(c.monthly_budget || 0), 0);
                const remainingBudget = nodeBudget - childrenSum;
                return {
                        title: (<span>
                                {node.name}
                                {(nodeBudget > 0 || (node.children && node.children.length > 0)) && (<span style={{ marginLeft: 8, fontSize: 12, color: remainingBudget < 0 ? '#f5222d' : '#52c41a' }}>{nodeBudget.toLocaleString()} ₽{node.children?.length > 0 && ` | свободно: ${remainingBudget.toLocaleString()} ₽`}</span>)}
                                {canEdit && (<>
                                        <Button size="small" type="link" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); handleOpenCategoryModal(node.id); }} />
                                        <Button size="small" type="link" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleOpenCategoryModal(node.parent_id || null, node); }} />
                                        <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); handleDeleteCategory(node.id); }} />
                                </>)}
                        </span>),
                        key: node.id,
                        children: node.children ? renderTree(node.children) : [],
                };
        });

        const monthDisplay = dayjs(currentMonth + '-01').format('MMMM YYYY');

        return (
                <Card title="📢 Реклама" extra={<Button icon={<ReloadOutlined />} onClick={() => { fetchTree(); fetchBudgets(); fetchExpenses(); fetchOrders(); }}>Обновить</Button>}>
                        <Row gutter={16} style={{ marginBottom: 16 }}>
                                <Col span={24}>
                                        <Card size="small">
                                                <Space>
                                                        <Button icon={<LeftOutlined />} onClick={() => changeMonth(-1)} />
                                                        <span style={{ fontSize: 18, fontWeight: 'bold' }}>{monthDisplay}</span>
                                                        <Button icon={<RightOutlined />} onClick={() => changeMonth(1)} />
                                                        {!canEdit && <Tag icon={<LockOutlined />} color="orange">Просмотр</Tag>}
                                                        {canEdit && tree.length === 0 && (<Button icon={<CopyOutlined />} onClick={handleCopyPreviousMonth} size="small">Копировать из прошлого месяца</Button>)}
                                                        {canEdit && tree.length > 0 && (<Button icon={<ClearOutlined />} danger size="small" onClick={handleClearMonth}>Очистить месяц</Button>)}
                                                </Space>
                                        </Card>
                                </Col>
                        </Row>

                        <Row gutter={16} style={{ marginBottom: 16 }}>
                                <Col span={6}><Card size="small" title="💰 Общий бюджет" extra={canEdit && <Button size="small" type="link" onClick={() => { budgetForm.setFieldsValue({ amount: budgetAmount }); setBudgetModalOpen(true); }}>✏️</Button>}><div style={{ fontSize: 20, fontWeight: 'bold' }}>{budgetAmount.toLocaleString()} ₽</div></Card></Col>
                                <Col span={6}><Card size="small" title="💸 Расходы"><div style={{ fontSize: 20, fontWeight: 'bold' }}>{totalExpenses.toLocaleString()} ₽</div></Card></Col>
                                <Col span={6}><Card size="small" title="📊 Освоение"><div style={{ fontSize: 20, fontWeight: 'bold', color: pct > 80 ? '#f5222d' : '#52c41a' }}>{pct}%</div></Card></Col>
                                <Col span={6}><Card size="small" title="Остаток"><div style={{ fontSize: 20, fontWeight: 'bold' }}>{(budgetAmount - totalExpenses).toLocaleString()} ₽</div></Card></Col>
                        </Row>

                        <Row gutter={16}>
                                <Col span={8}>
                                        <Card size="small" title="📂 Категории" extra={canEdit && <Button size="small" icon={<PlusOutlined />} onClick={() => handleOpenCategoryModal()}>Добавить</Button>}>
                                                {tree.length > 0 ? <Tree treeData={renderTree(tree)} onSelect={(keys) => setSelectedCategory(keys[0])} /> : <p>Нет категорий</p>}
                                        </Card>
                                </Col>
                                <Col span={16}>
                                        <Card size="small" extra={selectedCategory && canEdit && activeTab === 'expenses' && <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingExpense(null); expenseForm.resetFields(); setExpenseModalOpen(true); }}>Добавить расход</Button>}>
                                                <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
                                                        { key: 'expenses', label: '💸 Расходы', children: <Table columns={expenseColumns} dataSource={expenses} rowKey="id" loading={loading} size="small" pagination={false} /> },
                                                        { key: 'orders', label: '📋 Заявки', children: (
                                                                <div>
                                                                        <Row gutter={16} style={{ marginBottom: 12 }}>
                                                                                <Col span={4}><Card size="small"><div style={{ fontSize: 11, color: '#888' }}>Всего</div><div style={{ fontSize: 16, fontWeight: 'bold' }}>{ordersTotal}</div></Card></Col>
                                                                                <Col span={4}><Card size="small"><div style={{ fontSize: 11, color: '#888' }}>Выполнено</div><div style={{ fontSize: 16, fontWeight: 'bold', color: '#52c41a' }}>{ordersCompleted}</div></Card></Col>
                                                                                <Col span={5}><Card size="small"><div style={{ fontSize: 11, color: '#888' }}>Касса</div><div style={{ fontSize: 16, fontWeight: 'bold' }}>{ordersCassa.toLocaleString()} ₽</div></Card></Col>
                                                                                <Col span={5}><Card size="small"><div style={{ fontSize: 11, color: '#888' }}>Стоимость лида</div><div style={{ fontSize: 16, fontWeight: 'bold' }}>{leadCost.toLocaleString()} ₽</div></Card></Col>
                                                                                <Col span={6}><Card size="small"><div style={{ fontSize: 11, color: '#888' }}>Профит</div><div style={{ fontSize: 16, fontWeight: 'bold', color: profit >= 0 ? '#52c41a' : '#f5222d' }}>{profit.toLocaleString()} ₽</div></Card></Col>
                                                                        </Row>
                                                                        <Table columns={orderColumns} dataSource={orders} rowKey="id" loading={loading} size="small" pagination={false} scroll={{ x: 800 }} />
                                                                </div>
                                                        ) },
                                                        { key: 'summary', label: '📊 Общее', children: (
                                                                <div>
                                                                        <Row gutter={16} style={{ marginBottom: 16 }}>
                                                                                <Col span={4}><Card size="small"><div style={{ fontSize: 11, color: '#888' }}>Расходы</div><div style={{ fontSize: 16, fontWeight: 'bold' }}>{totalExpenses.toLocaleString()} ₽</div></Card></Col>
                                                                                <Col span={4}><Card size="small"><div style={{ fontSize: 11, color: '#888' }}>Заявки</div><div style={{ fontSize: 16, fontWeight: 'bold' }}>{ordersTotal}</div></Card></Col>
                                                                                <Col span={4}><Card size="small"><div style={{ fontSize: 11, color: '#888' }}>Касса</div><div style={{ fontSize: 16, fontWeight: 'bold' }}>{ordersCassa.toLocaleString()} ₽</div></Card></Col>
                                                                                <Col span={4}><Card size="small"><div style={{ fontSize: 11, color: '#888' }}>Стоимость лида</div><div style={{ fontSize: 16, fontWeight: 'bold' }}>{leadCost.toLocaleString()} ₽</div></Card></Col>
                                                                                <Col span={4}><Card size="small"><div style={{ fontSize: 11, color: '#888' }}>Профит</div><div style={{ fontSize: 16, fontWeight: 'bold', color: profit >= 0 ? '#52c41a' : '#f5222d' }}>{profit.toLocaleString()} ₽</div></Card></Col>
                                                                                <Col span={4}><Card size="small"><div style={{ fontSize: 11, color: '#888' }}>ROI</div><div style={{ fontSize: 16, fontWeight: 'bold', color: roi >= 100 ? '#52c41a' : '#f5222d' }}>{roi}%</div></Card></Col>
                                                                        </Row>
                                                                        <Row gutter={[16, 16]}>
                                                                                <Col span={12}><Card size="small" title="📉 Заявки по дням"><ResponsiveContainer width="100%" height={200}><LineChart data={dailyOrdersData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><ReTooltip /><Line type="monotone" dataKey="count" stroke="#1677ff" strokeWidth={2} dot={{ r: 3 }} name="Заявок" /></LineChart></ResponsiveContainer></Card></Col>
                                                                                <Col span={12}><Card size="small" title="💰 Касса по дням"><ResponsiveContainer width="100%" height={200}><LineChart data={dailyCassaData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}т`} /><ReTooltip formatter={(v) => `${v?.toLocaleString()} ₽`} /><Line type="monotone" dataKey="sum" stroke="#52c41a" strokeWidth={2} dot={{ r: 3 }} name="Касса" /></LineChart></ResponsiveContainer></Card></Col>
                                                                        </Row>
                                                                        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                                                                                <Col span={12}><Card size="small" title="📊 Процент в деньги"><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={[{ name: 'В деньги', value: moneyPct }, { name: 'Остальное', value: 100 - moneyPct }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={30} label={({ payload }) => payload.name === 'В деньги' ? `${moneyPct}%` : ''}><Cell fill="#52c41a" /><Cell fill="#f5222d" /></Pie><ReTooltip formatter={(v) => `${v}%`} /></PieChart></ResponsiveContainer></Card></Col>
                                                                                <Col span={12}><Card size="small" title="📈 ROI"><div style={{ textAlign: 'center', paddingTop: 40 }}><div style={{ fontSize: 48, fontWeight: 'bold', color: roi >= 100 ? '#52c41a' : '#f5222d' }}>{roi}%</div><div style={{ color: '#888', marginTop: 8 }}>Окупаемость инвестиций</div><div style={{ color: '#888', fontSize: 12 }}>Касса / Расходы × 100%</div></div></Card></Col>
                                                                        </Row>
                                                                </div>
                                                        ) },
                                                ]} />
                                        </Card>
                                </Col>
                        </Row>

                        {canEdit && (<>
                                <Modal title={editingCategory ? 'Редактировать категорию' : 'Новая категория'} open={categoryModalOpen} onCancel={() => setCategoryModalOpen(false)} onOk={() => categoryForm.submit()} okButtonProps={{ disabled: isOverBudget }}>
                                        <Form form={categoryForm} layout="vertical" onFinish={handleCategorySubmit}>
                                                <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Обязательно' }]}><Input /></Form.Item>
                                                <Form.Item name="monthly_budget" label="Месячный бюджет" getValueFromEvent={(value) => value} validateStatus={isOverBudget ? 'error' : ''} help={isOverBudget ? `Превышает на ${Math.abs(remaining).toLocaleString()} ₽` : ''}><InputNumber style={{ width: '100%' }} suffix="₽" status={isOverBudget ? 'error' : ''} /></Form.Item>
                                                {budgetInfo.max !== Infinity && (<div style={{ fontSize: 11, marginTop: -16, marginBottom: 16 }}>
                                                        <span style={{ color: '#888' }}>{budgetInfo.isRoot ? 'Общий бюджет' : 'Бюджет родителя'}: {budgetInfo.parentBudget.toLocaleString()} ₽</span>
                                                        <span style={{ marginLeft: 12, color: '#888' }}>Занято: {budgetInfo.childrenBudget.toLocaleString()} ₽</span>
                                                        {editingCategory && <span style={{ marginLeft: 12, color: '#888' }}>Текущий: {budgetInfo.editingBudget.toLocaleString()} ₽</span>}
                                                        <span style={{ marginLeft: 12, color: remaining < 0 ? '#f5222d' : '#52c41a', fontWeight: 'bold' }}>Остаток: {Math.max(0, remaining).toLocaleString()} ₽</span>
                                                </div>)}
                                                <Form.Item name="description" label="Описание"><Input.TextArea rows={4} placeholder="Логины, пароли, заметки..." /></Form.Item>
                                                <Form.Item name="show_in_order" label="Показывать оператору" rules={[{ required: true, message: 'Обязательно' }]}><Select options={[{ value: true, label: 'Да' }, { value: false, label: 'Нет' }]} /></Form.Item>
                                        </Form>
                                </Modal>
                                <Modal title="Общий бюджет на месяц" open={budgetModalOpen} onCancel={() => setBudgetModalOpen(false)} onOk={() => budgetForm.submit()}>
                                        <Form form={budgetForm} layout="vertical" onFinish={handleBudgetSubmit}>
                                                <Form.Item name="amount" label="Сумма" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} suffix="₽" min={0} /></Form.Item>
                                                <p style={{ color: '#888', fontSize: 12 }}>Месяц: {monthDisplay}</p>
                                        </Form>
                                </Modal>
                                <Modal title={editingExpense ? 'Редактировать расход' : 'Новый расход'} open={expenseModalOpen} onCancel={() => setExpenseModalOpen(false)} onOk={() => expenseForm.submit()}>
                                        <Form form={expenseForm} layout="vertical" onFinish={handleExpenseSubmit}>
                                                <Form.Item name="amount" label="Сумма" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} suffix="₽" /></Form.Item>
                                                <Form.Item name="period_start" label="Период с" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" /></Form.Item>
                                                <Form.Item name="period_end" label="Период по" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" /></Form.Item>
                                                <Form.Item name="status" label="Статус" initialValue="planned" rules={[{ required: true }]}><Select options={[{ value: 'planned', label: 'Запланирован' }, { value: 'paid', label: 'Оплачен' }, { value: 'cancelled', label: 'Отменён' }]} /></Form.Item>
                                                <Form.Item name="notes" label="Заметки"><Input.TextArea rows={2} /></Form.Item>
                                        </Form>
                                </Modal>
                        </>)}
                </Card>
        );
}

export default StatsAdvertisingPage;