import { useState } from 'react';
import { ServiceOrder, Payment, Transaction, Currency, AppSettings } from '../types';
import { generateId, formatCurrency, getCurrencySymbol, paymentMethods, paymentTypeLabels, paymentTypeColors } from '../data';
import { X, CreditCard, Banknote, CheckCircle, AlertCircle, History } from 'lucide-react';

interface Props {
  order: ServiceOrder;
  currencies: Currency[];
  settings: AppSettings;
  onClose: () => void;
  onPayment: (order: ServiceOrder, payment: Payment, transaction: Transaction) => void;
}

export default function PaymentModal({ order, currencies, onClose, onPayment }: Props) {
  void 0; // settings available for future use
  const fc = (amount: number) => formatCurrency(amount, currencies);
  const cs = getCurrencySymbol(currencies);

  const totalCost = order.finalCost || order.estimatedCost;
  const remaining = totalCost - order.paidAmount;

  const [paymentAmount, setPaymentAmount] = useState(remaining > 0 ? remaining : 0);
  const [paymentMethod, setPaymentMethod] = useState('نقدي');
  const [paymentType, setPaymentType] = useState<'deposit' | 'partial' | 'final' | 'refund'>(
    order.paidAmount === 0 ? 'deposit' : remaining <= 0 ? 'refund' : 'partial'
  );
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleQuickAmount = (amount: number) => {
    setPaymentAmount(amount);
  };

  const handleSubmit = () => {
    if (paymentAmount <= 0) {
      setError('يجب إدخال مبلغ صحيح');
      return;
    }

    if (paymentType !== 'refund' && paymentAmount > remaining && remaining > 0) {
      setError(`المبلغ أكبر من المتبقي (${fc(remaining)})`);
      return;
    }

    setError('');

    const payment: Payment = {
      id: generateId(),
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: paymentAmount,
      date: new Date().toISOString().split('T')[0],
      paymentMethod,
      notes: notes || paymentTypeLabels[paymentType],
      type: paymentType,
    };

    const isRefund = paymentType === 'refund';
    const transaction: Transaction = {
      id: generateId(),
      orderId: order.id,
      type: isRefund ? 'expense' : 'income',
      category: paymentType === 'deposit' ? 'عربون' : paymentType === 'refund' ? 'استرداد' : 'صيانة',
      amount: paymentAmount,
      date: new Date().toISOString().split('T')[0],
      description: `${paymentTypeLabels[paymentType]} - ${order.orderNumber} - ${order.customerName}`,
      paymentMethod,
    };

    onPayment(order, payment, transaction);
  };

  const isFullPayment = paymentAmount >= remaining && remaining > 0;
  const paidPercent = totalCost > 0 ? Math.min(100, ((order.paidAmount / totalCost) * 100)) : 0;
  const newPaidPercent = totalCost > 0 ? Math.min(100, (((order.paidAmount + paymentAmount) / totalCost) * 100)) : 0;

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50";

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-start justify-center pt-8 px-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mb-10 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">تسجيل دفعة</h2>
              <span className="font-mono text-xs text-blue-600">{order.orderNumber}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Order Summary */}
          <div className="bg-gradient-to-l from-slate-50 to-blue-50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">العميل: <strong>{order.customerName}</strong></span>
              <span className="text-sm text-gray-600">{order.deviceBrand} {order.deviceModel}</span>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">نسبة الدفع</span>
                <span className="font-bold text-gray-700">{Math.round(paidPercent)}% مدفوع</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div className="relative h-full rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 right-0 bg-green-500 transition-all duration-500"
                    style={{ width: `${paidPercent}%` }}
                  />
                  {paymentAmount > 0 && (
                    <div
                      className="absolute inset-y-0 right-0 bg-green-300 opacity-50 transition-all duration-500"
                      style={{ width: `${newPaidPercent}%` }}
                    />
                  )}
                </div>
              </div>
              {paymentAmount > 0 && (
                <div className="text-center mt-1">
                  <span className="text-xs text-green-600 font-medium">بعد الدفع: {Math.round(newPaidPercent)}%</span>
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="text-center p-2 bg-white/70 rounded-lg">
                <p className="text-xs text-gray-500">الإجمالي</p>
                <p className="font-bold text-gray-800 text-sm">{fc(totalCost)}</p>
              </div>
              <div className="text-center p-2 bg-white/70 rounded-lg">
                <p className="text-xs text-gray-500">المدفوع</p>
                <p className="font-bold text-green-600 text-sm">{fc(order.paidAmount)}</p>
              </div>
              <div className="text-center p-2 bg-white/70 rounded-lg">
                <p className="text-xs text-gray-500">المتبقي</p>
                <p className={`font-bold text-sm ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {fc(remaining > 0 ? remaining : 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع الدفعة</label>
            <div className="grid grid-cols-4 gap-2">
              {(['deposit', 'partial', 'final', 'refund'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => {
                    setPaymentType(type);
                    if (type === 'final') setPaymentAmount(remaining > 0 ? remaining : 0);
                    if (type === 'deposit' && order.paidAmount === 0) setPaymentAmount(Math.round(totalCost * 0.25));
                  }}
                  className={`py-2.5 px-2 rounded-xl text-xs font-medium transition-all border-2 ${
                    paymentType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {paymentTypeLabels[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">المبلغ ({cs})</label>
            <input
              type="number"
              value={paymentAmount || ''}
              onChange={e => { setPaymentAmount(Number(e.target.value)); setError(''); }}
              className={`${inputClass} text-lg font-bold text-center ${error ? 'border-red-300 ring-1 ring-red-300' : ''}`}
              placeholder="0"
              min={0}
            />
            {error && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}

            {/* Quick Amount Buttons */}
            {remaining > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {[
                  { label: '25%', amount: Math.round(totalCost * 0.25) },
                  { label: '50%', amount: Math.round(totalCost * 0.5) },
                  { label: '75%', amount: Math.round(totalCost * 0.75) },
                  { label: 'المتبقي', amount: remaining },
                  { label: 'الكل', amount: totalCost },
                ].filter(q => q.amount > 0 && q.amount <= totalCost).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickAmount(q.amount > remaining ? remaining : q.amount)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      paymentAmount === (q.amount > remaining ? remaining : q.amount)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {q.label} ({fc(q.amount > remaining ? remaining : q.amount)})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">طريقة الدفع</label>
            <div className="grid grid-cols-4 gap-2">
              {paymentMethods.map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-medium transition-all border-2 flex items-center justify-center gap-1 ${
                    paymentMethod === method
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {method === 'نقدي' && <Banknote className="w-3 h-3" />}
                  {method === 'بطاقة' && <CreditCard className="w-3 h-3" />}
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ملاحظات</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={inputClass}
              placeholder="ملاحظات إضافية..."
            />
          </div>

          {/* Payment History */}
          {order.payments && order.payments.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-gray-500" />
                <h3 className="font-bold text-gray-700 text-sm">سجل الدفعات السابقة ({order.payments.length})</h3>
              </div>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {order.payments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between p-2 bg-white rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentTypeColors[payment.type]}`}>
                        {paymentTypeLabels[payment.type]}
                      </span>
                      <span className="text-gray-500 text-xs">{payment.date}</span>
                      <span className="text-gray-400 text-xs">{payment.paymentMethod}</span>
                    </div>
                    <span className="font-bold text-green-600">{fc(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Preview */}
          {paymentAmount > 0 && (
            <div className={`rounded-xl p-4 ${isFullPayment ? 'bg-green-50 border-2 border-green-200' : 'bg-blue-50 border-2 border-blue-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className={`w-5 h-5 ${isFullPayment ? 'text-green-600' : 'text-blue-600'}`} />
                <span className={`font-bold text-sm ${isFullPayment ? 'text-green-700' : 'text-blue-700'}`}>
                  {isFullPayment ? 'سيتم سداد المبلغ بالكامل ✅' : `دفعة جزئية - سيبقى ${fc(remaining - paymentAmount)}`}
                </span>
              </div>
              <div className="text-xs text-gray-600">
                {paymentTypeLabels[paymentType]} • {fc(paymentAmount)} • {paymentMethod}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium">
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={paymentAmount <= 0}
            className={`px-6 py-2.5 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all flex items-center gap-2 ${
              paymentAmount <= 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-l from-green-600 to-green-500'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            تأكيد الدفع {paymentAmount > 0 && `(${fc(paymentAmount)})`}
          </button>
        </div>
      </div>
    </div>
  );
}
