import { useState, useEffect, useRef } from 'react';
import { Page, Currency, AppSettings, User, Session } from './types';
import {
  sampleCustomers, sampleOrders, sampleProcedures, sampleParts,
  sampleTransactions, defaultCurrencies, defaultSettings, defaultUsers,
  getStoredSession, saveSession, clearSession, roleLabels, roleIcons,
} from './data';
import Dashboard from './components/Dashboard';
import Reception from './components/Reception';
import Maintenance from './components/Maintenance';
import SparePartsPage from './components/SpareParts';
import Financial from './components/Financial';
import Customers from './components/Customers';
import Settings from './components/Settings';
import LoginPage from './components/LoginPage';
import UserManagement from './components/UserManagement';
import * as sb from './supabase';
import {
  LayoutDashboard, Package, Wrench, Cpu, DollarSign, Users as UsersIcon,
  Menu, X, Settings as SettingsIcon, ChevronLeft, Coins, LogOut,
  UserCog, Shield, ChevronDown, Cloud
} from 'lucide-react';

function useLocalStorage<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }, [key, value]);

  return [value, setValue];
}

const allMenuItems: { id: Page; label: string; icon: React.ElementType; color: string; permKey: string }[] = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, color: 'text-blue-500', permKey: 'dashboard' },
  { id: 'reception', label: 'تسليم وتسلم', icon: Package, color: 'text-emerald-500', permKey: 'reception' },
  { id: 'maintenance', label: 'إدارة الصيانة', icon: Wrench, color: 'text-purple-500', permKey: 'maintenance' },
  { id: 'parts', label: 'قطع الغيار', icon: Cpu, color: 'text-orange-500', permKey: 'parts' },
  { id: 'financial', label: 'المالية والتكلفة', icon: DollarSign, color: 'text-red-500', permKey: 'financial' },
  { id: 'customers', label: 'العملاء', icon: UsersIcon, color: 'text-indigo-500', permKey: 'customers' },
  { id: 'users', label: 'المستخدمين', icon: UserCog, color: 'text-pink-500', permKey: 'users' },
  { id: 'settings', label: 'الإعدادات', icon: SettingsIcon, color: 'text-gray-400', permKey: 'settings' },
];

