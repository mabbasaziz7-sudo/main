import { useState } from 'react';
import { ServiceOrder, Customer, Currency, AppSettings, Payment, Transaction } from '../types';
import { generateId, generateOrderNumber, statusLabels, statusColors, priorityLabels, priorityColors, deviceTypes, formatCurrency, getCurrencySymbol, paymentTypeLabels, paymentTypeColors } from '../data';
import { Plus, Search, Eye, Truck, X, Filter, Edit3, CreditCard, FileText, QrCode, CheckCircle } from 'lucide-react';
import ReceiptModal from './ReceiptModal';
import PaymentModal from './PaymentModal';

interface Props {
  orders: ServiceOrder[];
  customers: Customer[];
  currencies: Currency[];
  settings: AppSettings;
  transactions: Transaction[];
  setOrders: React.Dispatch<React.SetStateAction<ServiceOrder[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

const emptyOrder: Omit<ServiceOrder, 'id' | 'orderNumber'> = {
  customerId: '', customerName: '', deviceType: 'لابتوب', deviceBrand: '', deviceModel: '',
  serialNumber: '', problemDescription: '', status: 'received', receivedDate: new Date().toISOString().split('T')[0],
  expectedDate: '', deliveredDate: '', estimatedCost: 0, finalCost: 0, notes: '',
  accessories: '', deviceCondition: '', assignedTechnician: '', priority: 'medium', isPaid: false, paidAmount: 0,
  payments: [],
};

export default function Reception({ orders, customers, currencies, settings, transactions, setOrders, setTransactions }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<ServiceOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState(emptyOrder);
  const [receiptOrder, setReceiptOrder] = useState<{ order: ServiceOrder; type: 'reception' | 'delivery' | 'payment' } | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<ServiceOrder | null>(null);

  const fc = (amount: number) => formatCurrency(amount, currencies);
  const cs = getCurrencySymbol(currencies);
  void cs;
  void transactions;

  const filteredOrders = orders.filter(o => {
    const matchSearch = search === '' ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.includes(search) ||
      o.deviceBrand.toLowerCase().includes(search.toLowerCase()) ||
      o.deviceModel.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSubmit = () => {
    if (!formData.customerName || !formData.deviceBrand || !formData.problemDescription) return;
    if (editingOrder) {
      setOrders(prev => prev.map(o => o.id === editingOrder.id ? { ...editingOrder, ...formData } : o));
      setEditingOrder(null);
    } else {
      const newOrder: ServiceOrder = {
        ...formData,
        id: generateId(),
        orderNumber: generateOrderNumber(settings.orderPrefix),
      };
      setOrders(prev => [newOrder, ...prev]);
      // Show receipt for new order
      setTimeout(() => {
        setReceiptOrder({ order: newOrder, type: 'reception' });
      }, 100);
    }
    setFormData(emptyOrder);
    setShowForm(false);
  };

  const handleEdit = (order: ServiceOrder) => {
    setEditingOrder(order);
    setFormData(order);
    setShowForm(true);
    setShowDetail(null);
  };

  const handleDeliver = (order: ServiceOrder) => {
    const updatedOrder = {
      ...order,
      status: 'delivered' as const,
      deliveredDate: new Date().toISOString().split('T')[0],
    };
    setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
    setShowDetail(null);
    setReceiptOrder({ order: updatedOrder, type: 'delivery' });
  };

  const handleSelectCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({ ...prev, customerId: customer.id, customerName: customer.name }));
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
    setShowDetail(null);

    // Show payment receipt
    setReceiptOrder({ order: updatedOrder, type: 'payment' });
  };

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="space-y-6 animate-slideIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">تسليم وتسلم الأجهزة</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة استلام وتسليم أجهزة العملاء</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingOrder(null); setFormData(emptyOrder); }}
          className="flex items-center gap-2 bg-gradient-to-l from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-xl hover:shadow-lg transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> استلام جهاز جديد
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="بحث برقم الأمر، اسم العميل، أو الجهاز..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <div className="relative">
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-xl pr-10 pl-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer">
            <option value="all">جميع الحالات</option>
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-right py-3 px-4 text-gray-500 font-medium">رقم الأمر</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">العميل</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">الجهاز</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">الحالة</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">الدفع</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">الأولوية</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">تاريخ الاستلام</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => {
                const totalCost = order.finalCost || order.estimatedCost;
                const remaining = totalCost - order.paidAmount;
                const paidPct = totalCost > 0 ? Math.round((order.paidAmount / totalCost) * 100) : 0;

