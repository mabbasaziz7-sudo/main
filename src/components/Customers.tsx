import { useState } from 'react';
import { Customer, ServiceOrder, Currency } from '../types';
import { generateId, statusLabels, statusColors, formatCurrency } from '../data';
import { Plus, Search, Edit3, Trash2, X, Users, Phone, Mail, MapPin, Eye } from 'lucide-react';

interface Props {
  customers: Customer[];
  orders: ServiceOrder[];
  currencies: Currency[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

const emptyCustomer: Omit<Customer, 'id' | 'createdAt'> = {
  name: '', phone: '', email: '', address: '',
};

export default function Customers({ customers, orders, currencies, setCustomers }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState(emptyCustomer);
  const [search, setSearch] = useState('');
  const [showHistory, setShowHistory] = useState<Customer | null>(null);

  const fc = (amount: number) => formatCurrency(amount, currencies);

  const filteredCustomers = customers.filter(c =>
    search === '' || c.name.includes(search) || c.phone.includes(search) || c.email.toLowerCase().includes(search.toLowerCase())
  );

  const getCustomerOrders = (customerId: string) => orders.filter(o => o.customerId === customerId);

  const handleSubmit = () => {
    if (!formData.name || !formData.phone) return;
    if (editingCustomer) {
      setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? { ...editingCustomer, ...formData } : c));
    } else {
      setCustomers(prev => [...prev, { ...formData, id: generateId(), createdAt: new Date().toISOString().split('T')[0] }]);
    }
    setFormData(emptyCustomer);
    setEditingCustomer(null);
    setShowForm(false);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData(customer);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const hasOrders = orders.some(o => o.customerId === id);
    if (hasOrders) {
      alert('لا يمكن حذف العميل لوجود أوامر صيانة مرتبطة به');
      return;
    }
    if (confirm('هل أنت متأكد من حذف هذا العميل؟')) {
      setCustomers(prev => prev.filter(c => c.id !== id));
    }
  };

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="space-y-6 animate-slideIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة العملاء</h1>
          <p className="text-gray-500 text-sm mt-1">قاعدة بيانات العملاء وسجل الصيانة</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingCustomer(null); setFormData(emptyCustomer); }}
          className="flex items-center gap-2 bg-gradient-to-l from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-xl hover:shadow-lg transition-all text-sm font-medium">
          <Plus className="w-4 h-4" /> إضافة عميل
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 rounded-xl"><Users className="w-6 h-6 text-purple-600" /></div>
            <div>
              <p className="text-sm text-gray-500">إجمالي العملاء</p>
              <p className="text-2xl font-bold text-gray-800">{customers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-xl"><Users className="w-6 h-6 text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-500">عملاء لديهم أوامر نشطة</p>
              <p className="text-2xl font-bold text-gray-800">
                {new Set(orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).map(o => o.customerId)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-xl"><Users className="w-6 h-6 text-emerald-600" /></div>
            <div>
              <p className="text-sm text-gray-500">إجمالي أوامر الصيانة</p>
              <p className="text-2xl font-bold text-gray-800">{orders.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="بحث بالاسم أو رقم الهاتف أو البريد..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => {
          const custOrders = getCustomerOrders(customer.id);
          const activeOrders = custOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));
          const totalSpent = custOrders.filter(o => o.isPaid).reduce((s, o) => s + o.paidAmount, 0);

          return (
            <div key={customer.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{customer.name}</h3>
                    <p className="text-xs text-gray-400">عميل منذ {customer.createdAt}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setShowHistory(customer)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="سجل الأوامر"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => handleEdit(customer)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(customer.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="حذف"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /><span dir="ltr">{customer.phone}</span>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400" /><span>{customer.email}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" /><span>{customer.address}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <div className="flex gap-3">
                  <span className="text-gray-500">الأوامر: <strong className="text-gray-700">{custOrders.length}</strong></span>
                  {activeOrders.length > 0 && (
                    <span className="text-blue-600">نشطة: <strong>{activeOrders.length}</strong></span>
                  )}
                </div>
                {totalSpent > 0 && (
                  <span className="text-emerald-600 font-medium">{fc(totalSpent)}</span>
                )}
              </div>
            </div>
          );
        })}
        {filteredCustomers.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg">لا يوجد عملاء مطابقين للبحث</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">{editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</h2>
              <button onClick={() => { setShowForm(false); setEditingCustomer(null); }} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelClass}>اسم العميل *</label>
                <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="الاسم الكامل" />
              </div>
              <div>
                <label className={labelClass}>رقم الهاتف *</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className={inputClass} placeholder="05xxxxxxxx" dir="ltr" />
              </div>
              <div>
                <label className={labelClass}>البريد الإلكتروني</label>
                <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className={inputClass} placeholder="email@example.com" dir="ltr" />
              </div>
              <div>
                <label className={labelClass}>العنوان</label>
                <input type="text" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} className={inputClass} placeholder="المدينة - الحي" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => { setShowForm(false); setEditingCustomer(null); }} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium">إلغاء</button>
              <button onClick={handleSubmit} className="px-6 py-2.5 bg-gradient-to-l from-blue-600 to-blue-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">
                {editingCustomer ? 'حفظ التعديلات' : 'إضافة العميل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 px-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mb-10 animate-fadeIn">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-800">سجل أوامر العميل</h2>
                <p className="text-sm text-gray-500">{showHistory.name} - {showHistory.phone}</p>
              </div>
              <button onClick={() => setShowHistory(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              {getCustomerOrders(showHistory.id).length === 0 ? (
                <p className="text-center text-gray-400 py-8">لا توجد أوامر صيانة لهذا العميل</p>
              ) : (
                <div className="space-y-3">
                  {getCustomerOrders(showHistory.id).map(order => (
                    <div key={order.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm font-semibold text-blue-600">{order.orderNumber}</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
                      </div>
                      <p className="text-sm text-gray-700">{order.deviceType} - {order.deviceBrand} {order.deviceModel}</p>
                      <p className="text-xs text-gray-500 mt-1">{order.problemDescription}</p>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>تاريخ الاستلام: {order.receivedDate}</span>
                        <span className="font-medium text-gray-700">{fc(order.finalCost || order.estimatedCost)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