export default function App() {
  const [session, setSession] = useState<Session | null>(() => getStoredSession());
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [customers, setCustomers] = useLocalStorage('mc_customers', sampleCustomers);
  const [orders, setOrders] = useLocalStorage('mc_orders', sampleOrders);
  const [procedures, setProcedures] = useLocalStorage('mc_procedures', sampleProcedures);
  const [parts, setParts] = useLocalStorage('mc_parts', sampleParts);
  const [transactions, setTransactions] = useLocalStorage('mc_transactions', sampleTransactions);
  const [currencies, setCurrencies] = useLocalStorage<Currency[]>('mc_currencies', defaultCurrencies);
  const [settings, setSettings] = useLocalStorage<AppSettings>('mc_settings', defaultSettings);
  const [appUsers, setAppUsers] = useLocalStorage<User[]>('mc_users', defaultUsers);

  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const isInitialLoad = useRef(true);

  // Initialize Supabase on mount (non-blocking)
  useEffect(() => {
    const init = async () => {
      const savedConfig = localStorage.getItem('supabaseConfig');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          if (sb.initSupabase(config)) {
            const connected = await sb.testConnection();
            if (connected) {
              setIsCloudConnected(true);
              const data = await sb.loadAllData();
              if (data) {
                if (data.orders?.length) setOrders(data.orders);
                if (data.customers?.length) setCustomers(data.customers);
                if (data.parts?.length) setParts(data.parts);
                if (data.transactions?.length) setTransactions(data.transactions);
                if (data.procedures?.length) setProcedures(data.procedures);
                if (data.users?.length) setAppUsers(data.users);
                if (data.currencies?.length) setCurrencies(data.currencies);
                if (data.settings) setSettings(data.settings);
              }
            }
          }
        } catch (e) {
          console.warn('Supabase init failed, using local storage:', e);
        }
      }
      isInitialLoad.current = false;
    };
    init();
  }, []);

  // Cloud sync effects
  useEffect(() => {
    if (!isCloudConnected || isInitialLoad.current) return;
    sb.syncOrders(orders);
  }, [orders, isCloudConnected]);

  useEffect(() => {
    if (!isCloudConnected || isInitialLoad.current) return;
    sb.syncCustomers(customers);
  }, [customers, isCloudConnected]);

  useEffect(() => {
    if (!isCloudConnected || isInitialLoad.current) return;
    sb.syncParts(parts);
  }, [parts, isCloudConnected]);

  useEffect(() => {
    if (!isCloudConnected || isInitialLoad.current) return;
    sb.syncTransactions(transactions);
  }, [transactions, isCloudConnected]);

  useEffect(() => {
    if (!isCloudConnected || isInitialLoad.current) return;
    sb.syncProcedures(procedures);
  }, [procedures, isCloudConnected]);

  useEffect(() => {
    if (!isCloudConnected || isInitialLoad.current) return;
    sb.syncUsers(appUsers);
  }, [appUsers, isCloudConnected]);

  useEffect(() => {
    if (!isCloudConnected || isInitialLoad.current) return;
    sb.syncCurrencies(currencies);
  }, [currencies, isCloudConnected]);

  useEffect(() => {
    if (!isCloudConnected || isInitialLoad.current) return;
    sb.syncSettings(settings);
  }, [settings, isCloudConnected]);

  const handleConnectToCloud = async (config: { url: string; anonKey: string }) => {
    try {
      if (sb.initSupabase(config)) {
        const connected = await sb.testConnection();
        if (connected) {
          setIsCloudConnected(true);
          // Upload local data to cloud on first connect
          await sb.uploadAllData({
            orders, customers, parts, transactions, procedures,
            users: appUsers, currencies, settings,
          });
          return true;
        }
      }
    } catch (e) {
      console.error('Cloud connection failed:', e);
    }
    return false;
  };

  const handleUploadData = async (): Promise<boolean> => {
    if (!isCloudConnected) return false;
    return await sb.uploadAllData({
      orders, customers, parts, transactions, procedures,
      users: appUsers, currencies, settings,
    });
  };

  const handleDownloadData = async (): Promise<boolean> => {
    if (!isCloudConnected) return false;
    try {
      const data = await sb.loadAllData();
      if (data) {
        if (data.orders?.length) setOrders(data.orders);
        if (data.customers?.length) setCustomers(data.customers);
        if (data.parts?.length) setParts(data.parts);
        if (data.transactions?.length) setTransactions(data.transactions);
        if (data.procedures?.length) setProcedures(data.procedures);
        if (data.users?.length) setAppUsers(data.users);
        if (data.currencies?.length) setCurrencies(data.currencies);
        if (data.settings) setSettings(data.settings);
        return true;
      }
      return false;
    } catch { return false; }
  };

  // Filter menu items based on permissions
  const menuItems = session
    ? allMenuItems.filter(item => {
        const perm = session.permissions[item.permKey as keyof typeof session.permissions];
        return perm;
      })
    : [];

  const handleLogin = (newSession: Session, user: User) => {
    const updatedUser = { ...user, lastLogin: new Date().toISOString().split('T')[0] };
    setAppUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
    setSession(newSession);
    saveSession(newSession);
    setPage('dashboard');
  };

  const handleLogout = () => {
    setSession(null);
    clearSession();
    setShowUserMenu(false);
    setPage('dashboard');
  };

  const navigateTo = (p: Page) => {
    setPage(p);
    setSidebarOpen(false);
  };

  // If current page is not accessible, redirect to dashboard
  useEffect(() => {
    if (session) {
      const allowed = menuItems.find(m => m.id === page);
      if (!allowed && menuItems.length > 0) {
        setPage(menuItems[0].id);
      }
    }
  }, [session, page, menuItems]);

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const readyOrders = orders.filter(o => o.status === 'ready');
  const lowStockParts = parts.filter(p => p.quantity <= p.minQuantity);

  const resetData = () => {
    if (confirm('هل أنت متأكد من إعادة تعيين جميع البيانات؟ سيتم حذف جميع التغييرات.')) {
      setCustomers(sampleCustomers);
      setOrders(sampleOrders);
      setProcedures(sampleProcedures);
      setParts(sampleParts);
      setTransactions(sampleTransactions);
      setCurrencies(defaultCurrencies);
      setSettings(defaultSettings);
      setAppUsers(defaultUsers);
    }
  };

  const defaultCur = currencies.find(c => c.isDefault) || currencies[0];

  // ============ LOGIN SCREEN ============
  if (!session) {
    return <LoginPage users={appUsers} settings={settings} onLogin={handleLogin} />;
  }

  const renderPage = () => {
    const perm = session.permissions;

    switch (page) {
      case 'dashboard':
        return perm.dashboard ? <Dashboard orders={orders} parts={parts} transactions={transactions} customersCount={customers.length} currencies={currencies} settings={settings} navigateTo={navigateTo} /> : null;
      case 'reception':
        return perm.reception ? <Reception orders={orders} customers={customers} currencies={currencies} settings={settings} transactions={transactions} setOrders={setOrders} setTransactions={setTransactions} /> : null;
      case 'maintenance':
        return perm.maintenance ? <Maintenance orders={orders} procedures={procedures} parts={parts} currencies={currencies} settings={settings} setOrders={setOrders} setProcedures={setProcedures} setParts={setParts} /> : null;
      case 'parts':
        return perm.parts ? <SparePartsPage parts={parts} currencies={currencies} setParts={setParts} /> : null;
      case 'financial':
        return perm.financial ? <Financial transactions={transactions} orders={orders} currencies={currencies} settings={settings} setTransactions={setTransactions} setOrders={setOrders} /> : null;
      case 'customers':
        return perm.customers ? <Customers customers={customers} orders={orders} currencies={currencies} setCustomers={setCustomers} /> : null;
      case 'users':
        return perm.users ? <UserManagement users={appUsers} setUsers={setAppUsers} currentSession={session} /> : null;
      case 'settings':
        return perm.settings ? (
          <Settings
            settings={settings}
            setSettings={setSettings}
            currencies={currencies}
            setCurrencies={setCurrencies}
            onResetData={resetData}
            onConnectToCloud={handleConnectToCloud}
            isCloudConnected={isCloudConnected}
            onUploadData={handleUploadData}
            onDownloadData={handleDownloadData}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Click-outside handler for user menu */}
      {showUserMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 right-0 z-50 w-72 bg-gradient-to-b from-slate-900 to-slate-800 text-white transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} flex flex-col`}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">{settings.centerName.length > 15 ? settings.centerName.slice(0, 15) + '...' : settings.centerName}</h1>
                <p className="text-xs text-slate-400">نظام الإدارة المتكامل</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-slate-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Info in Sidebar */}
        <div className="mx-4 mt-4 bg-slate-700/40 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-lg shadow-lg flex-shrink-0">
              {session.avatar ? (
                <img src={session.avatar} alt="" className="w-full h-full rounded-xl object-cover" />
              ) : (
                roleIcons[session.role]
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{session.fullName}</p>
              <p className="text-xs text-slate-400">{roleLabels[session.role]}</p>
            </div>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Currency Badge */}
        {defaultCur && (
          <div className="mx-4 mt-2 px-3 py-2 bg-slate-700/30 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300">العملة:</span>
            </div>
            <span className="text-amber-400 font-bold">{defaultCur.nameAr} ({defaultCur.symbol})</span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-2">
          {menuItems.map((item, idx) => {
            const isActive = page === item.id;
            const isUsers = item.id === 'users';
            const isSettings = item.id === 'settings';
            return (
              <div key={item.id}>
                {(isUsers || (isSettings && !menuItems.find(m => m.id === 'users'))) && idx > 0 && (
                  <div className="border-t border-slate-700/50 my-3" />
                )}
                <button
                  onClick={() => navigateTo(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : item.color}`} />
                  <span className="flex-1 text-right">{item.label}</span>
                  {item.id === 'reception' && readyOrders.length > 0 && (
                    <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {readyOrders.length}
                    </span>
                  )}
                  {item.id === 'maintenance' && activeOrders.length > 0 && (
                    <span className="bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {activeOrders.length}
                    </span>
                  )}
                  {item.id === 'parts' && lowStockParts.length > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {lowStockParts.length}
                    </span>
                  )}
                  {item.id === 'users' && (
                    <span className="text-xs text-slate-500">{appUsers.length}</span>
                  )}
                  {isActive && <ChevronLeft className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-700/50">
          {isCloudConnected && (
            <div className="mb-3 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-2 text-xs text-emerald-400 font-medium">
              <Cloud className="w-3.5 h-3.5" />
              متصل بـ Supabase
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all font-medium"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
          <p className="text-center text-xs text-slate-600 mt-2">الإصدار 4.0.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-x-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-xl">
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <div className="hidden sm:block">
                <h2 className="font-bold text-gray-800">{menuItems.find(m => m.id === page)?.label || 'لوحة التحكم'}</h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                {defaultCur && (
                  <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full font-medium border border-amber-200 hidden sm:inline-flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    {defaultCur.symbol}
                  </span>
                )}
                {activeOrders.length > 0 && (
                  <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-medium">
                    {activeOrders.length} أمر نشط
                  </span>
                )}
                {lowStockParts.length > 0 && (
                  <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-medium hidden sm:inline">
                    {lowStockParts.length} تنبيه مخزون
                  </span>
                )}
              </div>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-sm">
                    {session.avatar ? (
                      <img src={session.avatar} alt="" className="w-full h-full rounded-lg object-cover" />
                    ) : (
                      roleIcons[session.role]
                    )}
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-bold text-gray-700 leading-none">{session.fullName}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{roleLabels[session.role]}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                    <div className="p-4 bg-gradient-to-l from-indigo-50 to-purple-50 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-xl shadow-lg">
                          {session.avatar ? (
                            <img src={session.avatar} alt="" className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            roleIcons[session.role]
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{session.fullName}</p>
                          <p className="text-xs text-gray-500">@{session.username}</p>
                          <span className="inline-flex items-center gap-1 mt-1 text-xs bg-white/80 px-2 py-0.5 rounded-full text-indigo-600 font-medium">
                            <Shield className="w-3 h-3" />
                            {roleLabels[session.role]}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-50">
                      تسجيل الدخول: {new Date(session.loginTime).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                    </div>
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-xs text-gray-500 mb-2 font-medium">صلاحياتك:</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(session.permissions).filter(([, v]) => v).map(([k]) => (
                          <span key={k} className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-200">
                            {allMenuItems.find(m => m.permKey === k)?.label || k}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="p-2">
                      {session.permissions.settings && (
                        <button
                          onClick={() => { navigateTo('settings'); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors text-right"
                        >
                          <SettingsIcon className="w-4 h-4 text-gray-400" />
                          الإعدادات
                        </button>
                      )}
                      {session.permissions.users && (
                        <button
                          onClick={() => { navigateTo('users'); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors text-right"
                        >
                          <UserCog className="w-4 h-4 text-gray-400" />
                          إدارة المستخدمين
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors text-right mt-1"
                      >
                        <LogOut className="w-4 h-4" />
                        تسجيل الخروج
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
