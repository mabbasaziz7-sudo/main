import { Customer, ServiceOrder, MaintenanceProcedure, SparePart, Transaction, Currency, AppSettings, Payment, User, UserRole, UserPermissions, Session } from './types';

let counter = Date.now();
export const generateId = () => (++counter).toString(36);

// ============ Password Hashing (simple for demo) ============
export const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + password.length;
};

export const verifyPassword = (input: string, hashed: string): boolean => {
  return hashPassword(input) === hashed;
};

// ============ Role Permissions ============
export const rolePermissions: Record<UserRole, UserPermissions> = {
  admin: { dashboard: true, reception: true, maintenance: true, parts: true, financial: true, customers: true, settings: true, users: true },
  manager: { dashboard: true, reception: true, maintenance: true, parts: true, financial: true, customers: true, settings: true, users: false },
  technician: { dashboard: true, reception: false, maintenance: true, parts: true, financial: false, customers: false, settings: false, users: false },
  receptionist: { dashboard: true, reception: true, maintenance: false, parts: false, financial: true, customers: true, settings: false, users: false },
};

export const roleLabels: Record<UserRole, string> = {
  admin: 'مدير النظام',
  manager: 'مدير المركز',
  technician: 'فني صيانة',
  receptionist: 'موظف استقبال',
};

export const roleColors: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  technician: 'bg-purple-100 text-purple-700 border-purple-200',
  receptionist: 'bg-green-100 text-green-700 border-green-200',
};

export const roleIcons: Record<UserRole, string> = {
  admin: '👑',
  manager: '🏢',
  technician: '🔧',
  receptionist: '📋',
};

// ============ Default Users ============
export const defaultUsers: User[] = [
  {
    id: 'u1', username: 'admin', password: hashPassword('admin123'),
    fullName: 'مدير النظام', email: 'admin@maintenance.com', phone: '0501234567',
    role: 'admin', avatar: '', isActive: true, createdAt: '2024-01-01', lastLogin: '',
    permissions: rolePermissions.admin,
  },
  {
    id: 'u2', username: 'manager', password: hashPassword('manager123'),
    fullName: 'أحمد المدير', email: 'ahmed@maintenance.com', phone: '0502345678',
    role: 'manager', avatar: '', isActive: true, createdAt: '2024-01-15', lastLogin: '',
    permissions: rolePermissions.manager,
  },
  {
    id: 'u3', username: 'tech1', password: hashPassword('tech123'),
    fullName: 'سعد الفني', email: 'saad@maintenance.com', phone: '0503456789',
    role: 'technician', avatar: '', isActive: true, createdAt: '2024-02-01', lastLogin: '',
    permissions: rolePermissions.technician,
  },
  {
    id: 'u4', username: 'tech2', password: hashPassword('tech123'),
    fullName: 'عمر الفني', email: 'omar@maintenance.com', phone: '0504567890',
    role: 'technician', avatar: '', isActive: true, createdAt: '2024-02-01', lastLogin: '',
    permissions: rolePermissions.technician,
  },
  {
    id: 'u5', username: 'reception', password: hashPassword('rec123'),
    fullName: 'نورة الاستقبال', email: 'noura@maintenance.com', phone: '0505678901',
    role: 'receptionist', avatar: '', isActive: true, createdAt: '2024-03-01', lastLogin: '',
    permissions: rolePermissions.receptionist,
  },
];

// ============ Session Helpers ============
export const createSession = (user: User): Session => ({
  userId: user.id,
  username: user.username,
  fullName: user.fullName,
  role: user.role,
  avatar: user.avatar,
  loginTime: new Date().toISOString(),
  permissions: user.permissions,
});

