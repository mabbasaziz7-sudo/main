import { useState, useEffect } from 'react';
import { User, Session, AppSettings } from '../types';
import { verifyPassword, createSession, roleLabels, roleIcons } from '../data';
import {
  Wrench, Eye, EyeOff, LogIn, User as UserIcon, Lock,
  AlertCircle, Shield, Monitor, Cpu, Smartphone, Info, X
} from 'lucide-react';

interface Props {
  users: User[];
  settings: AppSettings;
  onLogin: (session: Session, user: User) => void;
}

export default function LoginPage({ users, settings, onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setIsLoading(true);

    // Simulate network delay
    setTimeout(() => {
      const user = users.find(u => u.username === username.trim());

      if (!user) {
        setError('اسم المستخدم غير موجود');
        setIsLoading(false);
        return;
      }

      if (!user.isActive) {
        setError('هذا الحساب معطّل. تواصل مع مدير النظام');
        setIsLoading(false);
        return;
      }

      if (!verifyPassword(password, user.password)) {
        setError('كلمة المرور غير صحيحة');
        setIsLoading(false);
        return;
      }

      const session = createSession(user);
      onLogin(session, user);
      setIsLoading(false);
    }, 800);
  };

  const quickLogin = (uname: string, pass: string) => {
    setUsername(uname);
    setPassword(pass);
  };

  const floatingIcons = [
    { Icon: Monitor, x: '10%', y: '20%', delay: '0s', size: 'w-8 h-8' },
    { Icon: Cpu, x: '80%', y: '15%', delay: '1s', size: 'w-10 h-10' },
    { Icon: Smartphone, x: '15%', y: '70%', delay: '2s', size: 'w-6 h-6' },
    { Icon: Wrench, x: '85%', y: '65%', delay: '0.5s', size: 'w-7 h-7' },
    { Icon: Shield, x: '70%', y: '80%', delay: '1.5s', size: 'w-8 h-8' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
        {/* Animated circles */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />

        {/* Floating icons */}
        {floatingIcons.map((item, i) => (
          <div
            key={i}
            className="absolute text-white/5 animate-float"
            style={{ left: item.x, top: item.y, animationDelay: item.delay }}
          >
            <item.Icon className={item.size} />
          </div>
        ))}
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Time & Date */}
        <div className="text-center mb-8">
          <p className="text-5xl font-light text-white/90 tracking-wider font-mono">
            {currentTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-white/40 text-sm mt-2">
            {currentTime.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-8 pb-6 text-center">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30 mb-5 relative">
              {settings.centerLogo ? (
                <img src={settings.centerLogo} alt="Logo" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <Wrench className="w-10 h-10 text-white" />
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <Shield className="w-3 h-3 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white">{settings.centerName}</h1>
            <p className="text-blue-200/60 text-sm mt-1">نظام الإدارة المتكامل</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="px-8 pb-8 space-y-5">
            {/* Error */}
            {error && (
              <div className="bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl px-4 py-3 text-sm flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Username */}
            <div className="space-y-2">
              <label className="text-white/70 text-sm font-medium block">اسم المستخدم</label>
              <div className="relative">
                <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  className="w-full bg-white/10 border border-white/10 rounded-xl py-3.5 px-12 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/15 transition-all text-sm"
                  placeholder="أدخل اسم المستخدم"
                  autoComplete="username"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-white/70 text-sm font-medium block">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  className="w-full bg-white/10 border border-white/10 rounded-xl py-3.5 px-12 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/15 transition-all text-sm"
                  placeholder="أدخل كلمة المرور"
                  autoComplete="current-password"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-l from-blue-600 to-indigo-600 text-white rounded-xl py-3.5 text-sm font-bold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  تسجيل الدخول
                </>
              )}
            </button>

            {/* Demo Credentials Toggle */}
            <button
              type="button"
              onClick={() => setShowCredentials(!showCredentials)}
              className="w-full text-center text-white/40 hover:text-white/60 text-xs flex items-center justify-center gap-1 transition-colors mt-4"
            >
              <Info className="w-3.5 h-3.5" />
              {showCredentials ? 'إخفاء بيانات الدخول التجريبية' : 'عرض بيانات الدخول التجريبية'}
            </button>
          </form>
        </div>

        {/* Demo Credentials */}
        {showCredentials && (
          <div className="mt-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white/80 text-sm font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                حسابات تجريبية
              </h3>
              <button onClick={() => setShowCredentials(false)} className="text-white/30 hover:text-white/60">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {[
                { u: 'admin', p: 'admin123', role: 'admin' as const, name: 'مدير النظام' },
                { u: 'manager', p: 'manager123', role: 'manager' as const, name: 'مدير المركز' },
                { u: 'tech1', p: 'tech123', role: 'technician' as const, name: 'فني صيانة' },
                { u: 'reception', p: 'rec123', role: 'receptionist' as const, name: 'موظف استقبال' },
              ].map(cred => (
                <button
                  key={cred.u}
                  onClick={() => quickLogin(cred.u, cred.p)}
                  className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 transition-all group text-right"
                >
                  <span className="text-lg">{roleIcons[cred.role]}</span>
                  <div className="flex-1">
                    <p className="text-white/80 text-sm font-medium">{cred.name}</p>
                    <p className="text-white/40 text-xs font-mono">{cred.u} / {cred.p}</p>
                  </div>
                  <span className="text-xs text-white/30 group-hover:text-blue-300 transition-colors">{roleLabels[cred.role]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-white/20 text-xs mt-6">
          {settings.centerName} © {new Date().getFullYear()} - نظام إدارة مركز الصيانة v4.0
        </p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.03; }
          50% { transform: translateY(-20px) rotate(5deg); opacity: 0.08; }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
