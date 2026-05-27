import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { ConfigProvider, theme, Layout, Button, Menu, Dropdown, Select } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import {
  MoonOutlined, SunOutlined, FileTextOutlined, TeamOutlined,
  UserOutlined, BarChartOutlined, DollarOutlined, FileDoneOutlined,
  FilePdfOutlined, SettingOutlined, LogoutOutlined,
} from '@ant-design/icons';
import api from './services/api';
import LoginPage from './pages/LoginPage';
import OrdersPage from './pages/orders/OrdersPage';
import ClientsPage from './pages/clients/ClientsPage';
import TransactionsPage from './pages/transactions/TransactionsPage';
import StaffPage from './pages/staff/StaffPage';
import StatsPage from './pages/stats/StatsPage';
import PayrollPage from './pages/payroll/PayrollPage';
import InvoicesPage from './pages/invoices/InvoicesPage';
import SettingsPage from './pages/settings/SettingsPage';
import { notification, message } from 'antd';

const { Header, Content } = Layout;

export const RoleContext = createContext(null);

const menuItems = [
  {
    key: 'orders',
    icon: <FileTextOutlined />,
    label: 'Заявки',
    children: [
      { key: 'orders:assigned', label: '📅 Назначенные' },
      { key: 'orders:assigned_cc', label: '📅 Назначенные КЦ' },
      { key: 'orders:all', label: '📋 Все заявки' },
      { key: 'orders:okk', label: '🔍 Проверка ОКК' },
    ],
  },
  {
    key: 'clients',
    icon: <TeamOutlined />,
    label: 'Клиенты',
    children: [
      { key: 'clients:search', label: '🔍 Поиск клиента' },
      { key: 'clients:all', label: '👥 Все клиенты' },
    ],
  },
  {
    key: 'stats',
    icon: <BarChartOutlined />,
    label: 'Статистика',
    children: [
      { key: 'stats:branch', label: '🏢 Филиала' },
      { key: 'stats:cities', label: '🏙️ По городам' },
      { key: 'stats:masters', label: '🔧 Мастеров' },
      { key: 'stats:advertising', label: '📢 Реклама' },
    ],
  },
  {
    key: 'staff',
    icon: <UserOutlined />,
    label: 'Сотрудники',
    children: [
      { key: 'staff:active', label: 'Действующие' },
      { key: 'staff:archive', label: 'Архив' },
      { key: 'staff:schedule', label: '📅 График' },
    ],
  },
  {
    key: 'transactions',
    icon: <DollarOutlined />,
    label: 'Транзакции',
    children: [
      { key: 'transactions:all', label: 'Все транзакции' },
    ],
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: 'Настройки',
    children: [
      { key: 'settings:general', label: '⚙️ Общие' },
      { key: 'settings:profile', label: '👤 Профиль' },
    ],
  },
];