export const getStoredSession = (): Session | null => {
  try {
    const s = localStorage.getItem('mc_session');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};

export const saveSession = (session: Session) => {
  localStorage.setItem('mc_session', JSON.stringify(session));
};

export const clearSession = () => {
  localStorage.removeItem('mc_session');
};

export const generateOrderNumber = (prefix = 'MTC') => {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const r = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${prefix}-${y}${m}-${r}`;
};

// ============ Default Currencies ============
export const defaultCurrencies: Currency[] = [
  { id: 'cur1', code: 'SAR', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', symbol: 'ر.س', exchangeRate: 1, isDefault: true, decimalPlaces: 2, symbolPosition: 'after' },
  { id: 'cur2', code: 'USD', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', symbol: '$', exchangeRate: 0.2667, isDefault: false, decimalPlaces: 2, symbolPosition: 'before' },
  { id: 'cur3', code: 'EUR', nameAr: 'يورو', nameEn: 'Euro', symbol: '€', exchangeRate: 0.2444, isDefault: false, decimalPlaces: 2, symbolPosition: 'before' },
  { id: 'cur4', code: 'AED', nameAr: 'درهم إماراتي', nameEn: 'UAE Dirham', symbol: 'د.إ', exchangeRate: 0.9793, isDefault: false, decimalPlaces: 2, symbolPosition: 'after' },
  { id: 'cur5', code: 'KWD', nameAr: 'دينار كويتي', nameEn: 'Kuwaiti Dinar', symbol: 'د.ك', exchangeRate: 0.0819, isDefault: false, decimalPlaces: 3, symbolPosition: 'after' },
  { id: 'cur6', code: 'EGP', nameAr: 'جنيه مصري', nameEn: 'Egyptian Pound', symbol: 'ج.م', exchangeRate: 13.05, isDefault: false, decimalPlaces: 2, symbolPosition: 'after' },
  { id: 'cur7', code: 'QAR', nameAr: 'ريال قطري', nameEn: 'Qatari Riyal', symbol: 'ر.ق', exchangeRate: 0.9707, isDefault: false, decimalPlaces: 2, symbolPosition: 'after' },
  { id: 'cur8', code: 'BHD', nameAr: 'دينار بحريني', nameEn: 'Bahraini Dinar', symbol: 'د.ب', exchangeRate: 0.1005, isDefault: false, decimalPlaces: 3, symbolPosition: 'after' },
  { id: 'cur9', code: 'OMR', nameAr: 'ريال عماني', nameEn: 'Omani Rial', symbol: 'ر.ع', exchangeRate: 0.1027, isDefault: false, decimalPlaces: 3, symbolPosition: 'after' },
  { id: 'cur10', code: 'GBP', nameAr: 'جنيه إسترليني', nameEn: 'British Pound', symbol: '£', exchangeRate: 0.2118, isDefault: false, decimalPlaces: 2, symbolPosition: 'before' },
  { id: 'cur11', code: 'TRY', nameAr: 'ليرة تركية', nameEn: 'Turkish Lira', symbol: '₺', exchangeRate: 8.62, isDefault: false, decimalPlaces: 2, symbolPosition: 'before' },
  { id: 'cur12', code: 'JOD', nameAr: 'دينار أردني', nameEn: 'Jordanian Dinar', symbol: 'د.أ', exchangeRate: 0.1889, isDefault: false, decimalPlaces: 3, symbolPosition: 'after' },
];

// ============ Default Settings ============
export const defaultSettings: AppSettings = {
  centerName: 'مركز الصيانة المتقدم',
  centerPhone: '0501234567',
  centerEmail: 'info@maintenance-center.com',
  centerAddress: 'الرياض - حي النزهة - شارع الملك فهد',
  centerLogo: '',
  workingHours: 'السبت - الخميس: 9:00 ص - 9:00 م',
  taxEnabled: true,
  taxRate: 15,
  taxName: 'ضريبة القيمة المضافة',
  taxInclusive: true,
  technicians: ['سعد الفني', 'عمر الفني', 'ياسر الفني'],
  orderPrefix: 'MTC',
  defaultWarrantyDays: 30,
  lowStockAlert: true,
  lowStockThreshold: 3,
  primaryColor: '#3b82f6',
  receiptHeader: 'مركز الصيانة المتقدم - خدمة مميزة وسريعة',
  receiptFooter: 'شكراً لتعاملكم معنا - ضمان الصيانة 30 يوم',
  showLogoOnReceipt: true,
};

// ============ Format Currency Helper ============
export const formatCurrency = (amount: number, currencies: Currency[]): string => {
  const defaultCurrency = currencies.find(c => c.isDefault) || currencies[0];
  if (!defaultCurrency) return `${amount.toLocaleString('ar-SA')}`;
  
  const formatted = amount.toLocaleString('ar-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: defaultCurrency.decimalPlaces,
  });

  if (defaultCurrency.symbolPosition === 'before') {
    return `${defaultCurrency.symbol}${formatted}`;
  }
  return `${formatted} ${defaultCurrency.symbol}`;
};

export const getCurrencySymbol = (currencies: Currency[]): string => {
  const defaultCurrency = currencies.find(c => c.isDefault) || currencies[0];
  return defaultCurrency?.symbol || 'ر.س';
};

export const convertCurrency = (amount: number, fromCurrency: Currency, toCurrency: Currency): number => {
  const baseAmount = amount / fromCurrency.exchangeRate;
  return baseAmount * toCurrency.exchangeRate;
};

// ============ Payment Type Labels ============
export const paymentTypeLabels: Record<string, string> = {
  deposit: 'عربون',
  partial: 'دفعة جزئية',
  final: 'دفعة نهائية',
  refund: 'استرداد',
};

export const paymentTypeColors: Record<string, string> = {
  deposit: 'bg-amber-100 text-amber-700',
  partial: 'bg-blue-100 text-blue-700',
  final: 'bg-green-100 text-green-700',
  refund: 'bg-red-100 text-red-700',
};

// ============ Sample Data ============
export const sampleCustomers: Customer[] = [
  { id: 'c1', name: 'أحمد محمد العلي', phone: '0501234567', email: 'ahmed@email.com', address: 'الرياض - حي النزهة', createdAt: '2024-01-15' },
  { id: 'c2', name: 'فاطمة علي الزهراني', phone: '0559876543', email: 'fatima@email.com', address: 'جدة - حي الصفا', createdAt: '2024-02-20' },
  { id: 'c3', name: 'خالد العمري', phone: '0561112233', email: 'khaled@email.com', address: 'الدمام - حي الفيصلية', createdAt: '2024-03-10' },
  { id: 'c4', name: 'نورة السعيد', phone: '0543334455', email: 'noura@email.com', address: 'الرياض - حي العليا', createdAt: '2024-04-05' },
  { id: 'c5', name: 'محمد الحربي', phone: '0587776655', email: 'moh@email.com', address: 'مكة - حي الشوقية', createdAt: '2024-05-12' },
];

export const samplePayments: Payment[] = [
  { id: 'pay1', orderId: 'o2', orderNumber: 'MTC-2401-0002', amount: 200, date: '2024-06-02', paymentMethod: 'بطاقة', notes: 'عربون مقدم', type: 'deposit' },
  { id: 'pay2', orderId: 'o4', orderNumber: 'MTC-2401-0004', amount: 450, date: '2024-05-24', paymentMethod: 'نقدي', notes: 'دفعة كاملة', type: 'final' },
  { id: 'pay3', orderId: 'o7', orderNumber: 'MTC-2401-0007', amount: 100, date: '2024-05-30', paymentMethod: 'نقدي', notes: 'عربون', type: 'deposit' },
];

export const sampleOrders: ServiceOrder[] = [
  {
    id: 'o1', orderNumber: 'MTC-2401-0001', customerId: 'c1', customerName: 'أحمد محمد العلي',
    deviceType: 'لابتوب', deviceBrand: 'Dell', deviceModel: 'Inspiron 15', serialNumber: 'DL-12345',
    problemDescription: 'الجهاز لا يعمل - شاشة سوداء عند التشغيل', status: 'in_repair',
    receivedDate: '2024-06-01', expectedDate: '2024-06-05', deliveredDate: '',
    estimatedCost: 500, finalCost: 0, notes: 'يحتاج فحص شامل لكرت الشاشة',
    accessories: 'شاحن - حقيبة', deviceCondition: 'جيدة - خدش بسيط في الغطاء',
    assignedTechnician: 'سعد الفني', priority: 'high', isPaid: false, paidAmount: 0, payments: []
  },
  {
    id: 'o2', orderNumber: 'MTC-2401-0002', customerId: 'c2', customerName: 'فاطمة علي الزهراني',
    deviceType: 'جوال', deviceBrand: 'Samsung', deviceModel: 'Galaxy S23', serialNumber: 'SM-54321',
    problemDescription: 'شاشة مكسورة تحتاج استبدال', status: 'waiting_parts',
    receivedDate: '2024-06-02', expectedDate: '2024-06-06', deliveredDate: '',
    estimatedCost: 800, finalCost: 0, notes: 'بانتظار شاشة بديلة من المورد',
    accessories: 'لا يوجد', deviceCondition: 'شاشة مكسورة - الجهاز يعمل',
    assignedTechnician: 'عمر الفني', priority: 'medium', isPaid: false, paidAmount: 200,
    payments: [{ id: 'pay1', orderId: 'o2', orderNumber: 'MTC-2401-0002', amount: 200, date: '2024-06-02', paymentMethod: 'بطاقة', notes: 'عربون مقدم', type: 'deposit' }]
  },
  {
    id: 'o3', orderNumber: 'MTC-2401-0003', customerId: 'c3', customerName: 'خالد العمري',
    deviceType: 'لابتوب', deviceBrand: 'HP', deviceModel: 'Pavilion 14', serialNumber: 'HP-99887',
    problemDescription: 'بطء شديد في الأداء وتعليق متكرر', status: 'ready',
    receivedDate: '2024-05-28', expectedDate: '2024-06-01', deliveredDate: '',
    estimatedCost: 300, finalCost: 350, notes: 'تم تغيير القرص الصلب إلى SSD وزيادة الرام',
    accessories: 'شاحن', deviceCondition: 'جيدة',
    assignedTechnician: 'سعد الفني', priority: 'low', isPaid: false, paidAmount: 0, payments: []
  },
  {
    id: 'o4', orderNumber: 'MTC-2401-0004', customerId: 'c4', customerName: 'نورة السعيد',
    deviceType: 'تابلت', deviceBrand: 'Apple', deviceModel: 'iPad Air 5', serialNumber: 'AP-11223',
    problemDescription: 'مشكلة في البطارية - تنفذ بسرعة كبيرة', status: 'delivered',
    receivedDate: '2024-05-20', expectedDate: '2024-05-25', deliveredDate: '2024-05-24',
    estimatedCost: 400, finalCost: 450, notes: 'تم تغيير البطارية بنجاح',
    accessories: 'شاحن - كفر حماية', deviceCondition: 'ممتازة',
    assignedTechnician: 'عمر الفني', priority: 'medium', isPaid: true, paidAmount: 450,
    payments: [{ id: 'pay2', orderId: 'o4', orderNumber: 'MTC-2401-0004', amount: 450, date: '2024-05-24', paymentMethod: 'نقدي', notes: 'دفعة كاملة', type: 'final' }]
  },
  {
    id: 'o5', orderNumber: 'MTC-2401-0005', customerId: 'c5', customerName: 'محمد الحربي',
    deviceType: 'جوال', deviceBrand: 'Apple', deviceModel: 'iPhone 14 Pro', serialNumber: 'AP-55667',
    problemDescription: 'الكاميرا الخلفية لا تعمل', status: 'diagnosing',
    receivedDate: '2024-06-03', expectedDate: '2024-06-07', deliveredDate: '',
    estimatedCost: 0, finalCost: 0, notes: 'قيد الفحص والتشخيص',
    accessories: 'لا يوجد', deviceCondition: 'جيدة - بدون خدوش',
    assignedTechnician: 'سعد الفني', priority: 'urgent', isPaid: false, paidAmount: 0, payments: []
  },
  {
    id: 'o6', orderNumber: 'MTC-2401-0006', customerId: 'c1', customerName: 'أحمد محمد العلي',
    deviceType: 'طابعة', deviceBrand: 'HP', deviceModel: 'LaserJet Pro M404', serialNumber: 'HP-77889',
    problemDescription: 'لا تطبع وتظهر رسالة خطأ في الورق', status: 'received',
    receivedDate: '2024-06-04', expectedDate: '2024-06-08', deliveredDate: '',
    estimatedCost: 200, finalCost: 0, notes: '',
    accessories: 'كابل USB - كابل الطاقة', deviceCondition: 'جيدة',
    assignedTechnician: '', priority: 'low', isPaid: false, paidAmount: 0, payments: []
  },
  {
    id: 'o7', orderNumber: 'MTC-2401-0007', customerId: 'c2', customerName: 'فاطمة علي الزهراني',
    deviceType: 'لابتوب', deviceBrand: 'Lenovo', deviceModel: 'ThinkPad X1', serialNumber: 'LN-33445',
    problemDescription: 'لوحة المفاتيح لا تعمل بعد انسكاب سائل', status: 'testing',
    receivedDate: '2024-05-30', expectedDate: '2024-06-03', deliveredDate: '',
    estimatedCost: 350, finalCost: 380, notes: 'تم تغيير لوحة المفاتيح والتنظيف الداخلي',
    accessories: 'شاحن - ماوس', deviceCondition: 'متوسطة - آثار سائل',
    assignedTechnician: 'عمر الفني', priority: 'high', isPaid: false, paidAmount: 100,
    payments: [{ id: 'pay3', orderId: 'o7', orderNumber: 'MTC-2401-0007', amount: 100, date: '2024-05-30', paymentMethod: 'نقدي', notes: 'عربون', type: 'deposit' }]
  },
];

export const sampleParts: SparePart[] = [
  { id: 'p1', name: 'شاشة Samsung Galaxy S23', category: 'شاشات', partNumber: 'SCR-S23-001', quantity: 3, minQuantity: 2, purchasePrice: 350, sellingPrice: 500, supplier: 'شركة الشاشات المتحدة', location: 'رف A1' },
  { id: 'p2', name: 'بطارية iPhone 14 Pro', category: 'بطاريات', partNumber: 'BAT-IP14P-001', quantity: 5, minQuantity: 3, purchasePrice: 120, sellingPrice: 200, supplier: 'مورد قطع Apple', location: 'رف A2' },
  { id: 'p3', name: 'قرص SSD 256GB Samsung', category: 'تخزين', partNumber: 'SSD-256-SAM', quantity: 8, minQuantity: 5, purchasePrice: 150, sellingPrice: 250, supplier: 'مورد التخزين الرقمي', location: 'رف B1' },
  { id: 'p4', name: 'بطارية iPad Air 5', category: 'بطاريات', partNumber: 'BAT-IPA5-001', quantity: 2, minQuantity: 2, purchasePrice: 180, sellingPrice: 300, supplier: 'مورد قطع Apple', location: 'رف A2' },
  { id: 'p5', name: 'كاميرا خلفية iPhone 14 Pro', category: 'كاميرات', partNumber: 'CAM-IP14P-001', quantity: 1, minQuantity: 2, purchasePrice: 200, sellingPrice: 350, supplier: 'مورد قطع Apple', location: 'رف A3' },
  { id: 'p6', name: 'لوحة مفاتيح Dell Inspiron', category: 'لوحات مفاتيح', partNumber: 'KB-DELL-INS', quantity: 4, minQuantity: 3, purchasePrice: 80, sellingPrice: 150, supplier: 'مورد Dell الرسمي', location: 'رف C1' },
  { id: 'p7', name: 'شاحن لابتوب HP 65W', category: 'شواحن', partNumber: 'CHR-HP-65W', quantity: 6, minQuantity: 4, purchasePrice: 60, sellingPrice: 120, supplier: 'مورد HP', location: 'رف C2' },
  { id: 'p8', name: 'رام DDR4 8GB Kingston', category: 'ذاكرة', partNumber: 'RAM-8G-KNG', quantity: 10, minQuantity: 5, purchasePrice: 100, sellingPrice: 180, supplier: 'مورد التخزين الرقمي', location: 'رف B2' },
  { id: 'p9', name: 'لوحة مفاتيح Lenovo ThinkPad', category: 'لوحات مفاتيح', partNumber: 'KB-LNV-TP', quantity: 3, minQuantity: 2, purchasePrice: 95, sellingPrice: 170, supplier: 'مورد Lenovo', location: 'رف C1' },
  { id: 'p10', name: 'شاشة iPhone 14 Pro', category: 'شاشات', partNumber: 'SCR-IP14P-001', quantity: 2, minQuantity: 3, purchasePrice: 450, sellingPrice: 650, supplier: 'مورد قطع Apple', location: 'رف A1' },
];

export const sampleProcedures: MaintenanceProcedure[] = [
  {
    id: 'pr1', orderId: 'o1', orderNumber: 'MTC-2401-0001',
    description: 'فحص أولي شامل للجهاز وتشخيص المشكلة',
    technicianName: 'سعد الفني', date: '2024-06-01', duration: 30,
    status: 'completed', partsUsed: [], laborCost: 50, notes: 'تم تحديد المشكلة في كرت الشاشة - يحتاج إعادة لحام'
  },
  {
    id: 'pr2', orderId: 'o1', orderNumber: 'MTC-2401-0001',
    description: 'إعادة لحام كرت الشاشة وتنظيف المروحة',
    technicianName: 'سعد الفني', date: '2024-06-02', duration: 120,
    status: 'in_progress', partsUsed: [], laborCost: 200, notes: 'جاري العمل على إعادة اللحام'
  },
  {
    id: 'pr3', orderId: 'o3', orderNumber: 'MTC-2401-0003',
    description: 'تغيير القرص الصلب HDD إلى SSD ونقل البيانات',
    technicianName: 'سعد الفني', date: '2024-05-29', duration: 90,
    status: 'completed',
    partsUsed: [{ partId: 'p3', partName: 'قرص SSD 256GB Samsung', quantity: 1, unitPrice: 250 }],
    laborCost: 100, notes: 'تم نقل جميع البيانات بنجاح وتثبيت النظام من جديد'
  },
  {
    id: 'pr4', orderId: 'o4', orderNumber: 'MTC-2401-0004',
    description: 'تغيير بطارية iPad Air واختبار الأداء',
    technicianName: 'عمر الفني', date: '2024-05-23', duration: 45,
    status: 'completed',
    partsUsed: [{ partId: 'p4', partName: 'بطارية iPad Air 5', quantity: 1, unitPrice: 300 }],
    laborCost: 150, notes: 'تم التغيير بنجاح - البطارية تدوم أكثر من 10 ساعات'
  },
  {
    id: 'pr5', orderId: 'o7', orderNumber: 'MTC-2401-0007',
    description: 'تغيير لوحة المفاتيح والتنظيف الداخلي من آثار السائل',
    technicianName: 'عمر الفني', date: '2024-06-01', duration: 75,
    status: 'completed',
    partsUsed: [{ partId: 'p9', partName: 'لوحة مفاتيح Lenovo ThinkPad', quantity: 1, unitPrice: 170 }],
    laborCost: 120, notes: 'تم التنظيف الشامل وتغيير لوحة المفاتيح'
  },
];

export const sampleTransactions: Transaction[] = [
  { id: 't1', orderId: 'o4', type: 'income', category: 'صيانة', amount: 450, date: '2024-05-24', description: 'دفعة كاملة - إصلاح iPad Air - نورة السعيد', paymentMethod: 'نقدي' },
  { id: 't2', orderId: 'o2', type: 'income', category: 'عربون', amount: 200, date: '2024-06-02', description: 'عربون - إصلاح Galaxy S23 - فاطمة علي', paymentMethod: 'بطاقة' },
  { id: 't3', orderId: 'o7', type: 'income', category: 'عربون', amount: 100, date: '2024-05-30', description: 'عربون - إصلاح ThinkPad - فاطمة علي', paymentMethod: 'نقدي' },
  { id: 't4', orderId: '', type: 'expense', category: 'قطع غيار', amount: 1050, date: '2024-05-15', description: 'شراء دفعة شاشات Samsung من المورد', paymentMethod: 'تحويل بنكي' },
  { id: 't5', orderId: '', type: 'expense', category: 'قطع غيار', amount: 960, date: '2024-05-20', description: 'شراء بطاريات وكاميرات iPhone من مورد Apple', paymentMethod: 'تحويل بنكي' },
  { id: 't6', orderId: '', type: 'expense', category: 'إيجار', amount: 3000, date: '2024-06-01', description: 'إيجار المحل - شهر يونيو 2024', paymentMethod: 'تحويل بنكي' },
  { id: 't7', orderId: '', type: 'expense', category: 'رواتب', amount: 8000, date: '2024-06-01', description: 'رواتب الفنيين - شهر يونيو 2024', paymentMethod: 'تحويل بنكي' },
  { id: 't8', orderId: '', type: 'expense', category: 'مصاريف عامة', amount: 500, date: '2024-06-02', description: 'فاتورة كهرباء المحل', paymentMethod: 'نقدي' },
];

export const statusLabels: Record<string, string> = {
  received: 'تم الاستلام',
  diagnosing: 'قيد الفحص',
  waiting_parts: 'بانتظار قطع غيار',
  in_repair: 'قيد الإصلاح',
  testing: 'قيد الاختبار',
  ready: 'جاهز للتسليم',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

export const statusColors: Record<string, string> = {
  received: 'bg-blue-100 text-blue-800',
  diagnosing: 'bg-yellow-100 text-yellow-800',
  waiting_parts: 'bg-orange-100 text-orange-800',
  in_repair: 'bg-purple-100 text-purple-800',
  testing: 'bg-indigo-100 text-indigo-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-200 text-gray-700',
  cancelled: 'bg-red-100 text-red-800',
};

export const priorityLabels: Record<string, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'عالي',
  urgent: 'عاجل',
};

export const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export const deviceTypes = ['لابتوب', 'جوال', 'تابلت', 'طابعة', 'شاشة', 'كمبيوتر مكتبي', 'أخرى'];
export const partCategories = ['شاشات', 'بطاريات', 'تخزين', 'ذاكرة', 'كاميرات', 'لوحات مفاتيح', 'شواحن', 'أخرى'];
export const paymentMethods = ['نقدي', 'بطاقة', 'تحويل بنكي', 'أخرى'];
