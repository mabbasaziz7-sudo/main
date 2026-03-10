import { useState } from 'react';
import { SparePart, Currency } from '../types';
import { generateId, partCategories, formatCurrency, getCurrencySymbol } from '../data';
import { Plus, Search, Edit3, Trash2, X, AlertTriangle, Package } from 'lucide-react';

interface Props {
  parts: SparePart[];
  currencies: Currency[];
  setParts: React.Dispatch<React.SetStateAction<SparePart[]>>;
}

const emptyPart: Omit<SparePart, 'id'> = {
  name: '', category: 'أخرى', partNumber: '', quantity: 0, minQuantity: 0,
  purchasePrice: 0, sellingPrice: 0, supplier: '', location: '',
};

export default function SpareParts({ parts, currencies, setParts }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [formData, setFormData] = useState(emptyPart);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  const fc = (amount: number) => formatCurrency(amount, currencies);
  const cs = getCurrencySymbol(currencies);

  const filteredParts = parts.filter(p => {
    const matchSearch = search === '' || p.name.includes(search) || p.partNumber.toLowerCase().includes(search.toLowerCase()) || p.supplier.includes(search);
    const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const matchStock = stockFilter === 'all' || (stockFilter === 'low' && p.quantity <= p.minQuantity) || (stockFilter === 'ok' && p.quantity > p.minQuantity);
    return matchSearch && matchCategory && matchStock;
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.partNumber) return;
    if (editingPart) {
      setParts(prev => prev.map(p => p.id === editingPart.id ? { ...editingPart, ...formData } : p));
    } else {
      setParts(prev => [...prev, { ...formData, id: generateId() }]);
    }
    setFormData(emptyPart);
    setEditingPart(null);
    setShowForm(false);
  };

  const handleEdit = (part: SparePart) => {
    setEditingPart(part);
    setFormData(part);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه القطعة؟')) {
      setParts(prev => prev.filter(p => p.id !== id));
    }
  };

  const totalValue = parts.reduce((sum, p) => sum + p.quantity * p.purchasePrice, 0);
  const lowStockCount = parts.filter(p => p.quantity <= p.minQuantity).length;
  const categories = [...new Set(parts.map(p => p.category))];

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="space-y-6 animate-slideIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">قطع الغيار والمخزون</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة مخزون قطع الغيار والمستلزمات</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingPart(null); setFormData(emptyPart); }}
          className="flex items-center gap-2 bg-gradient-to-l from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-xl hover:shadow-lg transition-all text-sm font-medium">
          <Plus className="w-4 h-4" /> إضافة قطعة جديدة
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">إجمالي الأصناف</p>
          <p className="text-2xl font-bold text-gray-800">{parts.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">إجمالي القطع</p>
          <p className="text-2xl font-bold text-gray-800">{parts.reduce((s, p) => s + p.quantity, 0)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">قيمة المخزون</p>
          <p className="text-2xl font-bold text-emerald-600">{fc(totalValue)}</p>
        </div>
        <div className={`bg-white rounded-2xl shadow-sm border p-4 ${lowStockCount > 0 ? 'border-red-200' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2">
            {lowStockCount > 0 && <AlertTriangle className="w-4 h-4 text-red-500" />}
            <p className="text-sm text-gray-500">مخزون منخفض</p>
          </div>
          <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>{lowStockCount}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="بحث بالاسم أو رقم القطعة أو المورد..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white appearance-none cursor-pointer">
          <option value="all">جميع الفئات</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={stockFilter} onChange={e => setStockFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white appearance-none cursor-pointer">
          <option value="all">جميع المخزون</option>
          <option value="low">مخزون منخفض</option>
          <option value="ok">مخزون كافي</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-right py-3 px-4 text-gray-500 font-medium">اسم القطعة</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">الفئة</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">رقم القطعة</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">الكمية</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">سعر الشراء</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">سعر البيع</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">المورد</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">الموقع</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredParts.map(part => (
                <tr key={part.id} className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${part.quantity <= part.minQuantity ? 'bg-red-50/30' : ''}`}>
                  <td className="py-3 px-4 font-medium">
                    <div className="flex items-center gap-2">
                      {part.quantity <= part.minQuantity && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                      {part.name}
                    </div>
                  </td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{part.category}</span></td>
                  <td className="py-3 px-4 font-mono text-xs">{part.partNumber}</td>
                  <td className="py-3 px-4">
                    <span className={`font-bold ${part.quantity <= part.minQuantity ? 'text-red-600' : 'text-gray-800'}`}>{part.quantity}</span>
                    <span className="text-gray-400 text-xs"> / {part.minQuantity} حد أدنى</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{fc(part.purchasePrice)}</td>
                  <td className="py-3 px-4 text-emerald-600 font-medium">{fc(part.sellingPrice)}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{part.supplier}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{part.location}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(part)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(part.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredParts.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  لا توجد قطع غيار مطابقة
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 px-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mb-10 animate-fadeIn">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">{editingPart ? 'تعديل قطعة غيار' : 'إضافة قطعة غيار جديدة'}</h2>
              <button onClick={() => { setShowForm(false); setEditingPart(null); }} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>اسم القطعة *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="اسم القطعة" />
                </div>
                <div>
                  <label className={labelClass}>رقم القطعة *</label>
                  <input type="text" value={formData.partNumber} onChange={e => setFormData(p => ({ ...p, partNumber: e.target.value }))} className={inputClass} placeholder="مثال: SCR-S23-001" />
                </div>
                <div>
                  <label className={labelClass}>الفئة</label>
                  <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} className={inputClass}>
                    {partCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>المورد</label>
                  <input type="text" value={formData.supplier} onChange={e => setFormData(p => ({ ...p, supplier: e.target.value }))} className={inputClass} placeholder="اسم المورد" />
                </div>
                <div>
                  <label className={labelClass}>الكمية</label>
                  <input type="number" value={formData.quantity || ''} onChange={e => setFormData(p => ({ ...p, quantity: Number(e.target.value) }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>الحد الأدنى</label>
                  <input type="number" value={formData.minQuantity || ''} onChange={e => setFormData(p => ({ ...p, minQuantity: Number(e.target.value) }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>سعر الشراء ({cs})</label>
                  <input type="number" value={formData.purchasePrice || ''} onChange={e => setFormData(p => ({ ...p, purchasePrice: Number(e.target.value) }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>سعر البيع ({cs})</label>
                  <input type="number" value={formData.sellingPrice || ''} onChange={e => setFormData(p => ({ ...p, sellingPrice: Number(e.target.value) }))} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>موقع التخزين</label>
                  <input type="text" value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} className={inputClass} placeholder="مثال: رف A1" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => { setShowForm(false); setEditingPart(null); }} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium">إلغاء</button>
              <button onClick={handleSubmit} className="px-6 py-2.5 bg-gradient-to-l from-blue-600 to-blue-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">
                {editingPart ? 'حفظ التعديلات' : 'إضافة القطعة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
