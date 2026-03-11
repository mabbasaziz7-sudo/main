import { useState, useEffect } from 'react';
import { Database, AlertTriangle, Cloud, CloudOff, RefreshCw, Check, Copy, Upload, Download, ExternalLink, ChevronDown, ChevronUp, Zap, Globe, Shield, BookOpen, Activity, Wrench, X } from 'lucide-react';
import { getSyncLog } from '../supabase';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

interface Props {
  onConnect: (config: SupabaseConfig) => Promise<boolean>;
  isConnected: boolean;
  onUploadData?: () => Promise<{ success: boolean; errors: string[] }>;
  onDownloadData?: () => Promise<boolean>;
}

const SQL_SCHEMA = `-- ============================================
-- نظام إدارة مركز الصيانة - Supabase Schema
-- قم بنسخ هذا الكود ولصقه في SQL Editor
-- ============================================

-- 1. جدول الإعدادات
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول العملاء
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TEXT
);

-- 3. جدول أوامر الصيانة
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT,
  customer_id TEXT,
  customer_name TEXT,
  device_type TEXT,
  device_brand TEXT,
  device_model TEXT,
  serial_number TEXT DEFAULT '',
  problem_description TEXT,
  status TEXT DEFAULT 'received',
  received_date TEXT,
  expected_date TEXT DEFAULT '',
  delivered_date TEXT DEFAULT '',
  estimated_cost NUMERIC DEFAULT 0,
  final_cost NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  accessories TEXT DEFAULT '',
  device_condition TEXT DEFAULT '',
  assigned_technician TEXT DEFAULT '',
  priority TEXT DEFAULT 'medium',
  is_paid BOOLEAN DEFAULT FALSE,
  paid_amount NUMERIC DEFAULT 0
);

-- 4. جدول الدفعات
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  order_number TEXT,
  amount NUMERIC DEFAULT 0,
  date TEXT,
  payment_method TEXT,
  notes TEXT DEFAULT '',
  type TEXT DEFAULT 'partial'
);

-- 5. جدول إجراءات الصيانة
CREATE TABLE IF NOT EXISTS maintenance_actions (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  order_number TEXT,
  description TEXT,
  technician_name TEXT,
  date TEXT,
  duration INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  parts_used JSONB DEFAULT '[]',
  labor_cost NUMERIC DEFAULT 0,
  notes TEXT DEFAULT ''
);

-- 6. جدول قطع الغيار
CREATE TABLE IF NOT EXISTS spare_parts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  part_number TEXT DEFAULT '',
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 0,
  purchase_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  supplier TEXT DEFAULT '',
  location TEXT DEFAULT ''
);

-- 7. جدول المعاملات المالية
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  type TEXT,
  category TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  date TEXT,
  description TEXT DEFAULT '',
  payment_method TEXT DEFAULT ''
);

-- 8. جدول العملات
CREATE TABLE IF NOT EXISTS currencies (
  id TEXT PRIMARY KEY,
  code TEXT,
  name_ar TEXT,
  name_en TEXT DEFAULT '',
  symbol TEXT,
  exchange_rate NUMERIC DEFAULT 1,
  is_default BOOLEAN DEFAULT FALSE,
  decimal_places INTEGER DEFAULT 2,
  symbol_position TEXT DEFAULT 'after'
);

-- 9. جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  role TEXT DEFAULT 'technician',
  avatar TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TEXT,
  last_login TEXT DEFAULT '',
  permissions JSONB DEFAULT '{}'
);

-- ============================================
-- تعطيل RLS لجميع الجداول (مطلوب للعمل)
-- ============================================
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE spare_parts DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE currencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ============================================
-- منح صلاحيات كاملة
-- ============================================
GRANT ALL ON settings TO anon, authenticated;
GRANT ALL ON customers TO anon, authenticated;
GRANT ALL ON orders TO anon, authenticated;
GRANT ALL ON payments TO anon, authenticated;
GRANT ALL ON maintenance_actions TO anon, authenticated;
GRANT ALL ON spare_parts TO anon, authenticated;
GRANT ALL ON transactions TO anon, authenticated;
GRANT ALL ON currencies TO anon, authenticated;
GRANT ALL ON users TO anon, authenticated;

-- ============================================
-- ✅ تم! يمكنك الآن الاتصال من التطبيق
-- ============================================`;

