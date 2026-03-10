import { useState } from 'react';
import { Transaction, ServiceOrder, Currency, AppSettings, Payment } from '../types';
import { generateId, paymentMethods, formatCurrency, getCurrencySymbol, paymentTypeLabels, paymentTypeColors } from '../data';
import { Plus, Search, TrendingUp, TrendingDown, DollarSign, X, Filter, ArrowUpCircle, ArrowDownCircle, CreditCard, CheckCircle } from 'lucide-react';
import PaymentModal from './PaymentModal';
import ReceiptModal from './ReceiptModal';

interface Props {
  transactions: Transaction[];
  orders: ServiceOrder[];
  currencies: Currency[];
  settings: AppSettings;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setOrders: React.Dispatch<React.SetStateAction<ServiceOrder[]>>;
}

const emptyTransaction: Omit<Transaction, 'id'> = {
  orderId: '', type: 'income', category: '', amount: 0, date: new Date().toISOString().split('T')[0],
  description: '', paymentMethod: 'نقدي',
};

const incomeCategories = ['صيانة', 'عربون', 'بيع قطع غيار', 'استشارة', 'أخرى'];
const expenseCategories = ['قطع غيار', 'رواتب', 'إيجار', 'كهرباء ومياه', 'مصاريف عامة', 'معدات', 'استرداد', 'أخرى'];

