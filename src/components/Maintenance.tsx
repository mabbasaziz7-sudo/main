import { useState } from 'react';
import { ServiceOrder, MaintenanceProcedure, SparePart, OrderStatus, Currency, AppSettings } from '../types';
import { generateId, statusLabels, statusColors, formatCurrency, getCurrencySymbol } from '../data';
import { Wrench, Plus, Search, ChevronDown, ChevronUp, CheckCircle, Clock, PlayCircle, X } from 'lucide-react';

interface Props {
  orders: ServiceOrder[];
  procedures: MaintenanceProcedure[];
  parts: SparePart[];
  currencies: Currency[];
  settings: AppSettings;
  setOrders: React.Dispatch<React.SetStateAction<ServiceOrder[]>>;
  setProcedures: React.Dispatch<React.SetStateAction<MaintenanceProcedure[]>>;
  setParts: React.Dispatch<React.SetStateAction<SparePart[]>>;
}

const emptyProc = {
  description: '', technicianName: '', date: new Date().toISOString().split('T')[0],
  duration: 0, status: 'pending' as const, partsUsed: [] as any[], laborCost: 0, notes: '',
};

export default function Maintenance({ orders, procedures, parts, currencies, settings, setOrders, setProcedures, setParts }: Props) {
  const [search, setSearch] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [showAddProc, setShowAddProc] = useState<string | null>(null);
  const [procForm, setProcForm] = useState(emptyProc);
  const [selectedPart, setSelectedPart] = useState('');
  const [partQty, setPartQty] = useState(1);

  const fc = (amount: number) => formatCurrency(amount, currencies);
  const cs = getCurrencySymbol(currencies);

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const filteredOrders = activeOrders.filter(o =>
    search === '' ||
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.customerName.includes(search) ||
    o.deviceBrand.toLowerCase().includes(search.toLowerCase())
  );

  const getOrderProcedures = (orderId: string) => procedures.filter(p => p.orderId === orderId);

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  const updateOrderCost = (orderId: string, finalCost: number) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, finalCost } : o));
  };

  const addProcedure = (orderId: string, orderNumber: string) => {
    if (!procForm.description) return;
    const newProc: MaintenanceProcedure = {
      ...procForm, id: generateId(), orderId, orderNumber,
    };
    setProcedures(prev => [...prev, newProc]);
    setProcForm(emptyProc);
    setShowAddProc(null);
  };

  const updateProcStatus = (procId: string, status: 'pending' | 'in_progress' | 'completed') => {
    setProcedures(prev => prev.map(p => p.id === procId ? { ...p, status } : p));
  };

  const addPartToProc = () => {
    if (!selectedPart) return;
    const part = parts.find(p => p.id === selectedPart);
    if (!part || part.quantity < partQty) return;
    setProcForm(prev => ({
      ...prev,
      partsUsed: [...prev.partsUsed, { partId: part.id, partName: part.name, quantity: partQty, unitPrice: part.sellingPrice }]
    }));
    setParts(prev => prev.map(p => p.id === selectedPart ? { ...p, quantity: p.quantity - partQty } : p));
    setSelectedPart('');
    setPartQty(1);
  };

  const totalProcCost = (procs: MaintenanceProcedure[]) =>
    procs.reduce((sum, p) => sum + p.laborCost + p.partsUsed.reduce((s, u) => s + u.unitPrice * u.quantity, 0), 0);

  const procStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'in_progress') return <PlayCircle className="w-4 h-4 text-blue-500" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const procStatusColor: Record<string, string> = { pending: 'bg-gray-100 text-gray-700', in_progress: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700' };

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50";

  return (
    <div className="space-y-6 animate-slideIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">إدارة الصيانة</h1>
        <p className="text-gray-500 text-sm mt-1">متابعة إجراءات الصيانة وتحديث حالة الأوامر</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="بحث في الأوامر النشطة..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>

      <div className="space-y-4">
        {filteredOrders.map(order => {
          const procs = getOrderProcedures(order.id);
          const isExpanded = expandedOrder === order.id;
          const cost = totalProcCost(procs);

          return (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="p-2 bg-purple-50 rounded-xl">
                      <Wrench className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-blue-600">{order.orderNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{order.customerName} • {order.deviceType} {order.deviceBrand} {order.deviceModel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <p className="text-xs text-gray-500">التكلفة التراكمية</p>
                      <p className="font-bold text-gray-800">{fc(cost)}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2 mr-14">{order.problemDescription}</p>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 p-4 space-y-4 animate-fadeIn">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">تغيير الحالة</label>
                      <select value={order.status} onChange={e => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                        {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">الفني المسؤول</label>
                      <select value={order.assignedTechnician}
                        onChange={e => setOrders(prev => prev.map(o => o.id === order.id ? { ...o, assignedTechnician: e.target.value } : o))}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                        <option value="">غير محدد</option>
                        {settings.technicians.map((t: string) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">التكلفة النهائية ({cs})</label>
                      <input type="number" value={order.finalCost || ''} onChange={e => updateOrderCost(order.id, Number(e.target.value))}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white w-32" placeholder="0" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-700">إجراءات الصيانة ({procs.length})</h3>
                      <button onClick={() => { setShowAddProc(order.id); setProcForm(emptyProc); }}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
                        <Plus className="w-4 h-4" /> إضافة إجراء
                      </button>
                    </div>

                    {procs.length === 0 && (
                      <p className="text-center text-gray-400 py-6 text-sm">لا توجد إجراءات مسجلة بعد</p>
                    )}

                    <div className="space-y-2">
                      {procs.map(proc => (
                        <div key={proc.id} className="border border-gray-100 rounded-xl p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2">
                              {procStatusIcon(proc.status)}
                              <div>
                                <p className="font-medium text-gray-800 text-sm">{proc.description}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                  <span>{proc.technicianName}</span>
                                  <span>{proc.date}</span>
                                  <span>{proc.duration} دقيقة</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <select value={proc.status} onChange={e => updateProcStatus(proc.id, e.target.value as any)}
                                className={`text-xs rounded-full px-2 py-0.5 border-0 ${procStatusColor[proc.status]}`}>
                                <option value="pending">معلق</option>
                                <option value="in_progress">جاري</option>
                                <option value="completed">مكتمل</option>
                              </select>
                            </div>
                          </div>
                          {proc.partsUsed.length > 0 && (
                            <div className="mt-2 mr-6">
                              <p className="text-xs text-gray-500 mb-1">قطع الغيار المستخدمة:</p>
                              {proc.partsUsed.map((u, i) => (
                                <div key={i} className="text-xs bg-gray-50 rounded-lg px-2 py-1 mb-1 flex justify-between">
                                  <span>{u.partName} × {u.quantity}</span>
                                  <span className="font-medium">{fc(u.unitPrice * u.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 mr-6 text-xs text-gray-500 flex gap-4">
                            <span>تكلفة العمل: <strong>{fc(proc.laborCost)}</strong></span>
                            {proc.notes && <span>ملاحظات: {proc.notes}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {showAddProc === order.id && (
                    <div className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50/50 animate-fadeIn">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-blue-800">إضافة إجراء صيانة جديد</h4>
                        <button onClick={() => setShowAddProc(null)} className="p-1 hover:bg-blue-100 rounded-lg"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">وصف الإجراء *</label>
                          <input type="text" value={procForm.description} onChange={e => setProcForm(p => ({ ...p, description: e.target.value }))} className={inputClass} placeholder="مثال: فحص أولي للجهاز" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">الفني</label>
                            <select value={procForm.technicianName} onChange={e => setProcForm(p => ({ ...p, technicianName: e.target.value }))} className={inputClass}>
                              <option value="">اختر</option>
                              {settings.technicians.map((t: string) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">المدة (دقيقة)</label>
                            <input type="number" value={procForm.duration || ''} onChange={e => setProcForm(p => ({ ...p, duration: Number(e.target.value) }))} className={inputClass} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">تكلفة العمل ({cs})</label>
                            <input type="number" value={procForm.laborCost || ''} onChange={e => setProcForm(p => ({ ...p, laborCost: Number(e.target.value) }))} className={inputClass} />
                          </div>
                        </div>
                        <div className="bg-white rounded-xl p-3">
                          <label className="text-xs text-gray-600 mb-2 block font-medium">إضافة قطع غيار</label>
                          <div className="flex gap-2">
                            <select value={selectedPart} onChange={e => setSelectedPart(e.target.value)} className={inputClass + " flex-1"}>
                              <option value="">اختر قطعة غيار</option>
                              {parts.filter(p => p.quantity > 0).map(p => (
                                <option key={p.id} value={p.id}>{p.name} (متوفر: {p.quantity})</option>
                              ))}
                            </select>
                            <input type="number" min={1} value={partQty} onChange={e => setPartQty(Number(e.target.value))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-20 bg-gray-50" />
                            <button onClick={addPartToProc} className="px-3 py-2 bg-blue-500 text-white rounded-xl text-sm hover:bg-blue-600">إضافة</button>
                          </div>
                          {procForm.partsUsed.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {procForm.partsUsed.map((u: any, i: number) => (
                                <div key={i} className="text-xs bg-gray-50 rounded-lg px-2 py-1.5 flex justify-between">
                                  <span>{u.partName} × {u.quantity}</span>
                                  <span className="font-medium">{fc(u.unitPrice * u.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">ملاحظات</label>
                          <input type="text" value={procForm.notes} onChange={e => setProcForm(p => ({ ...p, notes: e.target.value }))} className={inputClass} placeholder="ملاحظات إضافية..." />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setShowAddProc(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm">إلغاء</button>
                          <button onClick={() => addProcedure(order.id, order.orderNumber)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">حفظ الإجراء</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg">لا توجد أوامر صيانة نشطة</p>
          </div>
        )}
      </div>
    </div>
  );
}