export default function SettingsDatabase({ onConnect, isConnected, onUploadData, onDownloadData }: Props) {
  const [config, setConfig] = useState<SupabaseConfig>({ url: '', anonKey: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSQL, setShowSQL] = useState(false);
  const [showGuide, setShowGuide] = useState(!isConnected);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncDirection, setSyncDirection] = useState<'up' | 'down' | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('supabaseConfig');
    if (saved) {
      try { setConfig(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg);
    setError(null);
    setUploadErrors([]);
    setTimeout(() => setSuccess(null), 5000);
  };

  const handleConnect = async () => {
    setError(null);
    setSuccess(null);
    setUploadErrors([]);
    setLoading(true);

    if (!config.url || !config.anonKey) {
      setError('يرجى إدخال رابط المشروع ومفتاح API');
      setLoading(false);
      return;
    }

    if (!config.url.startsWith('https://') || !config.url.includes('.supabase.co')) {
      setError('رابط المشروع غير صحيح. يجب أن يكون بالشكل: https://xxxxx.supabase.co');
      setLoading(false);
      return;
    }

    try {
      const result = await onConnect(config);
      if (result) {
        localStorage.setItem('supabaseConfig', JSON.stringify(config));
        showSuccessMsg('✅ تم الاتصال بنجاح! اضغط "رفع البيانات للسحابة" لنقل بياناتك.');
      } else {
        setError('فشل الاتصال. تأكد من:\n1. صحة رابط المشروع والمفتاح\n2. تنفيذ ملف SQL في SQL Editor\n3. تعطيل RLS (موجود في الملف SQL)');
      }
    } catch (err) {
      setError('خطأ: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (confirm('هل أنت متأكد من قطع الاتصال؟\nسيعود النظام للعمل على التخزين المحلي فقط.')) {
      localStorage.removeItem('supabaseConfig');
      window.location.reload();
    }
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SQL_SCHEMA).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleUploadData = async () => {
    if (!onUploadData) return;
    if (!confirm('سيتم رفع جميع البيانات المحلية إلى Supabase.\nالبيانات الموجودة على السحابة سيتم استبدالها.\n\nهل تريد المتابعة؟')) return;
    setSyncing(true);
    setSyncDirection('up');
    setUploadErrors([]);
    try {
      const result = await onUploadData();
      if (result.success) {
        showSuccessMsg('✅ تم رفع جميع البيانات بنجاح!');
      } else {
        setUploadErrors(result.errors);
        setError('حدثت أخطاء أثناء الرفع. راجع التفاصيل أدناه.');
      }
    } catch (e) {
      setError('خطأ في الرفع: ' + (e as Error).message);
    } finally {
      setSyncing(false);
      setSyncDirection(null);
    }
  };

  const handleDownloadData = async () => {
    if (!onDownloadData) return;
    if (!confirm('سيتم تحميل جميع البيانات من Supabase.\nالبيانات المحلية سيتم استبدالها.\n\nهل تريد المتابعة؟')) return;
    setSyncing(true);
    setSyncDirection('down');
    try {
      const result = await onDownloadData();
      if (result) showSuccessMsg('✅ تم تحميل البيانات بنجاح!');
      else setError('لا توجد بيانات على السحابة أو حدث خطأ');
    } catch (e) {
      setError('خطأ في التحميل: ' + (e as Error).message);
    } finally {
      setSyncing(false);
      setSyncDirection(null);
    }
  };

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 hover:bg-white transition-colors font-mono text-xs";

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <Database className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">قاعدة بيانات Supabase</h2>
            <p className="text-sm text-gray-500">ربط النظام بقاعدة بيانات PostgreSQL سحابية مجانية</p>
          </div>
        </div>
        <button onClick={() => setShowLog(!showLog)}
          className="flex items-center gap-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg transition-colors">
          <Activity className="w-3.5 h-3.5" />
          سجل المزامنة
        </button>
      </div>

      {/* Sync Log */}
      {showLog && (
        <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 animate-fadeIn">
          <div className="flex items-center justify-between p-3 border-b border-slate-700">
            <span className="text-sm text-slate-300 font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> سجل المزامنة
            </span>
            <button onClick={() => setShowLog(false)} className="text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto p-3 space-y-1">
            {getSyncLog().length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-4">لا توجد عمليات بعد</p>
            ) : (
              getSyncLog().map((log, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded ${log.status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                  <span className="text-slate-500 font-mono">{log.time}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'ok' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-slate-300 font-medium">{log.action}</span>
                  <span className="text-slate-500">-</span>
                  <span>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className={`rounded-2xl p-6 text-white shadow-lg transition-all ${isConnected ? 'bg-gradient-to-br from-emerald-600 to-green-700' : 'bg-gradient-to-br from-slate-700 to-slate-800'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isConnected ? 'bg-white/20' : 'bg-slate-600/50'}`}>
              {isConnected ? <Cloud className="w-8 h-8" /> : <CloudOff className="w-8 h-8" />}
            </div>
            <div>
              <h3 className="font-bold text-xl flex items-center gap-2">
                {isConnected ? '✅ متصل بـ Supabase' : '❌ غير متصل'}
              </h3>
              <p className="text-slate-200 text-sm mt-1">
                {isConnected
                  ? 'البيانات تتم مزامنتها تلقائياً مع قاعدة البيانات السحابية'
                  : 'يعمل النظام على التخزين المحلي فقط (بيانات المتصفح)'}
              </p>
            </div>
          </div>
          {isConnected && (
            <button onClick={handleDisconnect}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all border border-white/20">
              قطع الاتصال
            </button>
          )}
        </div>
      </div>

      {/* Sync Buttons */}
      {isConnected && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={handleUploadData} disabled={syncing}
            className="bg-white rounded-xl border-2 border-blue-200 p-5 hover:border-blue-400 hover:shadow-lg transition-all text-right group disabled:opacity-50">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                {syncing && syncDirection === 'up' ? <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" /> : <Upload className="w-5 h-5 text-blue-600" />}
              </div>
              <span className="font-bold text-gray-800">⬆️ رفع البيانات للسحابة</span>
            </div>
            <p className="text-xs text-gray-500">رفع جميع البيانات المحلية إلى Supabase (يستبدل البيانات الموجودة)</p>
          </button>

          <button onClick={handleDownloadData} disabled={syncing}
            className="bg-white rounded-xl border-2 border-green-200 p-5 hover:border-green-400 hover:shadow-lg transition-all text-right group disabled:opacity-50">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                {syncing && syncDirection === 'down' ? <RefreshCw className="w-5 h-5 text-green-600 animate-spin" /> : <Download className="w-5 h-5 text-green-600" />}
              </div>
              <span className="font-bold text-gray-800">⬇️ تحميل من السحابة</span>
            </div>
            <p className="text-xs text-gray-500">تحميل البيانات من Supabase واستبدال البيانات المحلية</p>
          </button>
        </div>
      )}

      {/* Upload Errors */}
      {uploadErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-fadeIn">
          <h4 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> أخطاء الرفع:
          </h4>
          <ul className="space-y-1">
            {uploadErrors.map((err, i) => (
              <li key={i} className="text-xs text-red-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Setup Guide */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <button onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            <span className="font-bold text-gray-800">📖 دليل الإعداد خطوة بخطوة</span>
          </div>
          {showGuide ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {showGuide && (
          <div className="border-t border-gray-100 p-6 space-y-6 animate-fadeIn">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700">1</div>
              <div>
                <h4 className="font-bold text-gray-800 mb-1">إنشاء حساب على Supabase</h4>
                <p className="text-sm text-gray-600 mb-2">اذهب للرابط التالي وسجّل بحسابك على GitHub:</p>
                <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors border border-emerald-200">
                  <ExternalLink className="w-4 h-4" /> supabase.com/dashboard
                </a>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700">2</div>
              <div>
                <h4 className="font-bold text-gray-800 mb-1">إنشاء مشروع جديد</h4>
                <p className="text-sm text-gray-600">اضغط "New Project" واختر اسماً وكلمة مرور ومنطقة قريبة.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center font-bold text-red-700">3</div>
              <div>
                <h4 className="font-bold text-gray-800 mb-1">⚠️ مهم جداً: إنشاء الجداول</h4>
                <p className="text-sm text-gray-600 mb-2">
                  من القائمة الجانبية اذهب إلى <strong>"SQL Editor"</strong> ← ثم <strong>"New Query"</strong>
                </p>
                <p className="text-sm text-red-600 font-bold mb-2">
                  انسخ الكود أدناه كاملاً والصقه واضغط "RUN" ← يجب أن تظهر "Success"
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowSQL(!showSQL)}
                    className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors">
                    <Database className="w-4 h-4" />
                    {showSQL ? 'إخفاء كود SQL' : '👈 عرض كود SQL'}
                  </button>
                  <button onClick={handleCopySQL}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                    {copied ? <><Check className="w-4 h-4" /> تم النسخ!</> : <><Copy className="w-4 h-4" /> نسخ الكود</>}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700">4</div>
              <div>
                <h4 className="font-bold text-gray-800 mb-1">نسخ بيانات الاتصال</h4>
                <p className="text-sm text-gray-600">من <strong>Project Settings</strong> (أيقونة الترس) ← <strong>API</strong>:</p>
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  <li className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-blue-500" /> <strong>Project URL</strong> - رابط المشروع</li>
                  <li className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-green-500" /> <strong>anon/public key</strong> - المفتاح العام</li>
                </ul>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-700">5</div>
              <div>
                <h4 className="font-bold text-gray-800 mb-1">الصق البيانات أدناه واضغط "اتصال"</h4>
                <p className="text-sm text-gray-600">ثم اضغط <strong>"⬆️ رفع البيانات للسحابة"</strong> لنقل بياناتك.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SQL Schema */}
      {showSQL && (
        <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-700 animate-fadeIn">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>schema.sql</span>
            </div>
            <button onClick={handleCopySQL}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
              {copied ? <><Check className="w-4 h-4" /> تم النسخ!</> : <><Copy className="w-4 h-4" /> نسخ الكل</>}
            </button>
          </div>
          <pre className="p-4 text-xs text-slate-300 overflow-x-auto max-h-96 leading-relaxed" dir="ltr">
            {SQL_SCHEMA}
          </pre>
        </div>
      )}

      {/* Connection Form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
          <Wrench className="w-5 h-5 text-gray-500" />
          <h3 className="font-bold text-gray-800">بيانات الاتصال</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Globe className="w-3.5 h-3.5 inline ml-1 text-blue-500" />
              Project URL (رابط المشروع) *
            </label>
            <input type="url" value={config.url}
              onChange={e => setConfig(p => ({ ...p, url: e.target.value.trim() }))}
              className={inputClass}
              placeholder="https://xxxxxxxx.supabase.co"
              dir="ltr" />
            <p className="text-xs text-gray-400 mt-1">Project Settings → API → Project URL</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Shield className="w-3.5 h-3.5 inline ml-1 text-green-500" />
              anon / public Key (المفتاح العام) *
            </label>
            <input type="text" value={config.anonKey}
              onChange={e => setConfig(p => ({ ...p, anonKey: e.target.value.trim() }))}
              className={inputClass}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              dir="ltr" />
            <p className="text-xs text-gray-400 mt-1">Project Settings → API → Project API keys → anon public</p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-4 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2 animate-fadeIn border border-red-200 whitespace-pre-line">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}
        {success && (
          <div className="mt-4 bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-fadeIn border border-green-200">
            <Check className="w-5 h-5 flex-shrink-0" /> {success}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
          <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
            <ExternalLink className="w-4 h-4" /> فتح لوحة Supabase
          </a>

          <button
            onClick={handleConnect}
            disabled={loading}
            className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
              isConnected
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-gradient-to-l from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 hover:shadow-emerald-200 active:scale-[0.98]'
            } disabled:opacity-50`}
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : isConnected ? <Check className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            {loading ? 'جاري الاتصال...' : isConnected ? 'إعادة الاتصال' : 'اتصال بـ Supabase'}
          </button>
        </div>
      </div>

      {/* Quick Troubleshooting */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          حل المشاكل الشائعة
        </h4>
        <div className="space-y-2 text-sm text-amber-700">
          <div className="flex items-start gap-2">
            <span className="font-bold text-amber-600">❓</span>
            <div>
              <strong>البيانات لا تُحفظ؟</strong>
              <p className="text-xs mt-0.5">تأكد من تنفيذ ملف SQL كاملاً (يتضمن تعطيل RLS ومنح الصلاحيات)</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-amber-600">❓</span>
            <div>
              <strong>خطأ "permission denied"؟</strong>
              <p className="text-xs mt-0.5">شغّل هذا الأمر في SQL Editor: <code className="bg-amber-100 px-1 rounded" dir="ltr">ALTER TABLE اسم_الجدول DISABLE ROW LEVEL SECURITY;</code></p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-amber-600">❓</span>
            <div>
              <strong>الاتصال يفشل؟</strong>
              <p className="text-xs mt-0.5">تأكد من نسخ الرابط من Project Settings → API وليس من مكان آخر</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6 text-blue-600" />
          </div>
          <h4 className="font-bold text-gray-800 text-sm">مزامنة فورية</h4>
          <p className="text-xs text-gray-500 mt-1">كل تغيير يُحفظ تلقائياً على السحابة</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <h4 className="font-bold text-gray-800 text-sm">آمن ومشفّر</h4>
          <p className="text-xs text-gray-500 mt-1">بيانات محمية ومشفرة SSL</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Globe className="w-6 h-6 text-purple-600" />
          </div>
          <h4 className="font-bold text-gray-800 text-sm">وصول من أي مكان</h4>
          <p className="text-xs text-gray-500 mt-1">افتح النظام من أي جهاز وستجد بياناتك</p>
        </div>
      </div>
    </div>
  );
}
