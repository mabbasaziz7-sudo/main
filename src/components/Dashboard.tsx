import { ServiceOrder, SparePart, Transaction, Currency, AppSettings, Page } from '../types';
import { statusLabels, statusColors, priorityLabels, priorityColors, formatCurrency } from '../data';
import { Package, CheckCircle, Clock, AlertTriangle, TrendingUp, Wrench, Users, ChevronLeft, Coins } from 'lucide-react';

interface Props {
  orders: ServiceOrder[];
  parts: SparePart[];
  transactions: Transaction[];
  customersCount: number;
  currencies: Currency[];
  settings: AppSettings;
  navigateTo: (page: Page) => void;
}

export default function Dashboard({ orders, parts, transactions, customersCount, currencies, settings, navigateTo }: Props) {
  const fc = (amount: number) => formatCurrency(amount, currencies);
  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const readyOrders = orders.filter(o => o.status === 'ready');
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const lowStockParts = parts.filter(p => p.quantity <= p.minQuantity);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = totalIncome - totalExpense;

  const statusDist = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const defaultCur = currencies.find(c => c.isDefault) || currencies[0];

  const stats = [
    { label: 'إجمالي الأوامر', value: orders.length, icon: Package, bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50 text-blue-600' },
    { label: 'أوامر نشطة', value: activeOrders.length, icon: Wrench, bg: 'from-orange-500 to-orange-600', light: 'bg-orange-50 text-orange-600' },
    { label: 'جاهز للتسليم', value: readyOrders.length, icon: CheckCircle, bg: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50 text-emerald-600' },
    { label: 'تم التسليم', value: deliveredOrders.length, icon: Clock, bg: 'from-slate-500 to-slate-600', light: 'bg-slate-50 text-slate-600' },
  ];

  const finStats = [
    { label: 'الإيرادات', value: totalIncome, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'المصروفات', value: totalExpense, icon: Coins, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'صافي الربح', value: profit, icon: TrendingUp, color: profit >= 0 ? 'text-emerald-600' : 'text-red-600', bg: profit >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
    { label: 'العملاء', value: customersCount, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6 animate-slideIn">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">{settings.centerName}</h1>
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Order Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg transition-all duration-300 cursor-pointer group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.bg} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {finStats.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>
                  {typeof stat.value === 'number' && stat.label !== 'العملاء' ? fc(stat.value) : stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Currency Info Badge */}
      {defaultCur && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-xs font-medium border border-amber-200">
            <Coins className="w-3.5 h-3.5" />
            العملة: {defaultCur.nameAr} ({defaultCur.symbol})
          </span>
          {settings.taxEnabled && (
            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium border border-green-200">
              {settings.taxName}: {settings.taxRate}%
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">أحدث أوامر الصيانة</h2>
            <button onClick={() => navigateTo('reception')} className="text-blue-600 text-sm hover:underline flex items-center gap-1">
              عرض الكل <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">رقم الأمر</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">العميل</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">الجهاز</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">الحالة</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">الأولوية</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map(order => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-blue-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-blue-600">{order.orderNumber}</td>
                    <td className="py-3 px-4 font-medium">{order.customerName}</td>
                    <td className="py-3 px-4 text-gray-600">{order.deviceBrand} {order.deviceModel}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${priorityColors[order.priority]}`}>
                        {priorityLabels[order.priority]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Panels */}
        <div className="space-y-6">
          {/* Status Distribution */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-bold text-gray-800 mb-4">توزيع الحالات</h2>
            <div className="space-y-3">
              {Object.entries(statusDist).map(([status, count]) => (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
                      {statusLabels[status]}
                    </span>
                    <span className="text-sm font-bold text-gray-600">{count as number}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-l from-blue-500 to-blue-400 rounded-full h-2 transition-all duration-500"
                      style={{ width: `${((count as number) / orders.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Alert */}
          {lowStockParts.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-red-700">تنبيه المخزون</h2>
              </div>
              <div className="space-y-2">
                {lowStockParts.slice(0, 5).map(part => (
                  <div key={part.id} className="flex items-center justify-between text-sm p-3 bg-red-50 rounded-xl">
                    <span className="text-gray-700 font-medium">{part.name}</span>
                    <span className="text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded-full">{part.quantity}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => navigateTo('parts')} className="mt-4 w-full text-center text-sm text-red-600 hover:text-red-800 font-medium hover:underline">
                إدارة المخزون ←
              </button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-bold text-gray-800 mb-4">إجراءات سريعة</h2>
            <div className="space-y-2">
              <button onClick={() => navigateTo('reception')} className="w-full text-right p-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium text-sm flex items-center gap-2">
                <Package className="w-4 h-4" /> استلام جهاز جديد
              </button>
              <button onClick={() => navigateTo('maintenance')} className="w-full text-right p-3 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors font-medium text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4" /> إدارة الصيانة
              </button>
              <button onClick={() => navigateTo('settings')} className="w-full text-right p-3 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors font-medium text-sm flex items-center gap-2">
                <Coins className="w-4 h-4" /> إعدادات العملات
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
