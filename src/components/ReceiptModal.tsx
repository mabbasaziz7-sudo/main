import { useRef } from 'react';
import { ServiceOrder, Currency, AppSettings } from '../types';
import { formatCurrency, statusLabels, paymentTypeLabels } from '../data';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { X, Printer, Download } from 'lucide-react';

interface Props {
  order: ServiceOrder;
  currencies: Currency[];
  settings: AppSettings;
  onClose: () => void;
  type: 'reception' | 'delivery' | 'payment';
}

export default function ReceiptModal({ order, currencies, settings, onClose, type }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const fc = (amount: number) => formatCurrency(amount, currencies);

  const totalCost = order.finalCost || order.estimatedCost;
  const remaining = totalCost - order.paidAmount;

  // QR code data
  const qrData = JSON.stringify({
    order: order.orderNumber,
    customer: order.customerName,
    device: `${order.deviceBrand} ${order.deviceModel}`,
    serial: order.serialNumber,
    status: statusLabels[order.status],
    total: totalCost,
    paid: order.paidAmount,
    remaining: remaining,
    date: order.receivedDate,
    center: settings.centerName,
    phone: settings.centerPhone,
  });

  // Barcode value (order number without special chars for compatibility)
  const barcodeValue = order.orderNumber.replace(/[^A-Za-z0-9-]/g, '') || 'ORDER';

  const receiptTitle = type === 'reception' ? 'إيصال استلام جهاز' :
    type === 'delivery' ? 'إيصال تسليم جهاز' : 'إيصال دفع';

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>${receiptTitle} - ${order.orderNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; padding: 10mm; background: white; color: #1a1a1a; }
          .receipt { max-width: 80mm; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 10px; margin-bottom: 10px; }
          .header h1 { font-size: 16px; margin-bottom: 4px; }
          .header p { font-size: 11px; color: #555; }
          .title { text-align: center; font-size: 14px; font-weight: bold; background: #f0f0f0; padding: 6px; margin: 8px 0; border-radius: 4px; }
          .info-row { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; border-bottom: 1px dotted #eee; }
          .info-row .label { color: #666; }
          .info-row .value { font-weight: bold; }
          .section { margin: 10px 0; }
          .section-title { font-size: 12px; font-weight: bold; margin-bottom: 6px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
          .payment-row { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; }
          .total-box { background: #f8f8f8; padding: 8px; border-radius: 4px; margin: 8px 0; }
          .total-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
          .total-row.main { font-size: 14px; font-weight: bold; border-top: 2px solid #333; padding-top: 6px; margin-top: 4px; }
          .codes { text-align: center; margin: 12px 0; }
          .codes svg { max-width: 100%; }
          .qr-section { margin: 8px auto; display: flex; justify-content: center; }
          .footer { text-align: center; border-top: 2px dashed #ccc; padding-top: 10px; margin-top: 10px; font-size: 10px; color: #666; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; }
          .badge-green { background: #d4edda; color: #155724; }
          .badge-red { background: #f8d7da; color: #721c24; }
          .badge-blue { background: #cce5ff; color: #004085; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleDownloadImage = () => {
    handlePrint();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-start justify-center pt-6 px-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mb-10 animate-fadeIn">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 no-print">
          <h2 className="text-lg font-bold text-gray-800">{receiptTitle}</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadImage} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500" title="تحميل">
              <Download className="w-5 h-5" />
            </button>
            <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
              <Printer className="w-4 h-4" /> طباعة
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="p-4 max-h-[80vh] overflow-y-auto">
          <div ref={receiptRef} className="receipt">
            {/* Header */}
            <div className="header" style={{ textAlign: 'center', borderBottom: '2px dashed #ccc', paddingBottom: '10px', marginBottom: '10px' }}>
              <h1 style={{ fontSize: '18px', marginBottom: '4px', fontWeight: 'bold' }}>{settings.centerName}</h1>
              {settings.receiptHeader && <p style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>{settings.receiptHeader}</p>}
              <p style={{ fontSize: '11px', color: '#555' }}>📞 {settings.centerPhone} | ✉ {settings.centerEmail}</p>
              <p style={{ fontSize: '11px', color: '#555' }}>📍 {settings.centerAddress}</p>
            </div>

            {/* Receipt Title */}
            <div className="title" style={{ textAlign: 'center', fontSize: '15px', fontWeight: 'bold', background: '#f0f0f0', padding: '8px', margin: '10px 0', borderRadius: '6px' }}>
              {receiptTitle}
            </div>

            {/* Barcode */}
            <div className="codes" style={{ textAlign: 'center', margin: '10px 0' }}>
              <Barcode
                value={barcodeValue}
                width={1.5}
                height={45}
                fontSize={12}
                margin={0}
                displayValue={true}
                format="CODE128"
              />
            </div>

            {/* Order Info */}
            <div className="section" style={{ margin: '10px 0' }}>
              <div className="section-title" style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
                معلومات الأمر
              </div>
              <div style={{ fontSize: '12px' }}>
                <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dotted #eee' }}>
                  <span style={{ color: '#666' }}>رقم الأمر:</span>
                  <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{order.orderNumber}</span>
                </div>
                <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dotted #eee' }}>
                  <span style={{ color: '#666' }}>التاريخ:</span>
                  <span style={{ fontWeight: 'bold' }}>{new Date().toLocaleDateString('ar-SA')}</span>
                </div>
                <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dotted #eee' }}>
                  <span style={{ color: '#666' }}>الحالة:</span>
                  <span style={{ fontWeight: 'bold' }}>{statusLabels[order.status]}</span>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="section" style={{ margin: '10px 0' }}>
              <div className="section-title" style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
                معلومات العميل
              </div>
              <div style={{ fontSize: '12px' }}>
                <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dotted #eee' }}>
                  <span style={{ color: '#666' }}>الاسم:</span>
                  <span style={{ fontWeight: 'bold' }}>{order.customerName}</span>
                </div>
              </div>
            </div>

            {/* Device Info */}
            <div className="section" style={{ margin: '10px 0' }}>
              <div className="section-title" style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
                معلومات الجهاز
              </div>
              <div style={{ fontSize: '12px' }}>
                <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dotted #eee' }}>
                  <span style={{ color: '#666' }}>النوع:</span>
                  <span style={{ fontWeight: 'bold' }}>{order.deviceType}</span>
                </div>
                <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dotted #eee' }}>
                  <span style={{ color: '#666' }}>الجهاز:</span>
                  <span style={{ fontWeight: 'bold' }}>{order.deviceBrand} {order.deviceModel}</span>
                </div>
                {order.serialNumber && (
                  <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dotted #eee' }}>
                    <span style={{ color: '#666' }}>الرقم التسلسلي:</span>
                    <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{order.serialNumber}</span>
                  </div>
                )}
                {order.deviceCondition && (
                  <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dotted #eee' }}>
                    <span style={{ color: '#666' }}>حالة الجهاز:</span>
                    <span style={{ fontWeight: 'bold' }}>{order.deviceCondition}</span>
                  </div>
                )}
                {order.accessories && (
                  <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dotted #eee' }}>
                    <span style={{ color: '#666' }}>المرفقات:</span>
                    <span style={{ fontWeight: 'bold' }}>{order.accessories}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Problem */}
            <div className="section" style={{ margin: '10px 0' }}>
              <div className="section-title" style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
                وصف المشكلة
              </div>
              <p style={{ fontSize: '12px', color: '#444', lineHeight: '1.6' }}>{order.problemDescription}</p>
            </div>

            {/* Financial Info */}
            <div className="total-box" style={{ background: '#f5f5f5', padding: '10px', borderRadius: '6px', margin: '10px 0' }}>
              <div className="total-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0' }}>
                <span>التكلفة {order.finalCost > 0 ? 'النهائية' : 'المقدرة'}:</span>
                <span style={{ fontWeight: 'bold' }}>{fc(totalCost)}</span>
              </div>

              {settings.taxEnabled && totalCost > 0 && (
                <div className="total-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '3px 0', color: '#666' }}>
                  <span>{settings.taxName} ({settings.taxRate}%):</span>
                  <span>{settings.taxInclusive ? 'شامل' : fc(totalCost * settings.taxRate / 100)}</span>
                </div>
              )}

              <div className="total-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0' }}>
                <span>المبلغ المدفوع:</span>
                <span style={{ fontWeight: 'bold', color: '#28a745' }}>{fc(order.paidAmount)}</span>
              </div>

              <div className="total-row main" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', borderTop: '2px solid #333', paddingTop: '6px', marginTop: '6px' }}>
                <span>المبلغ المتبقي:</span>
                <span style={{ color: remaining > 0 ? '#dc3545' : '#28a745' }}>{fc(remaining > 0 ? remaining : 0)}</span>
              </div>

              {order.isPaid && (
                <div style={{ textAlign: 'center', marginTop: '6px' }}>
                  <span className="badge badge-green" style={{ display: 'inline-block', padding: '3px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: '#d4edda', color: '#155724' }}>
                    ✅ مدفوع بالكامل
                  </span>
                </div>
              )}
            </div>

            {/* Payment History */}
            {order.payments && order.payments.length > 0 && (
              <div className="section" style={{ margin: '10px 0' }}>
                <div className="section-title" style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
                  سجل الدفعات ({order.payments.length})
                </div>
                {order.payments.map((payment, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', borderBottom: '1px dotted #eee', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 'bold' }}>{paymentTypeLabels[payment.type]}</span>
                      <span style={{ color: '#888', marginRight: '6px', marginLeft: '6px' }}>|</span>
                      <span style={{ color: '#666' }}>{payment.date}</span>
                      <span style={{ color: '#888', marginRight: '6px', marginLeft: '6px' }}>|</span>
                      <span style={{ color: '#666' }}>{payment.paymentMethod}</span>
                    </div>
                    <span style={{ fontWeight: 'bold', color: '#28a745' }}>{fc(payment.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Warranty Info */}
            {type === 'delivery' && (
              <div style={{ background: '#fff3cd', padding: '8px', borderRadius: '6px', margin: '10px 0', textAlign: 'center', fontSize: '12px' }}>
                <strong>⚠️ مدة الضمان: {settings.defaultWarrantyDays} يوم</strong>
                <br />
                <span style={{ fontSize: '11px', color: '#856404' }}>من تاريخ التسليم</span>
              </div>
            )}

            {/* QR Code */}
            <div className="qr-section" style={{ margin: '12px auto', display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
              <QRCodeSVG
                value={qrData}
                size={120}
                level="M"
                includeMargin={false}
              />
              <p style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>امسح الرمز لعرض تفاصيل الأمر</p>
            </div>

            {/* Footer */}
            <div className="footer" style={{ textAlign: 'center', borderTop: '2px dashed #ccc', paddingTop: '10px', marginTop: '10px' }}>
              {settings.receiptFooter && <p style={{ fontSize: '11px', color: '#555', marginBottom: '4px' }}>{settings.receiptFooter}</p>}
              <p style={{ fontSize: '10px', color: '#999' }}>تمت الطباعة: {new Date().toLocaleString('ar-SA')}</p>
              <p style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>{settings.workingHours}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
