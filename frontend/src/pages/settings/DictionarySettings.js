import React, { useState, useEffect, useRef } from 'react';
import { Card, Tabs, Table, Button, Modal, Form, Input, Select, message, Popconfirm, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../services/api';

function ColorPickerField({ form, fieldName }) {
        const [color, setColor] = useState(form.getFieldValue(fieldName) || '#6B7280');

        useEffect(() => {
                setColor(form.getFieldValue(fieldName) || '#6B7280');
        }, [form.getFieldValue(fieldName)]);

        return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                                type="color"
                                value={color}
                                onChange={(e) => {
                                        setColor(e.target.value);
                                        form.setFieldsValue({ [fieldName]: e.target.value });
                                }}
                                style={{ width: 36, height: 36, border: '1px solid #d9d9d9', borderRadius: 4, cursor: 'pointer', padding: 0 }}
                        />
                        <Input
                                placeholder="#6B7280"
                                value={color}
                                onChange={(e) => {
                                        setColor(e.target.value);
                                        form.setFieldsValue({ [fieldName]: e.target.value });
                                }}
                                style={{ fontFamily: 'monospace', flex: 1 }}
                        />
                </div>
        );
}

function StatusPreview({ form }) {
        const [, setTick] = useState(0);
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        useEffect(() => {
                const interval = setInterval(() => setTick(t => t + 1), 100);
                return () => clearInterval(interval);
        }, []);

        const bg = form.getFieldValue('color') || '#6B7280';
        const text = form.getFieldValue('text_color') || '#FFFFFF';

        return (
                <div style={{ 
                        marginBottom: 16, padding: 12, 
                        background: isDark ? '#1f1f1f' : '#f5f5f5', 
                        borderRadius: 8, display: 'flex',
                        alignItems: 'center', justifyContent: 'flex-end', gap: 12,
                }}>
                        <span style={{ color: isDark ? '#aaa' : '#666' }}>Предпросмотр:</span>
                        <Tag style={{
                                background: bg, color: text,
                                fontWeight: 'bold', fontSize: 16,
                                padding: '4px 12px', border: 'none',
                        }}>Статус</Tag>
                </div>
        );
}

