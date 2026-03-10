import React, { useState, useEffect } from 'react';
import { AppSettings, BackupData } from '../types';
import { Shield, AlertTriangle, Download, Upload, RotateCcw, Wrench, FileText, Check, Database, Users, Package, ShoppingCart, HardDrive, Calendar, Clock } from 'lucide-react';

interface Props {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onResetData: () => void;
  showSaved: () => void;
  isCloudConnected: boolean;
}

// localStorage keys used by the app
const STORAGE_KEYS = {
  orders: 'mc_orders',
  customers: 'mc_customers',
  parts: 'mc_parts',
  procedures: 'mc_procedures',
  transactions: 'mc_transactions',
  currencies: 'mc_currencies',
  settings: 'mc_settings',
  users: 'mc_users',
};

export default function SettingsSystem({ settings, setSettings, onResetData, showSaved }: Props) {
  const [importStats, setImportStats] = useState<BackupData['stats'] | null>(null);
  const [importData, setImportData] = useState<BackupData | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [storageSize, setStorageSize] = useState('0');

  // Calculate storage size
  useEffect(() => {
    try {
      let total = 0;
      for (const key of Object.values(STORAGE_KEYS)) {
        const item = localStorage.getItem(key);
        if (item) total += item.length * 2; // UTF-16 = 2 bytes per char
      }
      if (total < 1024) setStorageSize(total + ' B');
      else if (total < 1024 * 1024) setStorageSize((total / 1024).toFixed(1) + ' KB');
      else setStorageSize((total / (1024 * 1024)).toFixed(2) + ' MB');
    } catch {
      setStorageSize('غير معروف');
    }
  }, []);

  const safeParseArray = (key: string): any[] => {
    try {
      const data = localStorage.getItem(key);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const safeParseObject = (key: string): any => {
    try {
      const data = localStorage.getItem(key);
      if (!data) return {};
      return JSON.parse(data);
    } catch {
      return {};
    }
  };

  const getCurrentStats = () => ({
    orders: safeParseArray(STORAGE_KEYS.orders).length,
    customers: safeParseArray(STORAGE_KEYS.customers).length,
    inventory: safeParseArray(STORAGE_KEYS.parts).length,
    transactions: safeParseArray(STORAGE_KEYS.transactions).length,
    users: safeParseArray(STORAGE_KEYS.users).length,
  });

  const currentStats = getCurrentStats();

  // ========== EXPORT BACKUP ==========
  const handleExportBackup = () => {
    try {
      const session = safeParseObject('mc_session');

      const backup: BackupData = {
        version: '3.0',
        timestamp: new Date().toISOString(),
        exportedBy: session?.username || 'admin',
        stats: currentStats,
        system: {
          settings: safeParseObject(STORAGE_KEYS.settings),
          currencies: safeParseArray(STORAGE_KEYS.currencies),
          users: safeParseArray(STORAGE_KEYS.users),
        },
        data: {
          orders: safeParseArray(STORAGE_KEYS.orders),
          customers: safeParseArray(STORAGE_KEYS.customers),
          inventory: safeParseArray(STORAGE_KEYS.parts),
          transactions: safeParseArray(STORAGE_KEYS.transactions),
        },
      };

      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const date = new Date().toISOString().split('T')[0];
      const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `maintenance-backup-${date}_${time}.json`;

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      // Trigger download
      link.click();

      // Cleanup after a delay
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 500);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Backup export error:', err);
      alert('حدث خطأ أثناء إنشاء النسخة الاحتياطية: ' + (err as Error).message);
    }
  };

  // ========== IMPORT BACKUP ==========
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be selected again
    event.target.value = '';

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          alert('الملف فارغ');
          return;
        }

        const json = JSON.parse(text) as BackupData;

        // Validate backup structure
        if (!json.data && !json.system) {
          alert('ملف النسخ الاحتياطي غير صالح. تأكد من اختيار ملف .json صحيح.');
          return;
        }

        setImportData(json);
        setImportStats({
          orders: json.data?.orders?.length || 0,
          customers: json.data?.customers?.length || 0,
          inventory: json.data?.inventory?.length || 0,
          transactions: json.data?.transactions?.length || 0,
          users: json.system?.users?.length || 0,
        });
      } catch (err) {
        console.error('File parse error:', err);
        alert('حدث خطأ أثناء قراءة الملف. تأكد من أن الملف بتنسيق JSON صحيح.');
      }
    };

    reader.onerror = () => {
      alert('حدث خطأ أثناء قراءة الملف');
    };

    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!importData) return;

    if (!confirm('هل أنت متأكد من استعادة هذه البيانات؟\n\nسيتم استبدال جميع البيانات الحالية بالكامل!\nهذا الإجراء لا يمكن التراجع عنه.')) {
      return;
    }

    try {
      // Restore System settings
      if (importData.system?.settings) {
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(importData.system.settings));
      }
      if (importData.system?.currencies?.length) {
        localStorage.setItem(STORAGE_KEYS.currencies, JSON.stringify(importData.system.currencies));
      }
      if (importData.system?.users?.length) {
        localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(importData.system.users));
      }

      // Restore Data
      if (importData.data?.orders) {
        localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(importData.data.orders));
      }
      if (importData.data?.customers) {
        localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(importData.data.customers));
      }
      if (importData.data?.inventory) {
        localStorage.setItem(STORAGE_KEYS.parts, JSON.stringify(importData.data.inventory));
      }
      if (importData.data?.transactions) {
        localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(importData.data.transactions));
      }

      alert('✅ تمت استعادة البيانات بنجاح!\nسيتم إعادة تحميل الصفحة الآن.');
      window.location.reload();
    } catch (err) {
      console.error('Restore error:', err);
      alert('حدث خطأ أثناء استعادة البيانات: ' + (err as Error).message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-red-50 rounded-xl">
          <Shield className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">إعدادات النظام والنسخ الاحتياطي</h2>
          <p className="text-sm text-gray-500">إدارة النسخ الاحتياطي واستعادة البيانات</p>
        </div>
      </div>

      {/* Database Statistics Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-400" />
            <div>
              <h3 className="font-bold text-lg">إحصائيات قاعدة البيانات</h3>
              <p className="text-slate-400 text-xs">حجم البيانات الحالي في النظام</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-1.5 rounded-lg">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-cyan-300 font-mono">{storageSize}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-slate-700/50 p-3 rounded-xl text-center">
            <FileText className="w-5 h-5 mx-auto mb-2 text-blue-400" />
            <div className="text-2xl font-bold">{currentStats.orders}</div>
            <div className="text-xs text-slate-400">أمر صيانة</div>
          </div>
          <div className="bg-slate-700/50 p-3 rounded-xl text-center">
            <Users className="w-5 h-5 mx-auto mb-2 text-green-400" />
            <div className="text-2xl font-bold">{currentStats.customers}</div>
            <div className="text-xs text-slate-400">عميل</div>
          </div>
          <div className="bg-slate-700/50 p-3 rounded-xl text-center">
            <Package className="w-5 h-5 mx-auto mb-2 text-amber-400" />
            <div className="text-2xl font-bold">{currentStats.inventory}</div>
            <div className="text-xs text-slate-400">صنف مخزون</div>
          </div>
          <div className="bg-slate-700/50 p-3 rounded-xl text-center">
            <ShoppingCart className="w-5 h-5 mx-auto mb-2 text-purple-400" />
            <div className="text-2xl font-bold">{currentStats.transactions}</div>
            <div className="text-xs text-slate-400">معاملة مالية</div>
          </div>
          <div className="bg-slate-700/50 p-3 rounded-xl text-center">
            <Users className="w-5 h-5 mx-auto mb-2 text-red-400" />
            <div className="text-2xl font-bold">{currentStats.users}</div>
            <div className="text-xs text-slate-400">مستخدم</div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert Setting */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              تنبيهات المخزون المنخفض
            </h3>
            <p className="text-sm text-gray-500 mt-1">تنبيه عندما ينخفض مخزون قطعة عن الحد الأدنى</p>
          </div>
          <button
            onClick={() => { setSettings(p => ({ ...p, lowStockAlert: !p.lowStockAlert })); showSaved(); }}
            className={`w-14 h-7 rounded-full transition-all relative ${settings.lowStockAlert ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow ${settings.lowStockAlert ? 'left-1' : 'left-8'}`} />
          </button>
        </div>
      </div>

      {/* Backup & Restore Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="bg-white rounded-2xl border border-blue-100 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Download className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">نسخ احتياطي كامل</h3>
              <p className="text-xs text-gray-500">حفظ نسخة كاملة من جميع بيانات النظام</p>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-xl p-4 mb-4 text-sm text-blue-800">
            <p className="font-medium mb-2">سيتم تحميل ملف يحتوي على:</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span>✅ الإعدادات والعملات</span>
              <span>✅ المستخدمين والصلاحيات</span>
              <span>✅ العملاء والأوامر</span>
              <span>✅ المخزون والقطع</span>
              <span>✅ المعاملات المالية</span>
              <span>✅ الدفعات والإجراءات</span>
            </div>
          </div>

          {exportSuccess && (
            <div className="mb-4 bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-fadeIn">
              <Check className="w-5 h-5" /> تم تحميل النسخة الاحتياطية بنجاح!
            </div>
          )}

          <button
            onClick={handleExportBackup}
            className="w-full py-3.5 bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-[0.98]"
          >
            <Download className="w-5 h-5" /> تحميل النسخة الاحتياطية
          </button>
          
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Calendar className="w-3 h-3" />
            <span>آخر نسخة: {new Date().toLocaleDateString('ar-SA')}</span>
            <Clock className="w-3 h-3 mr-2" />
            <span>{new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Import Card */}
        <div className="bg-white rounded-2xl border border-green-100 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <Upload className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">استعادة نسخة احتياطية</h3>
              <p className="text-xs text-gray-500">استرجاع البيانات من ملف سابق</p>
            </div>
          </div>

          {!importData ? (
            <>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                اختر ملف النسخ الاحتياطي (.json) لاستعادة البيانات.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span><strong>تنبيه:</strong> سيتم استبدال جميع البيانات الحالية بالكامل! تأكد من عمل نسخة احتياطية أولاً.</span>
              </div>
              <label className="w-full py-3.5 bg-white border-2 border-dashed border-green-300 hover:border-green-500 hover:bg-green-50 text-green-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]">
                <Upload className="w-5 h-5" /> اختيار ملف الاستعادة (.json)
                <input type="file" accept=".json,application/json" onChange={handleFileSelect} className="hidden" />
              </label>
            </>
          ) : (
            <div className="animate-fadeIn">
              <div className="bg-green-50 rounded-xl p-4 mb-4 border border-green-200">
                <h4 className="font-bold text-green-800 text-sm mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4" /> تم تحليل الملف بنجاح
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    تاريخ: <span className="font-mono">{importData.timestamp ? new Date(importData.timestamp).toLocaleDateString('ar-SA') : 'غير محدد'}</span>
                  </div>
                  <div>الإصدار: <span className="font-mono">{importData.version || '1.0'}</span></div>
                  <div>المصدر: <span className="font-mono">{importData.exportedBy || 'غير محدد'}</span></div>
                </div>
                <div className="pt-3 border-t border-green-200 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-green-100">
                    <span className="block font-bold text-lg text-green-700">{importStats?.orders || 0}</span>
                    <span className="text-gray-500">أوامر</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-green-100">
                    <span className="block font-bold text-lg text-green-700">{importStats?.customers || 0}</span>
                    <span className="text-gray-500">عملاء</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-green-100">
                    <span className="block font-bold text-lg text-green-700">{importStats?.users || 0}</span>
                    <span className="text-gray-500">مستخدمين</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setImportData(null); setImportStats(null); }}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmImport}
                  className="flex-[2] py-2.5 bg-gradient-to-l from-green-600 to-green-700 text-white rounded-xl font-bold hover:from-green-700 hover:to-green-800 shadow-lg shadow-green-200 transition-all"
                >
                  ✅ تأكيد الاستعادة
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reset Data Danger Zone */}
      <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <RotateCcw className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-red-800">منطقة الخطر</h3>
            <p className="text-xs text-red-600">الإجراءات هنا لا يمكن التراجع عنها</p>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <p className="text-sm text-gray-700 max-w-lg">
            سيتم حذف جميع البيانات وإعادة النظام إلى حالة المصنع الافتراضية. يُنصح بعمل نسخة احتياطية أولاً.
          </p>
          <button onClick={onResetData}
            className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg shadow-red-200">
            <RotateCcw className="w-4 h-4" /> إعادة تعيين المصنع
          </button>
        </div>
      </div>

      {/* App Info Footer */}
      <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg">
          <Wrench className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-gray-800 text-lg">نظام إدارة مركز الصيانة</h3>
        <p className="text-gray-500 text-sm mt-1">الإصدار 3.0.0</p>
        <p className="text-gray-400 text-xs mt-2">نظام متكامل لإدارة مراكز الصيانة وقطع الغيار والمالية</p>
      </div>
    </div>
  );
}
