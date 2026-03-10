import { useState } from 'react';
import { Currency, AppSettings } from '../types';
import { generateId } from '../data';
import SettingsSystem from './SettingsSystem';
import SettingsDatabase from './SettingsDatabase';
import {
  Settings as SettingsIcon, Building2, Coins, Users, Receipt, Shield, Palette,
  Plus, Edit3, Trash2, X, Check, Star, ArrowLeftRight,
  Phone, Mail, MapPin, Clock, Percent, FileText, Wrench,
  ChevronDown, ChevronUp, Globe, Calculator, Database, Upload
} from 'lucide-react';

interface Props {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  currencies: Currency[];
  setCurrencies: React.Dispatch<React.SetStateAction<Currency[]>>;
  onResetData: () => void;
  onConnectToCloud: (config: { url: string; anonKey: string }) => Promise<boolean>;
  isCloudConnected: boolean;
  onUploadData?: () => Promise<boolean>;
  onDownloadData?: () => Promise<boolean>;
}

type SettingsTab = 'center' | 'currencies' | 'technicians' | 'taxes' | 'receipt' | 'system' | 'database';

const emptyCurrency: Omit<Currency, 'id'> = {
  code: '', nameAr: '', nameEn: '', symbol: '', exchangeRate: 1,
  isDefault: false, decimalPlaces: 2, symbolPosition: 'after',
};