function DictionaryTab({ config }) {
        const [data, setData] = useState([]);
        const [loading, setLoading] = useState(false);
        const [modalOpen, setModalOpen] = useState(false);
        const [editingItem, setEditingItem] = useState(null);
        const [form] = Form.useForm();
        const [deps, setDeps] = useState({});
        const [filters, setFilters] = useState({});
        const [filteredDeps, setFilteredDeps] = useState({});
        const [formFilters, setFormFilters] = useState({});

        const fetchFilteredDeps = async (key, params) => {
                const dep = config.deps?.find(d => d.key === key);
                if (!dep) return;
                try {
                        const res = await api.get(dep.apiPath, { params });
                        setFilteredDeps(prev => ({ ...prev, [key]: res.data || [] }));
                } catch (e) { console.error(e); }
        };

        const fetchData = async () => {
                setLoading(true);
                try {
                        const params = {};
                        if (config.filters) {
                                Object.entries(filters).forEach(([key, value]) => {
                                        if (value) params[key] = value;
                                });
                        }
                        const res = await api.get(config.apiPath, { params });
                        setData(res.data || []);
                } catch (e) { console.error(e); }
                finally { setLoading(false); }
        };

        const fetchDeps = async () => {
                const result = {};
                if (config.deps) {
                        for (const dep of config.deps) {
                                try {
                                        const res = await api.get(dep.apiPath);
                                        result[dep.key] = res.data || [];
                                } catch (e) { console.error(e); }
                        }
                }
                if (config.extraDeps) {
                        Object.assign(result, config.extraDeps);
                }
                setDeps(result);
                setFilteredDeps(result);
        };

        useEffect(() => {
                fetchData();
                const interval = setInterval(() => fetchData(), 5000);
                return () => clearInterval(interval);
        }, [filters]);

        useEffect(() => {
                fetchDeps();
        }, []);

        const handleFilterChange = (key, value) => {
                const newFilters = { ...filters, [key]: value };
                if (config.filterChain) {
                        config.filterChain.forEach(chain => {
                                if (chain.trigger === key) {
                                        chain.clear.forEach(k => { newFilters[k] = undefined; });
                                        if (chain.filterDep) {
                                                const sourceData = deps[chain.filterDep.source] || [];
                                                const filtered = value
                                                        ? sourceData.filter(item => item[chain.filterDep.by] === value)
                                                        : sourceData;
                                                setFilteredDeps(prev => {
                                                        const newDeps = { ...prev };
                                                        newDeps[chain.filterDep.target] = filtered;
                                                        return newDeps;
                                                });
                                        }
                                }
                        });
                }
                setFilters(newFilters);
        };

        const handleSubmit = async (values) => {
                try {
                        const data = { ...values };
                        if (config.multiFields) {
                                config.multiFields.forEach(f => {
                                        const formName = f.formName || f.name;
                                        if (Array.isArray(data[formName])) {
                                                data[formName] = data[formName].join(',');
                                        }
                                });
                        }
                        delete data.department_id;
                        delete data.region_id;
                        if (editingItem) {
                                if (config.isJsonBody) {
                                        await api.put(`${config.apiPath}${editingItem.id}`, data);
                                } else {
                                        await api.put(`${config.apiPath}${editingItem.id}`, null, { params: data });
                                }
                                message.success('Обновлено');
                        } else {
                                if (config.isJsonBody) {
                                        await api.post(config.apiPath, data);
                                } else {
                                        await api.post(config.apiPath, null, { params: data });
                                }
                                message.success('Создано');
                        }
                        setModalOpen(false);
                        setEditingItem(null);
                        form.resetFields();
                        fetchData();
                } catch (e) { message.error('Ошибка'); }
        };

        const handleDelete = async (id) => {
                try {
                        await api.delete(`${config.apiPath}${id}`);
                        message.success('Удалено');
                        fetchData();
                } catch (e) { message.error('Ошибка удаления'); }
        };

        const openEdit = (item) => {
                fetchDeps();
                setFormFilters({});
                setEditingItem(item);
                const fields = { ...item };
                if (config.multiFields) {
                        config.multiFields.forEach(f => {
                                const value = item[f.name];
                                if (value) {
                                        fields[f.formName || f.name] = Array.isArray(value)
                                                ? value.map(d => d.id)
                                                : value;
                                }
                        });
                }
                form.setFieldsValue(fields);
                setModalOpen(true);
        };

        const showActions = !config.hidden;
        const canAdd = !config.readonly && !config.hidden;

        return (
                <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                                <Space style={{ flexWrap: 'wrap' }}>
                                        {config.filters && config.filters.map(f => (
                                                <Select
                                                        key={f.key === 'city_id' ? `city-filter-${filters.region_id || 'all'}` : f.key}
                                                        placeholder={f.placeholder}
                                                        allowClear
                                                        style={{ width: f.width || 180 }}
                                                        value={filters[f.key]}
                                                        onChange={(v) => handleFilterChange(f.key, v)}
                                                        options={(filteredDeps[f.optionsKey] || deps[f.optionsKey] || []).map(o => ({ value: o.id, label: o.name || o.code }))}
                                                />
                                        ))}
                                </Space>
                                {canAdd && (
                                        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingItem(null); form.resetFields(); setFormFilters({}); fetchDeps(); setModalOpen(true); }}>
                                                Добавить
                                        </Button>
                                )}
                        </div>
                        <Table
                                dataSource={data}
                                rowKey="id"
                                loading={loading}
                                size="small"
                                columns={[
                                        ...config.columns.map(col => ({
                                                ...col,
                                                render: col.render || (config.multiFields?.find(f => f.name === col.dataIndex)
                                                        ? (value) => Array.isArray(value) ? value.map(v => v.name || v.code).join(', ') : value
                                                        : undefined),
                                        })),
                                        ...(showActions ? [{
                                                title: 'Действия',
                                                key: 'actions',
                                                width: 120,
                                                render: (_, record) => (
                                                        <Space>
                                                                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                                                                {!config.readonly && (
                                                                        <Popconfirm title="Удалить?" onConfirm={() => handleDelete(record.id)}>
                                                                                <Button size="small" danger icon={<DeleteOutlined />} />
                                                                        </Popconfirm>
                                                                )}
                                                        </Space>
                                                ),
                                        }] : []),
                                ]}
                                pagination={false}
                        />
                        <Modal
                                title={editingItem ? 'Редактировать' : 'Добавить'}
                                open={modalOpen}
                                onCancel={() => { setModalOpen(false); setEditingItem(null); form.resetFields(); }}
                                onOk={() => form.submit()}
                                okText={editingItem ? 'Сохранить' : 'Создать'}
                        >
                                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                                        {config.fields.map(f => {
                                                if (f.dependsOn && !form.getFieldValue(f.dependsOn)) {
                                                        return null;
                                                }
                                                if (f.type === 'select' && f.optionsKey) {
                                                        const options = (filteredDeps[f.optionsKey] || deps[f.optionsKey] || []);
                                                        return (
                                                                <Form.Item key={f.name} name={f.name} label={f.label} rules={f.rules}>
                                                                        <Select
                                                                                mode={f.mode}
                                                                                placeholder={f.placeholder}
                                                                                showSearch={f.showSearch}
                                                                                optionFilterProp={f.showSearch ? "label" : undefined}
                                                                                onChange={(v) => {
                                                                                        if (f.name === 'department_id') {
                                                                                                form.setFieldsValue({ region_id: undefined, city_id: undefined });
                                                                                                setFormFilters({ department_id: v });
                                                                                                if (v) fetchFilteredDeps('regions', { department_id: v });
                                                                                                else fetchFilteredDeps('regions', {});
                                                                                                setFilteredDeps(prev => ({ ...prev, cities: [] }));
                                                                                        } else if (f.name === 'region_id') {
                                                                                                form.setFieldsValue({ city_id: undefined });
                                                                                                setFormFilters(prev => ({ ...prev, region_id: v }));
                                                                                                if (v) fetchFilteredDeps('cities', { region_id: v });
                                                                                                else fetchFilteredDeps('cities', {});
                                                                                        }
                                                                                }}
                                                                                options={options.map(o => ({ value: o.id, label: o.name || o.code }))}
                                                                        />
                                                                </Form.Item>
                                                        );
                                                }
                                                if (f.type === 'color') {
                                                        return (
                                                                <Form.Item key={f.name} name={f.name} label={f.label} rules={f.rules} getValueFromEvent={(v) => v}>
                                                                        <ColorPickerField form={form} fieldName={f.name} />
                                                                </Form.Item>
                                                        );
                                                }
                                                return (
                                                        <Form.Item key={f.name} name={f.name} label={f.label} rules={f.rules}>
                                                                <Input placeholder={f.placeholder} />
                                                        </Form.Item>
                                                );
                                        })}
                                        {config.useStatusPreview && <StatusPreview form={form} />}
                                </Form>
                        </Modal>
                </>
        );
}