export default function Financial({ transactions, orders, currencies, settings, setTransactions, setOrders }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyTransaction);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentOrder, setPaymentOrder] = useState<ServiceOrder | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<{ order: ServiceOrder; type: 'reception' | 'delivery' | 'payment' } | null>(null);

  const fc = (amount: number) => formatCurrency(amount, currencies);
  const cs = getCurrencySymbol(currencies);
  const defaultCur = currencies.find(c => c.isDefault) || currencies[0];
  const curName = defaultCur?.nameAr || 'ريال سعودي';

  const filteredTransactions = transactions.filter(t => {
    const matchSearch = search === '' || t.description.includes(search) || t.category.includes(search);
    const matchType = typeFilter === 'all' || t.type === typeFilter;
    const matchDateFrom = !dateFrom || t.date >= dateFrom;
    const matchDateTo = !dateTo || t.date <= dateTo;
    return matchSearch && matchType && matchDateFrom && matchDateTo;
  });

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = totalIncome - totalExpense;

  const allIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const allExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const categoryBreakdown = filteredTransactions.reduce((acc, t) => {
    const key = `${t.type}-${t.category}`;
    acc[key] = (acc[key] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const handleSubmit = () => {
    if (!formData.description || !formData.amount || !formData.category) return;
    const newTx: Transaction = { ...formData, id: generateId() };
    setTransactions(prev => [newTx, ...prev]);
    if (formData.orderId && formData.type === 'income') {
      setOrders(prev => prev.map(o => {
        if (o.id === formData.orderId) {
          const newPaid = o.paidAmount + formData.amount;
          const isPaid = newPaid >= (o.finalCost || o.estimatedCost);
          return { ...o, paidAmount: newPaid, isPaid };
        }
        return o;
      }));
    }
    setFormData(emptyTransaction);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه المعاملة؟')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handlePayment = (order: ServiceOrder, payment: Payment, transaction: Transaction) => {
    const isRefund = payment.type === 'refund';
    const newPaidAmount = isRefund ? order.paidAmount - payment.amount : order.paidAmount + payment.amount;
    const totalCost = order.finalCost || order.estimatedCost;
    const isPaid = newPaidAmount >= totalCost && totalCost > 0;

    const updatedOrder: ServiceOrder = {
      ...order,
      paidAmount: newPaidAmount,
      isPaid,
      payments: [...(order.payments || []), payment],
    };

    setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
    setTransactions(prev => [transaction, ...prev]);
    setPaymentOrder(null);
    setReceiptOrder({ order: updatedOrder, type: 'payment' });
  };

  const unpaidOrders = orders.filter(o => !o.isPaid && o.status !== 'cancelled' && (o.finalCost > 0 || o.estimatedCost > 0));

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="space-y-6 animate-slideIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">المالية والتكلفة</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة الإيرادات والمصروفات والتقارير المالية</p>
        </div>
        <button onClick={() => { setShowForm(true); setFormData(emptyTransaction); }}
          className="flex items-center gap-2 bg-gradient-to-l from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-xl hover:shadow-lg transition-all text-sm font-medium">
          <Plus className="w-4 h-4" /> تسجيل معاملة
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">إجمالي الإيرادات</p>
              <p className="text-3xl font-bold mt-1">{allIncome.toLocaleString()}</p>
              <p className="text-emerald-200 text-xs mt-1">{curName}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-emerald-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">إجمالي المصروفات</p>
              <p className="text-3xl font-bold mt-1">{allExpense.toLocaleString()}</p>
              <p className="text-red-200 text-xs mt-1">{curName}</p>
            </div>
            <TrendingDown className="w-10 h-10 text-red-200" />
          </div>
        </div>
        <div className={`bg-gradient-to-br ${(allIncome - allExpense) >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} rounded-2xl shadow-lg p-5 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">صافي الربح</p>
              <p className="text-3xl font-bold mt-1">{(allIncome - allExpense).toLocaleString()}</p>
              <p className="text-blue-200 text-xs mt-1">{curName}</p>
            </div>
            <DollarSign className="w-10 h-10 text-blue-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm">أوامر غير مدفوعة</p>
              <p className="text-3xl font-bold mt-1">{unpaidOrders.length}</p>
              <p className="text-amber-200 text-xs mt-1">أمر صيانة</p>
            </div>
            <Filter className="w-10 h-10 text-amber-200" />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white appearance-none cursor-pointer">
          <option value="all">الكل</option>
          <option value="income">إيرادات</option>
          <option value="expense">مصروفات</option>
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between text-sm flex-wrap gap-2">
              <span className="text-gray-600">المعاملات المصفاة: <strong>{filteredTransactions.length}</strong></span>
              <div className="flex gap-4">
                <span className="text-emerald-600">إيرادات: <strong>{fc(totalIncome)}</strong></span>
                <span className="text-red-600">مصروفات: <strong>{fc(totalExpense)}</strong></span>
                <span className={profit >= 0 ? 'text-blue-600' : 'text-orange-600'}>الصافي: <strong>{fc(profit)}</strong></span>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
            {filteredTransactions.map(tx => (
              <div key={tx.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${tx.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    {tx.type === 'income' ? <ArrowDownCircle className="w-5 h-5 text-emerald-600" /> : <ArrowUpCircle className="w-5 h-5 text-red-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{tx.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {tx.category}
                      </span>
                      <span className="text-xs text-gray-400">{tx.date}</span>
                      <span className="text-xs text-gray-400">{tx.paymentMethod}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {tx.type === 'income' ? '+' : '-'}{fc(tx.amount)}
                  </span>
                  <button onClick={() => handleDelete(tx.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {filteredTransactions.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>لا توجد معاملات مالية</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-4">تفصيل حسب الفئة</h3>
            <div className="space-y-2">
              {Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]).map(([key, amount]) => {
                const [type, category] = key.split('-');
                const isIncome = type === 'income';
                return (
                  <div key={key} className="flex items-center justify-between p-2 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isIncome ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className="text-sm text-gray-700">{category}</span>
                    </div>
                    <span className={`text-sm font-bold ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fc(amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {unpaidOrders.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5">
              <h3 className="font-bold text-amber-700 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> أوامر غير مدفوعة ({unpaidOrders.length})
              </h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {unpaidOrders.map(o => {
                  const total = o.finalCost || o.estimatedCost;
                  const rem = total - o.paidAmount;
                  const pct = total > 0 ? Math.round((o.paidAmount / total) * 100) : 0;
                  return (
                    <div key={o.id} className="p-3 bg-amber-50 rounded-xl text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-xs text-blue-600">{o.orderNumber}</span>
                        <span className="font-bold text-gray-800">{fc(total)}</span>
                      </div>
                      <p className="text-gray-600 text-xs mt-1">{o.customerName}</p>
                      
                      {/* Payment progress */}
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${pct > 50 ? 'bg-green-500' : pct > 0 ? 'bg-amber-500' : 'bg-gray-300'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-500">مدفوع: {fc(o.paidAmount)} ({pct}%)</span>
                          <span className="text-xs text-red-600 font-medium">متبقي: {fc(rem)}</span>
                        </div>
                      </div>

                      {/* Payment history badges */}
                      {o.payments && o.payments.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {o.payments.map(p => (
                            <span key={p.id} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${paymentTypeColors[p.type]}`}>
                              {paymentTypeLabels[p.type]}: {fc(p.amount)}
                            </span>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => setPaymentOrder(o)}
                        className="mt-2 w-full text-center py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <CreditCard className="w-3 h-3" /> تسجيل دفعة
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recently paid */}
          {orders.filter(o => o.isPaid && o.payments && o.payments.length > 0).length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-5">
              <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> مدفوعة بالكامل
              </h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {orders.filter(o => o.isPaid && o.payments && o.payments.length > 0).slice(0, 5).map(o => (
                  <div key={o.id} className="p-2 bg-green-50 rounded-lg text-xs flex justify-between items-center">
                    <div>
                      <span className="font-mono text-blue-600">{o.orderNumber}</span>
                      <span className="text-gray-500 mr-2">{o.customerName}</span>
                    </div>
                    <span className="font-bold text-green-600">{fc(o.paidAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 px-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mb-10 animate-fadeIn">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">تسجيل معاملة مالية</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <button onClick={() => setFormData(p => ({ ...p, type: 'income', category: '' }))}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${formData.type === 'income' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600'}`}>
                  <ArrowDownCircle className="w-4 h-4 inline ml-1" /> إيراد
                </button>
                <button onClick={() => setFormData(p => ({ ...p, type: 'expense', category: '' }))}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${formData.type === 'expense' ? 'bg-red-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600'}`}>
                  <ArrowUpCircle className="w-4 h-4 inline ml-1" /> مصروف
                </button>
              </div>
              <div>
                <label className={labelClass}>الفئة *</label>
                <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} className={inputClass}>
                  <option value="">-- اختر الفئة --</option>
                  {(formData.type === 'income' ? incomeCategories : expenseCategories).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>المبلغ ({cs}) *</label>
                <input type="number" value={formData.amount || ''} onChange={e => setFormData(p => ({ ...p, amount: Number(e.target.value) }))} className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className={labelClass}>الوصف *</label>
                <input type="text" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className={inputClass} placeholder="وصف المعاملة..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>التاريخ</label>
                  <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>طريقة الدفع</label>
                  <select value={formData.paymentMethod} onChange={e => setFormData(p => ({ ...p, paymentMethod: e.target.value }))} className={inputClass}>
                    {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              {formData.type === 'income' && (
                <div>
                  <label className={labelClass}>ربط بأمر صيانة (اختياري)</label>
                  <select value={formData.orderId} onChange={e => setFormData(p => ({ ...p, orderId: e.target.value }))} className={inputClass}>
                    <option value="">-- بدون ربط --</option>
                    {orders.filter(o => o.status !== 'cancelled').map(o => (
                      <option key={o.id} value={o.id}>{o.orderNumber} - {o.customerName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowForm(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium">إلغاء</button>
              <button onClick={handleSubmit}
                className={`px-6 py-2.5 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all ${formData.type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>
                تسجيل المعاملة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          currencies={currencies}
          settings={settings}
          onClose={() => setPaymentOrder(null)}
          onPayment={handlePayment}
        />
      )}

      {/* Receipt Modal */}
      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder.order}
          currencies={currencies}
          settings={settings}
          onClose={() => setReceiptOrder(null)}
          type={receiptOrder.type}
        />
      )}
    </div>
  );
}