export default function Settings({ settings, setSettings, currencies, setCurrencies, onResetData, onConnectToCloud, isCloudConnected, onUploadData, onDownloadData }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('center');
  const [showCurrencyForm, setShowCurrencyForm] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [currencyForm, setCurrencyForm] = useState(emptyCurrency);
  const [newTechnician, setNewTechnician] = useState('');
  const [showConverter, setShowConverter] = useState(false);
  const [convertAmount, setConvertAmount] = useState(100);
  const [convertFrom, setConvertFrom] = useState('');
  const [convertTo, setConvertTo] = useState('');
  const [saved, setSaved] = useState(false);
  const [expandedCurrency, setExpandedCurrency] = useState<string | null>(null);

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'center', label: 'معلومات المركز', icon: Building2, color: 'text-blue-500' },
    { id: 'currencies', label: 'العملات', icon: Coins, color: 'text-amber-500' },
    { id: 'technicians', label: 'الفنيين', icon: Users, color: 'text-purple-500' },
    { id: 'taxes', label: 'الضرائب', icon: Percent, color: 'text-green-500' },
    { id: 'receipt', label: 'الفاتورة', icon: Receipt, color: 'text-indigo-500' },
    { id: 'database', label: 'قاعدة البيانات', icon: Database, color: 'text-cyan-500' },
    { id: 'system', label: 'النظام', icon: Shield, color: 'text-red-500' },
  ];

  // ============ Currency Handlers ============
  const handleCurrencySubmit = () => {
    if (!currencyForm.code || !currencyForm.nameAr || !currencyForm.symbol) return;
    if (editingCurrency) {
      setCurrencies(prev => prev.map(c => c.id === editingCurrency.id ? { ...editingCurrency, ...currencyForm } : c));
    } else {
      setCurrencies(prev => [...prev, { ...currencyForm, id: generateId() }]);
    }
    setCurrencyForm(emptyCurrency);
    setEditingCurrency(null);
    setShowCurrencyForm(false);
    showSaved();
  };

  const handleEditCurrency = (currency: Currency) => {
    setEditingCurrency(currency);
    setCurrencyForm(currency);
    setShowCurrencyForm(true);
  };

  const handleDeleteCurrency = (id: string) => {
    const currency = currencies.find(c => c.id === id);
    if (currency?.isDefault) {
      alert('لا يمكن حذف العملة الافتراضية. قم بتعيين عملة أخرى كافتراضية أولاً.');
      return;
    }
    if (confirm('هل أنت متأكد من حذف هذه العملة؟')) {
      setCurrencies(prev => prev.filter(c => c.id !== id));
      showSaved();
    }
  };

  const setDefaultCurrency = (id: string) => {
    setCurrencies(prev => prev.map(c => ({ ...c, isDefault: c.id === id })));
    showSaved();
  };

  const defaultCurrency = currencies.find(c => c.isDefault) || currencies[0];

  // ============ Technician Handlers ============
  const addTechnician = () => {
    if (!newTechnician.trim()) return;
    if (settings.technicians.includes(newTechnician.trim())) {
      alert('هذا الفني موجود بالفعل');
      return;
    }
    setSettings(prev => ({ ...prev, technicians: [...prev.technicians, newTechnician.trim()] }));
    setNewTechnician('');
    showSaved();
  };

  const removeTechnician = (name: string) => {
    if (confirm(`هل أنت متأكد من حذف الفني "${name}"؟`)) {
      setSettings(prev => ({ ...prev, technicians: prev.technicians.filter(t => t !== name) }));
      showSaved();
    }
  };

  // ============ Converter ============
  const getConvertedAmount = () => {
    const from = currencies.find(c => c.id === convertFrom);
    const to = currencies.find(c => c.id === convertTo);
    if (!from || !to) return 0;
    const baseAmount = convertAmount / from.exchangeRate;
    return baseAmount * to.exchangeRate;
  };

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 hover:bg-white transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="space-y-6 animate-slideIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <SettingsIcon className="w-7 h-7 text-gray-600" />
            الإعدادات
          </h1>
          <p className="text-gray-500 text-sm mt-1">إعدادات المركز والعملات والنظام</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm font-medium animate-fadeIn">
            <Check className="w-4 h-4" /> تم الحفظ بنجاح
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-500' : tab.color}`} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ============ CENTER INFO TAB ============ */}
          {activeTab === 'center' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">معلومات المركز</h2>
                  <p className="text-sm text-gray-500">البيانات الأساسية لمركز الصيانة</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    <Building2 className="w-3.5 h-3.5 inline ml-1 text-gray-400" />
                    اسم المركز
                  </label>
                  <input type="text" value={settings.centerName}
                    onChange={e => { setSettings(p => ({ ...p, centerName: e.target.value })); showSaved(); }}
                    className={inputClass} placeholder="اسم مركز الصيانة" />
                </div>
                <div>
                  <label className={labelClass}>
                    <Phone className="w-3.5 h-3.5 inline ml-1 text-gray-400" />
                    رقم الهاتف
                  </label>
                  <input type="tel" value={settings.centerPhone}
                    onChange={e => { setSettings(p => ({ ...p, centerPhone: e.target.value })); showSaved(); }}
                    className={inputClass} placeholder="05xxxxxxxx" dir="ltr" />
                </div>
                <div>
                  <label className={labelClass}>
                    <Mail className="w-3.5 h-3.5 inline ml-1 text-gray-400" />
                    البريد الإلكتروني
                  </label>
                  <input type="email" value={settings.centerEmail}
                    onChange={e => { setSettings(p => ({ ...p, centerEmail: e.target.value })); showSaved(); }}
                    className={inputClass} placeholder="info@example.com" dir="ltr" />
                </div>
                <div>
                  <label className={labelClass}>
                    <Clock className="w-3.5 h-3.5 inline ml-1 text-gray-400" />
                    ساعات العمل
                  </label>
                  <input type="text" value={settings.workingHours}
                    onChange={e => { setSettings(p => ({ ...p, workingHours: e.target.value })); showSaved(); }}
                    className={inputClass} placeholder="السبت - الخميس: 9 ص - 9 م" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>
                    <MapPin className="w-3.5 h-3.5 inline ml-1 text-gray-400" />
                    العنوان
                  </label>
                  <input type="text" value={settings.centerAddress}
                    onChange={e => { setSettings(p => ({ ...p, centerAddress: e.target.value })); showSaved(); }}
                    className={inputClass} placeholder="العنوان التفصيلي" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>
                    <Palette className="w-3.5 h-3.5 inline ml-1 text-gray-400" />
                    شعار المركز
                  </label>
                  
                  {/* Logo Upload Section */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    {/* Current Logo Preview */}
                    <div className="flex-shrink-0">
                      {settings.centerLogo ? (
                        <div className="relative group">
                          <img 
                            src={settings.centerLogo} 
                            alt="Logo" 
                            className="w-24 h-24 rounded-2xl object-cover border-2 border-gray-200 shadow-md"
                          />
                          <button
                            onClick={() => { setSettings(p => ({ ...p, centerLogo: '' })); showSaved(); }}
                            className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600"
                            title="حذف الشعار"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300">
                          <Building2 className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Upload Options */}
                    <div className="flex-1 space-y-3">
                      {/* Upload from device */}
                      <div>
                        <label className="flex items-center gap-2 px-4 py-3 bg-gradient-to-l from-blue-500 to-blue-600 text-white rounded-xl cursor-pointer hover:shadow-lg transition-all w-full sm:w-auto justify-center font-medium">
                          <Upload className="w-5 h-5" />
                          رفع شعار من الجهاز
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Check file size (max 2MB)
                                if (file.size > 2 * 1024 * 1024) {
                                  alert('حجم الملف كبير جداً. الحد الأقصى 2 ميجابايت');
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const base64 = event.target?.result as string;
                                  setSettings(p => ({ ...p, centerLogo: base64 }));
                                  showSaved();
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG - الحد الأقصى 2 ميجابايت</p>
                      </div>
                      
                      {/* Or use URL */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-white px-3 text-xs text-gray-400">أو أدخل رابط URL</span>
                        </div>
                      </div>
                      
                      <input 
                        type="url" 
                        value={settings.centerLogo?.startsWith('data:') ? '' : settings.centerLogo}
                        onChange={e => { setSettings(p => ({ ...p, centerLogo: e.target.value })); showSaved(); }}
                        className={inputClass} 
                        placeholder="https://example.com/logo.png" 
                        dir="ltr" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
                <p className="text-xs text-slate-400 mb-3">معاينة بطاقة المركز</p>
                <div className="flex items-center gap-4">
                  {settings.centerLogo ? (
                    <img src={settings.centerLogo} alt="Logo" className="w-16 h-16 rounded-xl object-cover bg-white" />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl font-bold">
                      {settings.centerName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{settings.centerName || 'اسم المركز'}</h3>
                    <p className="text-slate-300 text-sm mt-1">{settings.centerPhone} • {settings.centerEmail}</p>
                    <p className="text-slate-400 text-xs mt-1">{settings.centerAddress}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{settings.workingHours}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ CURRENCIES TAB ============ */}
          {activeTab === 'currencies' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-50 rounded-xl">
                    <Coins className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">إدارة العملات</h2>
                    <p className="text-sm text-gray-500">
                      العملة الافتراضية: <strong className="text-amber-600">{defaultCurrency?.nameAr} ({defaultCurrency?.symbol})</strong>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowConverter(!showConverter)}
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition-all text-sm font-medium">
                    <Calculator className="w-4 h-4" /> محول العملات
                  </button>
                  <button onClick={() => { setShowCurrencyForm(true); setEditingCurrency(null); setCurrencyForm(emptyCurrency); }}
                    className="flex items-center gap-2 bg-gradient-to-l from-amber-500 to-amber-400 text-white px-4 py-2.5 rounded-xl hover:shadow-lg transition-all text-sm font-medium">
                    <Plus className="w-4 h-4" /> إضافة عملة
                  </button>
                </div>
              </div>

              {/* Currency Converter */}
              {showConverter && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-200 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-indigo-800">محول العملات</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">المبلغ</label>
                      <input type="number" value={convertAmount}
                        onChange={e => setConvertAmount(Number(e.target.value))}
                        className={inputClass} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">من عملة</label>
                      <select value={convertFrom} onChange={e => setConvertFrom(e.target.value)} className={inputClass}>
                        <option value="">اختر</option>
                        {currencies.map(c => (
                          <option key={c.id} value={c.id}>{c.nameAr} ({c.code})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">إلى عملة</label>
                      <select value={convertTo} onChange={e => setConvertTo(e.target.value)} className={inputClass}>
                        <option value="">اختر</option>
                        {currencies.map(c => (
                          <option key={c.id} value={c.id}>{c.nameAr} ({c.code})</option>
                        ))}
                      </select>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center border border-indigo-200">
                      <p className="text-xs text-gray-500">النتيجة</p>
                      <p className="text-xl font-bold text-indigo-700">
                        {convertFrom && convertTo
                          ? `${getConvertedAmount().toFixed(currencies.find(c => c.id === convertTo)?.decimalPlaces || 2)} ${currencies.find(c => c.id === convertTo)?.symbol || ''}`
                          : '---'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Currencies Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {currencies.map(currency => (
                  <div
                    key={currency.id}
                    className={`bg-white rounded-2xl border-2 transition-all hover:shadow-md ${
                      currency.isDefault ? 'border-amber-300 shadow-amber-100 shadow-md' : 'border-gray-100'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                            currency.isDefault
                              ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {currency.symbol}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800">{currency.nameAr}</h3>
                            <p className="text-xs text-gray-500">{currency.nameEn} • {currency.code}</p>
                          </div>
                        </div>
                        {currency.isDefault && (
                          <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium">
                            <Star className="w-3 h-3" /> افتراضي
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-gray-500">سعر الصرف:</span>
                        <span className="font-bold text-gray-800">{currency.exchangeRate}</span>
                      </div>

                      {/* Expandable Details */}
                      <button
                        onClick={() => setExpandedCurrency(expandedCurrency === currency.id ? null : currency.id)}
                        className="mt-2 w-full text-center text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1"
                      >
                        {expandedCurrency === currency.id ? (
                          <><ChevronUp className="w-3 h-3" /> إخفاء التفاصيل</>
                        ) : (
                          <><ChevronDown className="w-3 h-3" /> عرض التفاصيل</>
                        )}
                      </button>

                      {expandedCurrency === currency.id && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-sm animate-fadeIn">
                          <div className="flex justify-between">
                            <span className="text-gray-500">الخانات العشرية:</span>
                            <span className="text-gray-700">{currency.decimalPlaces}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">موضع الرمز:</span>
                            <span className="text-gray-700">{currency.symbolPosition === 'before' ? 'قبل المبلغ' : 'بعد المبلغ'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">مثال:</span>
                            <span className="font-bold text-gray-800">
                              {currency.symbolPosition === 'before'
                                ? `${currency.symbol}1,000`
                                : `1,000 ${currency.symbol}`
                              }
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
                      <div className="flex gap-1">
                        <button onClick={() => handleEditCurrency(currency)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="تعديل">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteCurrency(currency.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {!currency.isDefault && (
                        <button onClick={() => setDefaultCurrency(currency.id)}
                          className="text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1">
                          <Star className="w-3 h-3" /> تعيين كافتراضي
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Exchange Rate Reference */}
              <div className="bg-gray-50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-5 h-5 text-gray-500" />
                  <h3 className="font-bold text-gray-700">جدول أسعار الصرف</h3>
                  <span className="text-xs text-gray-400">(نسبة إلى {defaultCurrency?.nameAr})</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">العملة</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">الرمز</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">الكود</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">سعر الصرف</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">1 {defaultCurrency?.nameAr} =</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currencies.map(c => (
                        <tr key={c.id} className={`border-b border-gray-100 ${c.isDefault ? 'bg-amber-50' : ''}`}>
                          <td className="py-2 px-3 font-medium">{c.nameAr}</td>
                          <td className="py-2 px-3 font-bold text-lg">{c.symbol}</td>
                          <td className="py-2 px-3 font-mono text-xs">{c.code}</td>
                          <td className="py-2 px-3">{c.exchangeRate}</td>
                          <td className="py-2 px-3 font-medium text-blue-600">
                            {c.exchangeRate.toFixed(c.decimalPlaces)} {c.symbol}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============ TECHNICIANS TAB ============ */}
          {activeTab === 'technicians' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">إدارة الفنيين</h2>
                  <p className="text-sm text-gray-500">إضافة وحذف فنيي الصيانة</p>
                </div>
              </div>

              {/* Add Technician */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newTechnician}
                  onChange={e => setNewTechnician(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTechnician()}
                  className={inputClass + " flex-1"}
                  placeholder="اسم الفني الجديد..."
                />
                <button onClick={addTechnician}
                  className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-all text-sm font-medium">
                  <Plus className="w-4 h-4" /> إضافة
                </button>
              </div>

              {/* Technicians List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {settings.technicians.map((tech, index) => (
                  <div key={index} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold">
                        {tech.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{tech}</p>
                        <p className="text-xs text-gray-400">فني صيانة</p>
                      </div>
                    </div>
                    <button onClick={() => removeTechnician(tech)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {settings.technicians.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>لا يوجد فنيين مسجلين</p>
                  <p className="text-sm mt-1">أضف فنيين لتعيينهم على أوامر الصيانة</p>
                </div>
              )}
            </div>
          )}

          {/* ============ TAXES TAB ============ */}
          {activeTab === 'taxes' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-50 rounded-xl">
                  <Percent className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">إعدادات الضرائب</h2>
                  <p className="text-sm text-gray-500">تكوين الضريبة وطريقة احتسابها</p>
                </div>
              </div>

              {/* Tax Toggle */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800">تفعيل الضريبة</h3>
                    <p className="text-sm text-gray-500 mt-1">عند التفعيل سيتم احتساب الضريبة على الفواتير</p>
                  </div>
                  <button
                    onClick={() => { setSettings(p => ({ ...p, taxEnabled: !p.taxEnabled })); showSaved(); }}
                    className={`w-14 h-7 rounded-full transition-all relative ${settings.taxEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow ${settings.taxEnabled ? 'left-1' : 'left-8'}`} />
                  </button>
                </div>
              </div>

              {settings.taxEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                  <div>
                    <label className={labelClass}>اسم الضريبة</label>
                    <input type="text" value={settings.taxName}
                      onChange={e => { setSettings(p => ({ ...p, taxName: e.target.value })); showSaved(); }}
                      className={inputClass} placeholder="مثال: ضريبة القيمة المضافة" />
                  </div>
                  <div>
                    <label className={labelClass}>نسبة الضريبة (%)</label>
                    <input type="number" value={settings.taxRate}
                      onChange={e => { setSettings(p => ({ ...p, taxRate: Number(e.target.value) })); showSaved(); }}
                      className={inputClass} min={0} max={100} step={0.5} />
                  </div>

                  {/* Tax Inclusive Toggle */}
                  <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-800">الأسعار شاملة الضريبة</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {settings.taxInclusive
                            ? 'الأسعار المعروضة تشمل الضريبة'
                            : 'الأسعار المعروضة لا تشمل الضريبة (تُضاف عند الفاتورة)'
                          }
                        </p>
                      </div>
                      <button
                        onClick={() => { setSettings(p => ({ ...p, taxInclusive: !p.taxInclusive })); showSaved(); }}
                        className={`w-14 h-7 rounded-full transition-all relative ${settings.taxInclusive ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow ${settings.taxInclusive ? 'left-1' : 'left-8'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Tax Calculation Example */}
                  <div className="md:col-span-2 bg-green-50 rounded-xl p-5 border border-green-200">
                    <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                      <Calculator className="w-4 h-4" /> مثال على احتساب الضريبة
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-white rounded-xl p-3">
                        <p className="text-xs text-gray-500 mb-1">السعر الأساسي</p>
                        <p className="text-lg font-bold text-gray-800">100 {defaultCurrency?.symbol}</p>
                      </div>
                      <div className="bg-white rounded-xl p-3">
                        <p className="text-xs text-gray-500 mb-1">{settings.taxName} ({settings.taxRate}%)</p>
                        <p className="text-lg font-bold text-green-600">
                          {settings.taxInclusive
                            ? (100 - (100 / (1 + settings.taxRate / 100))).toFixed(2)
                            : (100 * settings.taxRate / 100).toFixed(2)
                          } {defaultCurrency?.symbol}
                        </p>
                      </div>
                      <div className="bg-white rounded-xl p-3">
                        <p className="text-xs text-gray-500 mb-1">الإجمالي</p>
                        <p className="text-lg font-bold text-blue-600">
                          {settings.taxInclusive
                            ? '100.00'
                            : (100 + (100 * settings.taxRate / 100)).toFixed(2)
                          } {defaultCurrency?.symbol}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============ RECEIPT TAB ============ */}
          {activeTab === 'receipt' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <Receipt className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">إعدادات الفاتورة</h2>
                  <p className="text-sm text-gray-500">تخصيص شكل ومحتوى الفاتورة والإيصال</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>
                      <FileText className="w-3.5 h-3.5 inline ml-1 text-gray-400" />
                      بادئة رقم الأمر
                    </label>
                    <input type="text" value={settings.orderPrefix}
                      onChange={e => { setSettings(p => ({ ...p, orderPrefix: e.target.value })); showSaved(); }}
                      className={inputClass} placeholder="MTC" dir="ltr" />
                    <p className="text-xs text-gray-400 mt-1">مثال: {settings.orderPrefix}-2401-0001</p>
                  </div>
                  <div>
                    <label className={labelClass}>مدة الضمان الافتراضية (يوم)</label>
                    <input type="number" value={settings.defaultWarrantyDays}
                      onChange={e => { setSettings(p => ({ ...p, defaultWarrantyDays: Number(e.target.value) })); showSaved(); }}
                      className={inputClass} min={0} />
                  </div>
                  <div>
                    <label className={labelClass}>نص رأس الفاتورة</label>
                    <textarea value={settings.receiptHeader}
                      onChange={e => { setSettings(p => ({ ...p, receiptHeader: e.target.value })); showSaved(); }}
                      className={inputClass + " min-h-[80px]"} placeholder="نص يظهر أعلى الفاتورة" />
                  </div>
                  <div>
                    <label className={labelClass}>نص ذيل الفاتورة</label>
                    <textarea value={settings.receiptFooter}
                      onChange={e => { setSettings(p => ({ ...p, receiptFooter: e.target.value })); showSaved(); }}
                      className={inputClass + " min-h-[80px]"} placeholder="نص يظهر أسفل الفاتورة" />
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 font-medium">عرض الشعار في الفاتورة</span>
                      <button
                        onClick={() => { setSettings(p => ({ ...p, showLogoOnReceipt: !p.showLogoOnReceipt })); showSaved(); }}
                        className={`w-14 h-7 rounded-full transition-all relative ${settings.showLogoOnReceipt ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow ${settings.showLogoOnReceipt ? 'left-1' : 'left-8'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Receipt Preview */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">معاينة الفاتورة</p>
                  <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-6 text-center space-y-4">
                    {settings.showLogoOnReceipt && (
                      settings.centerLogo ? (
                        <img src={settings.centerLogo} alt="Logo" className="w-16 h-16 mx-auto rounded-xl object-cover" />
                      ) : (
                        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                          {settings.centerName.charAt(0)}
                        </div>
                      )
                    )}
                    <div>
                      <h3 className="font-bold text-lg">{settings.centerName}</h3>
                      <p className="text-xs text-gray-500">{settings.receiptHeader}</p>
                    </div>
                    <div className="border-t border-b border-gray-200 py-3 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>رقم الأمر:</span>
                        <span className="font-mono">{settings.orderPrefix}-2401-0001</span>
                      </div>
                      <div className="flex justify-between text-gray-600 mt-1">
                        <span>التاريخ:</span>
                        <span>{new Date().toLocaleDateString('ar-SA')}</span>
                      </div>
                    </div>
                    <div className="text-sm">
                      <div className="flex justify-between py-1">
                        <span>إصلاح الجهاز</span>
                        <span>300 {defaultCurrency?.symbol}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>قطع غيار</span>
                        <span>200 {defaultCurrency?.symbol}</span>
                      </div>
                      {settings.taxEnabled && (
                        <div className="flex justify-between py-1 text-green-600">
                          <span>{settings.taxName} ({settings.taxRate}%)</span>
                          <span>{settings.taxInclusive ? 'شامل' : `${(500 * settings.taxRate / 100).toFixed(0)} ${defaultCurrency?.symbol}`}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 border-t border-gray-200 font-bold text-lg mt-2">
                        <span>الإجمالي</span>
                        <span>
                          {settings.taxEnabled && !settings.taxInclusive
                            ? (500 + 500 * settings.taxRate / 100).toFixed(0)
                            : 500
                          } {defaultCurrency?.symbol}
                        </span>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">{settings.receiptFooter}</p>
                      <p className="text-xs text-gray-400 mt-1">ضمان {settings.defaultWarrantyDays} يوم</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ SYSTEM TAB ============ */}
          {activeTab === 'system' && (
            <SettingsSystem
              settings={settings}
              setSettings={setSettings}
              onResetData={onResetData}
              showSaved={showSaved}
              isCloudConnected={isCloudConnected}
            />
          )}

          {/* ============ DATABASE TAB ============ */}
          {activeTab === 'database' && (
            <SettingsDatabase
              onConnect={onConnectToCloud}
              isConnected={isCloudConnected}
              onUploadData={onUploadData}
              onDownloadData={onDownloadData}
            />
          )}
        </div>
      </div>

      {/* ============ CURRENCY FORM MODAL ============ */}
      {showCurrencyForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fadeIn">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                {editingCurrency ? 'تعديل العملة' : 'إضافة عملة جديدة'}
              </h2>
              <button onClick={() => { setShowCurrencyForm(false); setEditingCurrency(null); }}
                className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>كود العملة *</label>
                  <input type="text" value={currencyForm.code}
                    onChange={e => setCurrencyForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className={inputClass} placeholder="SAR" dir="ltr" maxLength={4} />
                </div>
                <div>
                  <label className={labelClass}>رمز العملة *</label>
                  <input type="text" value={currencyForm.symbol}
                    onChange={e => setCurrencyForm(p => ({ ...p, symbol: e.target.value }))}
                    className={inputClass} placeholder="ر.س" maxLength={5} />
                </div>
                <div>
                  <label className={labelClass}>الاسم بالعربية *</label>
                  <input type="text" value={currencyForm.nameAr}
                    onChange={e => setCurrencyForm(p => ({ ...p, nameAr: e.target.value }))}
                    className={inputClass} placeholder="ريال سعودي" />
                </div>
                <div>
                  <label className={labelClass}>الاسم بالإنجليزية</label>
                  <input type="text" value={currencyForm.nameEn}
                    onChange={e => setCurrencyForm(p => ({ ...p, nameEn: e.target.value }))}
                    className={inputClass} placeholder="Saudi Riyal" dir="ltr" />
                </div>
                <div>
                  <label className={labelClass}>سعر الصرف *</label>
                  <input type="number" value={currencyForm.exchangeRate || ''}
                    onChange={e => setCurrencyForm(p => ({ ...p, exchangeRate: Number(e.target.value) }))}
                    className={inputClass} step="0.0001" min="0" />
                  <p className="text-xs text-gray-400 mt-1">نسبة إلى العملة الأساسية</p>
                </div>
                <div>
                  <label className={labelClass}>الخانات العشرية</label>
                  <select value={currencyForm.decimalPlaces}
                    onChange={e => setCurrencyForm(p => ({ ...p, decimalPlaces: Number(e.target.value) }))}
                    className={inputClass}>
                    <option value={0}>0</option>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>موضع الرمز</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrencyForm(p => ({ ...p, symbolPosition: 'before' }))}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                        currencyForm.symbolPosition === 'before'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      قبل المبلغ: <strong>{currencyForm.symbol || '¤'}1,000</strong>
                    </button>
                    <button
                      onClick={() => setCurrencyForm(p => ({ ...p, symbolPosition: 'after' }))}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                        currencyForm.symbolPosition === 'after'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      بعد المبلغ: <strong>1,000 {currencyForm.symbol || '¤'}</strong>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => { setShowCurrencyForm(false); setEditingCurrency(null); }}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium">إلغاء</button>
              <button onClick={handleCurrencySubmit}
                className="px-6 py-2.5 bg-gradient-to-l from-amber-500 to-amber-400 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">
                {editingCurrency ? 'حفظ التعديلات' : 'إضافة العملة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