export const TABS_CONFIG = {
        departments: {
                label: '🏛️ Направления',
                apiPath: '/departments/',
                columns: [
                        { title: 'ID', dataIndex: 'id', width: 60 },
                        { title: 'Название', dataIndex: 'name' },
                        { title: 'Код', dataIndex: 'code', width: 80 },
                ],
                fields: [
                        { name: 'name', label: 'Название', placeholder: 'БТ', rules: [{ required: true }] },
                        { name: 'code', label: 'Код', placeholder: 'bt', rules: [{ required: true }] },
                ],
        },
        regions: {
                label: '📍 Регионы',
                apiPath: '/regions/',
                columns: [
                        { title: 'ID', dataIndex: 'id', width: 60 },
                        { title: 'Название', dataIndex: 'name' },
                        { title: 'Направления', dataIndex: 'departments', render: (v) => Array.isArray(v) ? v.map(d => d.name).join(', ') : '' },
                ],
                fields: [
                        { name: 'name', label: 'Название', placeholder: 'Юг', rules: [{ required: true }] },
                        { name: 'department_ids', label: 'Направления', type: 'select', mode: 'multiple', placeholder: 'Выберите направления', optionsKey: 'departments', rules: [{ required: true }] },
                ],
                deps: [{ key: 'departments', apiPath: '/departments/' }],
                multiFields: [{ name: 'departments', formName: 'department_ids' }],
        },
        cities: {
                label: '🏙️ Города',
                apiPath: '/cities/',
                columns: [
                        { title: 'ID', dataIndex: 'id', width: 60 },
                        { title: 'Название', dataIndex: 'name' },
                        { title: 'Регион', dataIndex: 'region', render: (v) => v?.name || '' },
                ],
                fields: [
                        { name: 'name', label: 'Название', placeholder: 'Москва', rules: [{ required: true }] },
                        { name: 'region_id', label: 'Регион', type: 'select', placeholder: 'Выберите регион', optionsKey: 'regions', rules: [{ required: true }], showSearch: true },
                ],
                deps: [{ key: 'regions', apiPath: '/regions/' }],
                filters: [{ key: 'region_id', placeholder: 'Регион', optionsKey: 'regions', width: 180 }],
        },
        branches: {
                label: '🏢 Филиалы',
                apiPath: '/branches/',
                columns: [
                        { title: 'ID', dataIndex: 'id', width: 60 },
                        { title: 'Название', dataIndex: 'name' },
                        { title: 'Тип', dataIndex: 'type', width: 60 },
                ],
                fields: [
                        { name: 'name', label: 'Название', placeholder: 'Мытищи', rules: [{ required: true }] },
                        { name: 'department_id', label: 'Направления', type: 'select', placeholder: 'Выберите направление', optionsKey: 'departments', rules: [{ required: true }] },
                        { name: 'region_id', label: 'Регион', type: 'select', placeholder: 'Выберите регион', optionsKey: 'regions', rules: [{ required: true }], showSearch: true, dependsOn: 'department_id' },
                        { name: 'city_id', label: 'Город', type: 'select', placeholder: 'Выберите город', optionsKey: 'cities', rules: [{ required: true }], showSearch: true, dependsOn: 'region_id' },
                ],
                deps: [
                        { key: 'departments', apiPath: '/departments/' },
                        { key: 'regions', apiPath: '/regions/' },
                        { key: 'cities', apiPath: '/cities/' },
                ],
                filters: [
                        { key: 'region_id', placeholder: 'Регион', optionsKey: 'regions', width: 180 },
                        { key: 'city_id', placeholder: 'Город', optionsKey: 'cities', width: 180 },
                ],
                filterChain: [{ trigger: 'region_id', clear: ['city_id'], filterDep: { source: 'cities', by: 'region_id', target: 'cities' } }],
        },
        technics: {
                label: '🔧 Типы техники',
                apiPath: '/technics/',
                columns: [
                        { title: 'ID', dataIndex: 'id', width: 60 },
                        { title: 'Код', dataIndex: 'code', width: 80 },
                        { title: 'Название', dataIndex: 'name' },
                ],
                fields: [
                        { name: 'name', label: 'Название', placeholder: 'Холодильники', rules: [{ required: true }] },
                        { name: 'code', label: 'Код', placeholder: 'HVAC' },
                ],
        },
        roles: {
                label: '👤 Должности',
                apiPath: '/roles/',
                columns: [
                        { title: 'ID', dataIndex: 'id', width: 60 },
                        { title: 'Код', dataIndex: 'code', width: 100 },
                        { title: 'Название', dataIndex: 'name' },
                ],
                fields: [
                        { name: 'name', label: 'Название', placeholder: 'Мастер', rules: [{ required: true }] },
                        { name: 'code', label: 'Код', placeholder: 'master', rules: [{ required: true }] },
                ],
        },
        orderStatuses: {
                label: '📋 Статусы заявок',
                apiPath: '/order-statuses/',
                useStatusPreview: true,
                columns: [
                        { title: 'ID', dataIndex: 'id', width: 60 },
                        { title: 'Код', dataIndex: 'code', width: 100 },
                        { title: 'Название', dataIndex: 'name' },
                        { title: 'Пример', key: 'preview', width: 140, render: (_, r) => (
                                <Tag style={{ background: r.color || '#6B7280', color: r.text_color || '#fff', fontWeight: 'bold', border: 'none' }}>{r.name}</Tag>
                        )},
                ],
                fields: [
                        { name: 'color', label: 'Цвет фона', type: 'color', placeholder: '#10B981' },
                        { name: 'text_color', label: 'Цвет текста', type: 'color', placeholder: '#FFFFFF' },
                ],
                isJsonBody: true,
                readonly: true,
        },
        cancelReasons: {
                label: '❌ Причины отмен',
                apiPath: '/cancel-reasons/',
                columns: [
                        { title: 'ID', dataIndex: 'id', width: 60 },
                        { title: 'Название', dataIndex: 'name' },
                ],
                fields: [
                        { name: 'name', label: 'Название', placeholder: 'Клиент передумал', rules: [{ required: true }] },
                ],
        },
        rejectReasons: {
                label: '🚫 Причины отказа',
                apiPath: '/reject-reasons/',
                columns: [
                        { title: 'ID', dataIndex: 'id', width: 60 },
                        { title: 'Название', dataIndex: 'name' },
                ],
                fields: [
                        { name: 'name', label: 'Название', placeholder: 'Дорого', rules: [{ required: true }] },
                ],
        },
        contactTypes: {
                label: '📞 Типы обращений',
                apiPath: '/contact-types/',
                columns: [
                        { title: 'ID', dataIndex: 'id', width: 60 },
                        { title: 'Название', dataIndex: 'name' },
                ],
                fields: [
                        { name: 'name', label: 'Название', placeholder: 'Звонок', rules: [{ required: true }] },
                ],
        },
        contactStatuses: {
                label: '✅ Статусы обращений',
                apiPath: '/contact-statuses/',
                useStatusPreview: true,
                columns: [
                        { title: 'ID', dataIndex: 'id', width: 60 },
                        { title: 'Название', dataIndex: 'name' },
                        { title: 'Пример', key: 'preview', width: 140, render: (_, r) => (
                                <Tag style={{ background: r.color || '#6B7280', color: r.text_color || '#fff', fontWeight: 'bold', border: 'none' }}>{r.name}</Tag>
                        )},
                ],
                fields: [
                        { name: 'name', label: 'Название', placeholder: 'Принял', rules: [{ required: true }] },
                        { name: 'color', label: 'Цвет фона', type: 'color', placeholder: '#10B981' },
                        { name: 'text_color', label: 'Цвет текста', type: 'color', placeholder: '#FFFFFF' },
                ],
                isJsonBody: true,
        },
        factors: {
                label: '📌 Факторы',
                apiPath: '/factors/',
                columns: [
                        { title: 'ID', dataIndex: 'id', width: 60 },
                        { title: 'Название', dataIndex: 'name' },
                ],
                fields: [
                        { name: 'name', label: 'Название', placeholder: 'Отзыв', rules: [{ required: true }] },
                ],
        },
        transactionCategories: {
                label: '💰 Транзакции',
                apiPath: '/transaction-categories/',
                columns: [
                        { title: 'ID', dataIndex: 'id', width: 60 },
                        { title: 'Название', dataIndex: 'name' },
                ],
                fields: [
                        { name: 'name', label: 'Название', placeholder: 'Запчасти', rules: [{ required: true }] },
                        { name: 'type_id', label: 'Тип транзакции', type: 'select', placeholder: 'Выберите тип', optionsKey: 'transactionTypes', rules: [{ required: true }] },
                ],
                deps: [{ key: 'transactionTypes', apiPath: '/transactions/types' }],
                filters: [{ key: 'type_id', placeholder: 'Тип', optionsKey: 'transactionTypes', width: 180 }],
        },
};

function DictionarySettings() {
  const [activeTab, setActiveTab] = useState('departments');
  return (
    <Card title="📚 Словарь параметров">
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={Object.entries(TABS_CONFIG).map(([key, config]) => ({
        key,
        label: config.label,
        children: <DictionaryTab key={key} config={config} />,
      }))} />
    </Card>
  );
}

export default DictionarySettings;