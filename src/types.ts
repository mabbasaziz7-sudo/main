export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
}

export interface ServiceOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber: string;
  problemDescription: string;
  status: OrderStatus;
  receivedDate: string;
  expectedDate: string;
  deliveredDate: string;
  estimatedCost: number;
  finalCost: number;
  notes: string;
  accessories: string;
  deviceCondition: string;
  assignedTechnician: string;
  priority: Priority;
  isPaid: boolean;
  paidAmount: number;
  payments: Payment[];
}

export type OrderStatus = 'received' | 'diagnosing' | 'waiting_parts' | 'in_repair' | 'testing' | 'ready' | 'delivered' | 'cancelled';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Payment {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  date: string;
  paymentMethod: string;
  notes: string;
  type: 'deposit' | 'partial' | 'final' | 'refund';
}

export interface MaintenanceProcedure {
  id: string;
  orderId: string;
  orderNumber: string;
  description: string;
  technicianName: string;
  date: string;
  duration: number;
  status: 'pending' | 'in_progress' | 'completed';
  partsUsed: UsedPart[];
  laborCost: number;
  notes: string;
}

export interface UsedPart {
  partId: string;
  partName: string;
  quantity: number;
  unitPrice: number;
}

export interface SparePart {
  id: string;
  name: string;
  category: string;
  partNumber: string;
  quantity: number;
  minQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
  supplier: string;
  location: string;
}

export interface Transaction {
  id: string;
  orderId: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  description: string;
  paymentMethod: string;
}

// ============ Currency & Settings Types ============

export interface Currency {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  symbol: string;
  exchangeRate: number;
  isDefault: boolean;
  decimalPlaces: number;
  symbolPosition: 'before' | 'after';
}

export interface AppSettings {
  centerName: string;
  centerPhone: string;
  centerEmail: string;
  centerAddress: string;
  centerLogo: string;
  workingHours: string;
  taxEnabled: boolean;
  taxRate: number;
  taxName: string;
  taxInclusive: boolean;
  technicians: string[];
  orderPrefix: string;
  defaultWarrantyDays: number;
  lowStockAlert: boolean;
  lowStockThreshold: number;
  primaryColor: string;
  receiptHeader: string;
  receiptFooter: string;
  showLogoOnReceipt: boolean;
}

// ============ User & Auth Types ============

export type UserRole = 'admin' | 'manager' | 'technician' | 'receptionist';

export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string;
  permissions: UserPermissions;
}

export interface UserPermissions {
  dashboard: boolean;
  reception: boolean;
  maintenance: boolean;
  parts: boolean;
  financial: boolean;
  customers: boolean;
  settings: boolean;
  users: boolean;
}

export interface Session {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  avatar: string;
  loginTime: string;
  permissions: UserPermissions;
}

export type Page = 'dashboard' | 'reception' | 'maintenance' | 'parts' | 'financial' | 'customers' | 'settings' | 'users';

export interface BackupData {
  version: string;
  timestamp: string;
  exportedBy: string;
  stats: {
    orders: number;
    customers: number;
    inventory: number;
    transactions: number;
    users: number;
  };
  system: {
    settings: AppSettings;
    currencies: Currency[];
    users: User[];
  };
  data: {
    orders: ServiceOrder[];
    customers: Customer[];
    inventory: SparePart[];
    transactions: Transaction[];
  };
}