function App() {
  const [isDark, setIsDark] = useState(false);
  const [currentPage, setCurrentPage] = useState('orders');
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [viewRole, setViewRole] = useState(null);
  const [, forceUpdate] = useState(0);
  const prevCancelIdsRef = React.useRef(new Set());
  const prevNewOrderIdsRef = React.useRef(new Set());
  const audioRef = React.useRef(null);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener('roleSwitcherChanged', handler);
    return () => window.removeEventListener('roleSwitcherChanged', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      setCurrentPage(e.detail.page);
    };
    window.addEventListener('navigate', handler);
    return () => window.removeEventListener('navigate', handler);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) { setInitialized(true); return; }
      try {
        const response = await api.get('/auth/me');
        const userData = response.data;
        setUser(userData);
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            setIsDark(savedTheme === 'dark');
        } else if (userData.theme) {
            setIsDark(userData.theme === 'dark');
        }
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally { setInitialized(true); }
    };
    initAuth();
  }, []);

  useEffect(() => {
    api.get('/roles/').then(r => setRoles(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const role = viewRole || user.role;
    const isBT = ['master', 'logist', 'dir_bt', 'reg_bt', 'fed_bt', 'admin'].includes(role);
    const isCC = ['operator', 'dir_cc', 'reg_cc', 'fed_cc', 'admin'].includes(role);
    
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: 'Bearer ' + token };
        
        if (isBT) {
          const now = new Date();
          const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          const res = await fetch(`/api/orders/?scheduled_date=${today}&status_id=14`, { headers });
          const data = await res.json();
          if (Array.isArray(data)) {
            const isFirstLoad = prevNewOrderIdsRef.current.size === 0;
            if (isFirstLoad) {
              prevNewOrderIdsRef.current = new Set(data.map(o => o.id));
            } else {
              const newOrders = data.filter(o => !prevNewOrderIdsRef.current.has(o.id));
              if (newOrders.length > 0) {
                if (audioRef.current) {
                  audioRef.current.play().catch(() => {});
                }
                newOrders.forEach(order => {
                  notification.info({
                    title: 'Новая заявка',
                    description: `Заявка №${order.id} — ${order.client?.name || 'Без клиента'}, ${order.address || '—'}`,
                    placement: 'topRight',
                    duration: 5,
                  });
                });
              }
              prevNewOrderIdsRef.current = new Set(data.map(o => o.id));
            }
          }
        }
        
        if (isCC) {
          const res = await fetch('/api/orders/?status_id=15', { headers });
          const data = await res.json();
          if (Array.isArray(data)) {
            const isFirstLoad = prevCancelIdsRef.current.size === 0;
            if (isFirstLoad) {
              prevCancelIdsRef.current = new Set(data.map(o => o.id));
            } else {
              const newCancel = data.filter(o => !prevCancelIdsRef.current.has(o.id));
              if (newCancel.length > 0) {
                if (audioRef.current) {
                  audioRef.current.play().catch(() => {});
                }
                newCancel.forEach(order => {
                  notification.warning({
                    title: 'Запрос отмены',
                    description: `Заявка №${order.id} — ${order.client?.name || 'Без клиента'}, ${order.address || '—'}`,
                    placement: 'topRight',
                    duration: 0,
                  });
                });
              }
              prevCancelIdsRef.current = new Set(data.map(o => o.id));
            }
          }
        }
      } catch (e) {}
    }, 5000);
    
    return () => clearInterval(interval);
  }, [user, viewRole]);

  const handleLogin = (userData) => {
    setUser(userData);
    setInitialized(true);
    if (userData.theme) setIsDark(userData.theme === 'dark');
    localStorage.setItem('user_name', userData.first_name || '');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_name');
    setUser(null);
    setViewRole(null);
  };

  if (!initialized) return null;

  if (!user) {
    return (
      <ConfigProvider theme={{ token: { colorPrimary: '#2563EB', borderRadius: 6 } }} locale={ruRU}>
        <LoginPage onLogin={handleLogin} />
      </ConfigProvider>
    );
  }

  const getFilteredMenu = (role) => {
    const isMaster = role === 'master';
    const canSeeStaff = ['logist', 'dir_bt', 'dir_cc', 'reg_bt', 'reg_cc', 'fed_bt', 'fed_cc', 'admin'].includes(role);
    const canSeeTransactions = ['dir_bt', 'dir_cc', 'reg_bt', 'reg_cc', 'fed_bt', 'fed_cc', 'admin'].includes(role);

    return menuItems.filter(item => {
      if (item.key === 'clients' && isMaster) return false;
      if (item.key === 'stats' && isMaster) return false;
      if (item.key === 'staff' && !canSeeStaff) return false;
      if (item.key === 'transactions' && !canSeeTransactions) return false;
      return true;
    });
  };

  const renderContent = () => {
    const mainKey = currentPage.split(':')[0];
    switch (mainKey) {
      case 'orders': return <OrdersPage subPage={currentPage} />;
      case 'clients': return <ClientsPage subPage={currentPage} />;
      case 'staff': return <StaffPage subPage={currentPage} />;
      case 'stats': return <StatsPage subPage={currentPage} />;
      case 'transactions': return <TransactionsPage subPage={currentPage} />;
      case 'payroll': return <PayrollPage subPage={currentPage} />;
      case 'invoices': return <InvoicesPage subPage={currentPage} />;
      case 'settings': return <SettingsPage subPage={currentPage} />;
      default: return null;
    }
  };

  const userMenu = [
    { key: 'logout', icon: <LogoutOutlined />, label: 'Выйти', onClick: handleLogout },
  ];

  return (
    <RoleContext.Provider value={viewRole || user.role}>
      <ConfigProvider
        locale={ruRU}
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: { colorPrimary: '#2563EB', borderRadius: 6 },
        }}
      >
        <Layout style={{ minHeight: '100vh' }}>
          <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <h1 style={{ color: 'white', margin: '0 24px 0 0', fontSize: 18, whiteSpace: 'nowrap' }}>CRM Tehapp.space</h1>
              <Menu theme="dark" mode="horizontal" selectedKeys={[currentPage]} onClick={({ key }) => setCurrentPage(key)} items={getFilteredMenu(user?.role || '')}
                style={{ flex: 1, minWidth: 0, background: 'transparent', borderBottom: 'none' }} />
            </div>
            {(user?.role === 'admin' || localStorage.getItem('isAdmin') === 'true') && localStorage.getItem('roleSwitcher') !== 'hidden' && (
              <Select size="small" style={{ width: 200, marginRight: 12 }}
                value={user?.phone || '1'}
                onChange={async (phone) => {
                  try {
                    const response = await api.post('/auth/login', null, { params: { login: phone, password: '12345' } });
                    localStorage.setItem('token', response.data.access_token);
                    const me = await api.get('/auth/me');
                    setUser(me.data);
                    localStorage.setItem('user', JSON.stringify(me.data));
                    setViewRole(null);
                    localStorage.setItem('isAdmin', 'true');
                    window.location.reload();
                  } catch (e) {
                    message.error('Ошибка входа');
                  }
                }}
                options={roles.map(r => ({ value: String(r.id), label: r.name }))}
              />
            )}
            <Button icon={isDark ? <SunOutlined /> : <MoonOutlined />}
              onClick={async () => {
                  const newTheme = !isDark;
                  setIsDark(newTheme);
                  localStorage.setItem('theme', newTheme ? 'dark' : 'light');
                  try { await api.put('/auth/theme', { theme: newTheme ? 'dark' : 'light' }); } catch (error) {}
              }} 
              style={{ marginRight: 12 }}>
              {isDark ? 'Светлая' : 'Тёмная'}
            </Button>
            <Dropdown menu={{ items: userMenu }} placement="bottomRight">
              <Button icon={<UserOutlined />}>{user?.first_name || localStorage.getItem('user_name') || 'Профиль'}</Button>
            </Dropdown>
          </Header>
          <Content style={{ padding: 24 }}>{renderContent()}</Content>
          <audio ref={audioRef} src="/notification.mp3" preload="auto" />
        </Layout>
      </ConfigProvider>
    </RoleContext.Provider>
  );
}

export default App;