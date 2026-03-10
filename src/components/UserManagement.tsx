import { useState } from 'react';
import { User, UserRole, Session } from '../types';
import { generateId, hashPassword, rolePermissions, roleLabels, roleColors, roleIcons } from '../data';
import {
  Users, Edit3, Trash2, X, Check, Shield, ShieldCheck,
  ShieldX, UserPlus, Search, Eye, EyeOff, Lock, UserCog,
  Mail, Phone, Calendar, Clock, ToggleLeft, ToggleRight,
  AlertTriangle, Key, ChevronDown, ChevronUp, Activity
} from 'lucide-react';

interface Props {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentSession: Session;
}

const emptyUser: Omit<User, 'id'> = {
  username: '', password: '', fullName: '', email: '', phone: '',
  role: 'technician', avatar: '', isActive: true,
  createdAt: new Date().toISOString().split('T')[0], lastLogin: '',
  permissions: rolePermissions.technician,
};

export default function UserManagement({ users, setUsers, currentSession }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyUser);
  const [rawPassword, setRawPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const showSavedMsg = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.fullName.includes(searchTerm) || u.username.includes(searchTerm) || u.email.includes(searchTerm);
    const matchesRole = !filterRole || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = (role: UserRole) => {
    setForm(prev => ({
      ...prev,
      role,
      permissions: rolePermissions[role],
    }));
  };

  const handleSubmit = () => {
    if (!form.fullName.trim() || !form.username.trim()) {
      alert('يرجى إدخال الاسم الكامل واسم المستخدم');
      return;
    }

    // Check unique username
    const existing = users.find(u => u.username === form.username.trim() && u.id !== editingUser?.id);
    if (existing) {
      alert('اسم المستخدم مستخدم بالفعل');
      return;
    }

    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...editingUser,
        ...form,
        password: rawPassword ? hashPassword(rawPassword) : editingUser.password,
      } : u));
    } else {
      if (!rawPassword) {
        alert('يرجى إدخال كلمة المرور');
        return;
      }
      if (rawPassword.length < 4) {
        alert('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
        return;
      }
      setUsers(prev => [...prev, {
        ...form,
        id: generateId(),
        password: hashPassword(rawPassword),
        createdAt: new Date().toISOString().split('T')[0],
      }]);
    }

    closeForm();
    showSavedMsg();
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setForm(emptyUser);
    setRawPassword('');
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setForm(user);
    setRawPassword('');
    setShowForm(true);
  };

  const handleDelete = (userId: string) => {
    if (userId === currentSession.userId) {
      alert('لا يمكنك حذف حسابك الحالي');
      return;
    }
    const user = users.find(u => u.id === userId);
    if (user?.role === 'admin' && users.filter(u => u.role === 'admin' && u.isActive).length <= 1) {
      alert('لا يمكن حذف آخر مدير نظام');
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
    setConfirmDelete(null);
    showSavedMsg();
  };

  const toggleUserActive = (userId: string) => {
    if (userId === currentSession.userId) {
      alert('لا يمكنك تعطيل حسابك الحالي');
      return;
    }
    const user = users.find(u => u.id === userId);
    if (user?.role === 'admin' && user.isActive && users.filter(u => u.role === 'admin' && u.isActive).length <= 1) {
      alert('لا يمكن تعطيل آخر مدير نظام نشط');
      return;
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u));
    showSavedMsg();
  };

  const handleResetPassword = (userId: string) => {
    if (newPassword.length < 4) {
      alert('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: hashPassword(newPassword) } : u));
    setShowResetPassword(null);
    setNewPassword('');
    showSavedMsg();
  };

  const togglePermission = (key: keyof typeof form.permissions) => {
    setForm(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  };

  const permissionLabels: Record<string, { label: string; icon: React.ElementType }> = {
    dashboard: { label: 'لوحة التحكم', icon: Activity },
    reception: { label: 'تسليم وتسلم', icon: Activity },
    maintenance: { label: 'إدارة الصيانة', icon: Activity },
    parts: { label: 'قطع الغيار', icon: Activity },
    financial: { label: 'المالية', icon: Activity },
    customers: { label: 'العملاء', icon: Activity },
    settings: { label: 'الإعدادات', icon: Activity },
    users: { label: 'إدارة المستخدمين', icon: Activity },
  };

  const roleStats = {
    admin: users.filter(u => u.role === 'admin').length,
    manager: users.filter(u => u.role === 'manager').length,
    technician: users.filter(u => u.role === 'technician').length,
    receptionist: users.filter(u => u.role === 'receptionist').length,
  };

  const activeCount = users.filter(u => u.isActive).length;
  const inactiveCount = users.filter(u => !u.isActive).length;

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 hover:bg-white transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="space-y-6 animate-slideIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" />
            إدارة المستخدمين
          </h1>
          <p className="text-gray-500 text-sm mt-1">إدارة حسابات المستخدمين والصلاحيات</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm font-medium animate-fadeIn">
              <Check className="w-4 h-4" /> تم الحفظ
            </div>
          )}
          <button
            onClick={() => { setShowForm(true); setEditingUser(null); setForm(emptyUser); setRawPassword(''); }}
            className="flex items-center gap-2 bg-gradient-to-l from-indigo-600 to-blue-600 text-white px-5 py-2.5 rounded-xl hover:shadow-lg transition-all text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" /> إضافة مستخدم
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">{users.length}</p>
          <p className="text-xs text-gray-500 mt-1">إجمالي المستخدمين</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          <p className="text-xs text-gray-500 mt-1">نشط</p>
        </div>
        {Object.entries(roleStats).map(([role, count]) => (
          <div key={role} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-lg">{roleIcons[role as UserRole]}</p>
            <p className="text-xl font-bold text-gray-800">{count}</p>
            <p className="text-xs text-gray-500">{roleLabels[role as UserRole]}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              placeholder="بحث بالاسم أو اسم المستخدم أو البريد..."
            />
          </div>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 min-w-[160px]"
          >
            <option value="">جميع الأدوار</option>
            {Object.entries(roleLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.map(user => (
          <div key={user.id} className={`bg-white rounded-2xl border-2 transition-all hover:shadow-md ${
            !user.isActive ? 'border-gray-200 opacity-70' : 
            user.id === currentSession.userId ? 'border-blue-300 shadow-blue-100 shadow-sm' : 'border-gray-100'
          }`}>
            <div className="p-5">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0 ${
                  user.isActive
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    roleIcons[user.role]
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-800 text-lg">{user.fullName}</h3>
                    {user.id === currentSession.userId && (
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">أنت</span>
                    )}
                    {!user.isActive && (
                      <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <ShieldX className="w-3 h-3" /> معطّل
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">@{user.username}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColors[user.role]}`}>
                      {roleLabels[user.role]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                    {user.email && (
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{user.email}</span>
                    )}
                    {user.phone && (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{user.phone}</span>
                    )}
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />انضم: {user.createdAt}</span>
                    {user.lastLogin && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />آخر دخول: {user.lastLogin}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    title="الصلاحيات"
                  >
                    {expandedUser === user.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => toggleUserActive(user.id)}
                    className={`p-2 rounded-xl transition-colors ${user.isActive ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    title={user.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                  >
                    {user.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => { setShowResetPassword(user.id); setNewPassword(''); }}
                    className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-colors"
                    title="إعادة تعيين كلمة المرور"
                  >
                    <Key className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleEdit(user)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                    title="تعديل"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(user.id)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Reset Password Inline */}
              {showResetPassword === user.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-700">إعادة تعيين كلمة المرور لـ {user.fullName}</p>
                  </div>
                  <div className="flex gap-3 mt-3">
                    <div className="relative flex-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className={inputClass}
                        placeholder="كلمة المرور الجديدة (4 أحرف على الأقل)"
                        dir="ltr"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button onClick={() => handleResetPassword(user.id)}
                      className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors flex items-center gap-1">
                      <Check className="w-4 h-4" /> تعيين
                    </button>
                    <button onClick={() => setShowResetPassword(null)}
                      className="text-gray-500 hover:bg-gray-100 px-3 rounded-xl transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Delete Inline */}
              {confirmDelete === user.id && (
                <div className="mt-4 pt-4 border-t border-red-100 animate-fadeIn bg-red-50 -mx-5 -mb-5 px-5 pb-5 rounded-b-2xl">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-red-700">هل أنت متأكد من حذف حساب "{user.fullName}"؟ لا يمكن التراجع عن هذا الإجراء.</p>
                  </div>
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => handleDelete(user.id)}
                      className="bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-1">
                      <Trash2 className="w-4 h-4" /> نعم، حذف
                    </button>
                    <button onClick={() => setConfirmDelete(null)}
                      className="bg-white text-gray-600 px-5 py-2 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors border border-gray-200">
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {/* Expanded Permissions */}
              {expandedUser === user.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 animate-fadeIn">
                  <p className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    صلاحيات المستخدم
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(user.permissions).map(([key, val]) => (
                      <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                        val ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-400 border border-gray-200'
                      }`}>
                        {val ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldX className="w-3.5 h-3.5" />}
                        {permissionLabels[key]?.label || key}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Users className="w-16 h-16 mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">لا توجد نتائج</p>
            <p className="text-gray-400 text-sm mt-1">حاول تغيير معايير البحث</p>
          </div>
        )}
      </div>

      {/* Inactive Users Count */}
      {inactiveCount > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <p className="text-sm text-amber-700">
            يوجد <strong>{inactiveCount}</strong> حساب معطّل
          </p>
        </div>
      )}

      {/* ============ USER FORM MODAL ============ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-fadeIn my-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <UserCog className="w-5 h-5 text-indigo-500" />
                {editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
              </h2>
              <button onClick={closeForm} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> المعلومات الأساسية
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>الاسم الكامل *</label>
                    <input type="text" value={form.fullName}
                      onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                      className={inputClass} placeholder="الاسم الكامل" />
                  </div>
                  <div>
                    <label className={labelClass}>اسم المستخدم *</label>
                    <input type="text" value={form.username}
                      onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                      className={inputClass} placeholder="username" dir="ltr" />
                  </div>
                  <div>
                    <label className={labelClass}>البريد الإلكتروني</label>
                    <input type="email" value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      className={inputClass} placeholder="email@example.com" dir="ltr" />
                  </div>
                  <div>
                    <label className={labelClass}>رقم الهاتف</label>
                    <input type="tel" value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      className={inputClass} placeholder="05xxxxxxxx" dir="ltr" />
                  </div>
                  {/* Password */}
                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      <Lock className="w-3.5 h-3.5 inline ml-1 text-gray-400" />
                      {editingUser ? 'كلمة المرور الجديدة (اتركه فارغاً لعدم التغيير)' : 'كلمة المرور *'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={rawPassword}
                        onChange={e => setRawPassword(e.target.value)}
                        className={inputClass + " pl-10"}
                        placeholder={editingUser ? 'اتركه فارغاً لعدم التغيير' : 'كلمة المرور (4 أحرف على الأقل)'}
                        dir="ltr"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <h3 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> الدور الوظيفي
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(Object.keys(roleLabels) as UserRole[]).map(role => (
                    <button
                      key={role}
                      onClick={() => handleRoleChange(role)}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        form.role === role
                          ? 'border-indigo-500 bg-indigo-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{roleIcons[role]}</span>
                      <p className={`text-sm font-bold ${form.role === role ? 'text-indigo-700' : 'text-gray-700'}`}>
                        {roleLabels[role]}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h3 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> الصلاحيات
                  <span className="text-xs text-gray-400 font-normal">(يمكنك تخصيصها)</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(permissionLabels).map(([key, { label }]) => (
                    <button
                      key={key}
                      onClick={() => togglePermission(key as keyof typeof form.permissions)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        form.permissions[key as keyof typeof form.permissions]
                          ? 'bg-green-50 text-green-700 border-green-300'
                          : 'bg-gray-50 text-gray-400 border-gray-200'
                      }`}
                    >
                      {form.permissions[key as keyof typeof form.permissions]
                        ? <ShieldCheck className="w-4 h-4" />
                        : <ShieldX className="w-4 h-4" />
                      }
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar */}
              <div>
                <label className={labelClass}>رابط الصورة الشخصية (اختياري)</label>
                <input type="url" value={form.avatar}
                  onChange={e => setForm(p => ({ ...p, avatar: e.target.value }))}
                  className={inputClass} placeholder="https://example.com/avatar.jpg" dir="ltr" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={closeForm}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium">إلغاء</button>
              <button onClick={handleSubmit}
                className="px-6 py-2.5 bg-gradient-to-l from-indigo-600 to-blue-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all flex items-center gap-2">
                <Check className="w-4 h-4" />
                {editingUser ? 'حفظ التعديلات' : 'إضافة المستخدم'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