                return (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-blue-600">{order.orderNumber}</td>
                    <td className="py-3 px-4 font-medium">{order.customerName}</td>
                    <td className="py-3 px-4 text-gray-600">{order.deviceType} - {order.deviceBrand} {order.deviceModel}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {totalCost > 0 ? (
                        <div className="min-w-[80px]">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {order.isPaid ? (
                              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                <CheckCircle className="w-3 h-3" /> مدفوع
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">{paidPct}%</span>
                            )}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${order.isPaid ? 'bg-green-500' : paidPct > 0 ? 'bg-amber-500' : 'bg-gray-300'}`}
                              style={{ width: `${paidPct}%` }}
                            />
                          </div>
                          {remaining > 0 && !order.isPaid && (
                            <span className="text-[10px] text-red-500">متبقي: {fc(remaining)}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">لم تحدد</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${priorityColors[order.priority]}`}>
                        {priorityLabels[order.priority]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{order.receivedDate}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowDetail(order)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="عرض التفاصيل">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEdit(order)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg" title="تعديل">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setPaymentOrder(order)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="دفع">
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button onClick={() => setReceiptOrder({ order, type: 'reception' })} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg" title="إيصال">
                          <QrCode className="w-4 h-4" />
                        </button>
                        {order.status === 'ready' && (
                          <button onClick={() => handleDeliver(order)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="تسليم الجهاز">
                            <Truck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">لا توجد أوامر مطابقة للبحث</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New/Edit Order Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 px-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mb-10 animate-fadeIn">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">{editingOrder ? 'تعديل أمر الصيانة' : 'استلام جهاز جديد'}</h2>
              <button onClick={() => { setShowForm(false); setEditingOrder(null); }} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-bold text-blue-800 mb-3">معلومات العميل</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>اختيار عميل موجود</label>
                    <select value={formData.customerId} onChange={e => handleSelectCustomer(e.target.value)} className={inputClass}>
                      <option value="">-- اختر عميل --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>أو أدخل اسم العميل *</label>
                    <input type="text" value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} className={inputClass} placeholder="اسم العميل" />
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-xl p-4">
                <h3 className="font-bold text-purple-800 mb-3">معلومات الجهاز</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>نوع الجهاز *</label>
                    <select value={formData.deviceType} onChange={e => setFormData(p => ({ ...p, deviceType: e.target.value }))} className={inputClass}>
                      {deviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>الشركة المصنعة *</label>
                    <input type="text" value={formData.deviceBrand} onChange={e => setFormData(p => ({ ...p, deviceBrand: e.target.value }))} className={inputClass} placeholder="مثال: Samsung" />
                  </div>
                  <div>
                    <label className={labelClass}>الموديل</label>
                    <input type="text" value={formData.deviceModel} onChange={e => setFormData(p => ({ ...p, deviceModel: e.target.value }))} className={inputClass} placeholder="مثال: Galaxy S23" />
                  </div>
                  <div>
                    <label className={labelClass}>الرقم التسلسلي</label>
                    <input type="text" value={formData.serialNumber} onChange={e => setFormData(p => ({ ...p, serialNumber: e.target.value }))} className={inputClass} placeholder="S/N" />
                  </div>
                  <div>
                    <label className={labelClass}>حالة الجهاز</label>
                    <input type="text" value={formData.deviceCondition} onChange={e => setFormData(p => ({ ...p, deviceCondition: e.target.value }))} className={inputClass} placeholder="مثال: جيدة - خدوش بسيطة" />
                  </div>
                  <div>
                    <label className={labelClass}>المرفقات</label>
                    <input type="text" value={formData.accessories} onChange={e => setFormData(p => ({ ...p, accessories: e.target.value }))} className={inputClass} placeholder="مثال: شاحن - حقيبة" />
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-4">
                <h3 className="font-bold text-amber-800 mb-3">تفاصيل المشكلة والصيانة</h3>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>وصف المشكلة *</label>
                    <textarea value={formData.problemDescription} onChange={e => setFormData(p => ({ ...p, problemDescription: e.target.value }))} className={inputClass + " min-h-[80px]"} placeholder="وصف تفصيلي للمشكلة..." />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={labelClass}>الأولوية</label>
                      <select value={formData.priority} onChange={e => setFormData(p => ({ ...p, priority: e.target.value as ServiceOrder['priority'] }))} className={inputClass}>
                        {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>الفني المسؤول</label>
                      <select value={formData.assignedTechnician} onChange={e => setFormData(p => ({ ...p, assignedTechnician: e.target.value }))} className={inputClass}>
                        <option value="">-- اختر فني --</option>
                        {settings.technicians.map((t: string) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>تاريخ التسليم المتوقع</label>
                      <input type="date" value={formData.expectedDate} onChange={e => setFormData(p => ({ ...p, expectedDate: e.target.value }))} className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>التكلفة المقدرة ({getCurrencySymbol(currencies)})</label>
                      <input type="number" value={formData.estimatedCost || ''} onChange={e => setFormData(p => ({ ...p, estimatedCost: Number(e.target.value) }))} className={inputClass} placeholder="0" />
                    </div>
                    <div>
                      <label className={labelClass}>ملاحظات</label>
                      <input type="text" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} className={inputClass} placeholder="ملاحظات إضافية..." />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => { setShowForm(false); setEditingOrder(null); }} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium">إلغاء</button>
              <button onClick={handleSubmit} className="px-6 py-2.5 bg-gradient-to-l from-blue-600 to-blue-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">
                {editingOrder ? 'حفظ التعديلات' : 'تسجيل الاستلام'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 px-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mb-10 animate-fadeIn">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-800">تفاصيل أمر الصيانة</h2>
                <span className="font-mono text-sm text-blue-600">{showDetail.orderNumber}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setReceiptOrder({ order: showDetail, type: 'reception' })} className="p-2 hover:bg-gray-100 rounded-xl no-print" title="إيصال QR">
                  <QrCode className="w-5 h-5 text-purple-500" />
                </button>
                <button onClick={() => setReceiptOrder({ order: showDetail, type: 'reception' })} className="p-2 hover:bg-gray-100 rounded-xl no-print" title="طباعة إيصال">
                  <FileText className="w-5 h-5 text-gray-500" />
                </button>
                <button onClick={() => setShowDetail(null)} className="p-2 hover:bg-gray-100 rounded-xl no-print"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[showDetail.status]}`}>
                  {statusLabels[showDetail.status]}
                </span>
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${priorityColors[showDetail.priority]}`}>
                  {priorityLabels[showDetail.priority]}
                </span>
                {showDetail.isPaid && <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> مدفوع بالكامل</span>}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <span className="text-gray-500">العميل:</span>
                  <p className="font-bold">{showDetail.customerName}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <span className="text-gray-500">الجهاز:</span>
                  <p className="font-bold">{showDetail.deviceType} - {showDetail.deviceBrand} {showDetail.deviceModel}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <span className="text-gray-500">الرقم التسلسلي:</span>
                  <p className="font-bold font-mono">{showDetail.serialNumber || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <span className="text-gray-500">حالة الجهاز:</span>
                  <p className="font-bold">{showDetail.deviceCondition || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <span className="text-gray-500">تاريخ الاستلام:</span>
                  <p className="font-bold">{showDetail.receivedDate}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <span className="text-gray-500">التسليم المتوقع:</span>
                  <p className="font-bold">{showDetail.expectedDate || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <span className="text-gray-500">الفني المسؤول:</span>
                  <p className="font-bold">{showDetail.assignedTechnician || 'غير محدد'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <span className="text-gray-500">المرفقات:</span>
                  <p className="font-bold">{showDetail.accessories || '-'}</p>
                </div>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <span className="text-amber-700 text-sm font-medium">وصف المشكلة:</span>
                <p className="mt-1 text-gray-800">{showDetail.problemDescription}</p>
              </div>
              {showDetail.notes && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <span className="text-blue-700 text-sm font-medium">ملاحظات:</span>
                  <p className="mt-1 text-gray-800">{showDetail.notes}</p>
                </div>
              )}

              {/* Financial Section */}
              <div className="bg-gradient-to-l from-gray-50 to-green-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> المعلومات المالية
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-xl p-3 text-center">
                    <span className="text-gray-500 text-xs">التكلفة المقدرة</span>
                    <p className="font-bold text-lg">{fc(showDetail.estimatedCost)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center">
                    <span className="text-gray-500 text-xs">التكلفة النهائية</span>
                    <p className="font-bold text-lg">{fc(showDetail.finalCost)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center">
                    <span className="text-gray-500 text-xs">المبلغ المدفوع</span>
                    <p className="font-bold text-lg text-green-600">{fc(showDetail.paidAmount)}</p>
                  </div>
                </div>

                {/* Payment Progress */}
                {(showDetail.finalCost > 0 || showDetail.estimatedCost > 0) && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">نسبة الدفع</span>
                      <span className="font-bold">{Math.round((showDetail.paidAmount / (showDetail.finalCost || showDetail.estimatedCost)) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${showDetail.isPaid ? 'bg-green-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(100, (showDetail.paidAmount / (showDetail.finalCost || showDetail.estimatedCost)) * 100)}%` }}
                      />
                    </div>
                    {!showDetail.isPaid && (
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-green-600">مدفوع: {fc(showDetail.paidAmount)}</span>
                        <span className="text-red-600">متبقي: {fc((showDetail.finalCost || showDetail.estimatedCost) - showDetail.paidAmount)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment History */}
              {showDetail.payments && showDetail.payments.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <h3 className="font-bold text-green-700 mb-3 text-sm">سجل الدفعات ({showDetail.payments.length})</h3>
                  <div className="space-y-2">
                    {showDetail.payments.map(payment => (
                      <div key={payment.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentTypeColors[payment.type]}`}>
                            {paymentTypeLabels[payment.type]}
                          </span>
                          <span className="text-gray-500 text-xs">{payment.date}</span>
                          <span className="text-gray-400 text-xs">{payment.paymentMethod}</span>
                          {payment.notes && <span className="text-gray-400 text-xs">• {payment.notes}</span>}
                        </div>
                        <span className={`font-bold ${payment.type === 'refund' ? 'text-red-600' : 'text-green-600'}`}>
                          {payment.type === 'refund' ? '-' : '+'}{fc(payment.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showDetail.deliveredDate && (
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <span className="text-green-700 text-sm font-medium">تم التسليم بتاريخ: {showDetail.deliveredDate}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 no-print flex-wrap">
              <button onClick={() => setShowDetail(null)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium">إغلاق</button>
              <button onClick={() => setPaymentOrder(showDetail)} className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> تسجيل دفعة
              </button>
              <button onClick={() => handleEdit(showDetail)} className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">تعديل</button>
              {showDetail.status === 'ready' && (
                <button onClick={() => handleDeliver(showDetail)} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all flex items-center gap-2">
                  <Truck className="w-4 h-4" /> تسليم الجهاز
                </button>
              )}
            </div>
          </div>
        </div>
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
    </div>
  );
}
