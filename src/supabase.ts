import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ServiceOrder, Customer, SparePart, Transaction, Currency, AppSettings, User, MaintenanceProcedure } from './types';

let supabase: SupabaseClient | null = null;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// ============ Initialize ============
export const initSupabase = (config: SupabaseConfig): boolean => {
  try {
    if (!config.url || !config.anonKey) return false;
    supabase = createClient(config.url, config.anonKey);
    return true;
  } catch (e) {
    console.error('Supabase init error:', e);
    return false;
  }
};

export const getSupabase = () => supabase;

// ============ Test Connection ============
export const testConnection = async (): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('settings').select('key').limit(1);
    return !error;
  } catch {
    return false;
  }
};

// ============ Setup Tables (run SQL) ============
export const setupTables = async (): Promise<{ success: boolean; message: string }> => {
  if (!supabase) return { success: false, message: 'غير متصل' };

  try {
    // Test if tables exist by trying to query them
    const { error: testError } = await supabase.from('settings').select('key').limit(1);
    
    if (testError && testError.code === '42P01') {
      // Table doesn't exist
      return { 
        success: false, 
        message: 'الجداول غير موجودة. يرجى تنفيذ ملف SQL أولاً في Supabase SQL Editor.' 
      };
    }

    return { success: true, message: 'الجداول جاهزة' };
  } catch (e) {
    return { success: false, message: 'خطأ: ' + (e as Error).message };
  }
};

// ============ ORDERS ============
export const loadOrders = async (): Promise<ServiceOrder[]> => {
  if (!supabase) return [];
  try {
    const { data: orders } = await supabase.from('orders').select('*').order('received_date', { ascending: false });
    if (!orders) return [];

    // Load payments for each order
    const { data: payments } = await supabase.from('payments').select('*');
    const paymentMap: Record<string, any[]> = {};
    (payments || []).forEach((p: any) => {
      if (!paymentMap[p.order_id]) paymentMap[p.order_id] = [];
      paymentMap[p.order_id].push({
        id: p.id, orderId: p.order_id, orderNumber: p.order_number,
        amount: p.amount, date: p.date, paymentMethod: p.payment_method,
        notes: p.notes || '', type: p.type
      });
    });

    return orders.map((o: any) => ({
      id: o.id, orderNumber: o.order_number, customerId: o.customer_id,
      customerName: o.customer_name, deviceType: o.device_type,
      deviceBrand: o.device_brand, deviceModel: o.device_model,
      serialNumber: o.serial_number || '', problemDescription: o.problem_description,
      status: o.status, receivedDate: o.received_date, expectedDate: o.expected_date || '',
      deliveredDate: o.delivered_date || '', estimatedCost: o.estimated_cost || 0,
      finalCost: o.final_cost || 0, notes: o.notes || '',
      accessories: o.accessories || '', deviceCondition: o.device_condition || '',
      assignedTechnician: o.assigned_technician || '', priority: o.priority || 'medium',
      isPaid: o.is_paid || false, paidAmount: o.paid_amount || 0,
      payments: paymentMap[o.id] || []
    }));
  } catch (e) { console.error('loadOrders error:', e); return []; }
};

export const saveOrder = async (order: ServiceOrder) => {
  if (!supabase) return;
  try {
    await supabase.from('orders').upsert({
      id: order.id, order_number: order.orderNumber, customer_id: order.customerId,
      customer_name: order.customerName, device_type: order.deviceType,
      device_brand: order.deviceBrand, device_model: order.deviceModel,
      serial_number: order.serialNumber, problem_description: order.problemDescription,
      status: order.status, received_date: order.receivedDate,
      expected_date: order.expectedDate, delivered_date: order.deliveredDate,
      estimated_cost: order.estimatedCost, final_cost: order.finalCost,
      notes: order.notes, accessories: order.accessories,
      device_condition: order.deviceCondition, assigned_technician: order.assignedTechnician,
      priority: order.priority, is_paid: order.isPaid, paid_amount: order.paidAmount
    });

    // Sync payments
    if (order.payments?.length) {
      for (const p of order.payments) {
        await supabase.from('payments').upsert({
          id: p.id, order_id: order.id, order_number: order.orderNumber,
          amount: p.amount, date: p.date, payment_method: p.paymentMethod,
          notes: p.notes, type: p.type
        });
      }
    }
  } catch (e) { console.error('saveOrder error:', e); }
};

export const deleteOrder = async (id: string) => {
  if (!supabase) return;
  try {
    await supabase.from('payments').delete().eq('order_id', id);
    await supabase.from('maintenance_actions').delete().eq('order_id', id);
    await supabase.from('orders').delete().eq('id', id);
  } catch (e) { console.error('deleteOrder error:', e); }
};

export const syncOrders = async (orders: ServiceOrder[]) => {
  if (!supabase) return;
  try {
    const rows = orders.map(o => ({
      id: o.id, order_number: o.orderNumber, customer_id: o.customerId,
      customer_name: o.customerName, device_type: o.deviceType,
      device_brand: o.deviceBrand, device_model: o.deviceModel,
      serial_number: o.serialNumber, problem_description: o.problemDescription,
      status: o.status, received_date: o.receivedDate,
      expected_date: o.expectedDate, delivered_date: o.deliveredDate,
      estimated_cost: o.estimatedCost, final_cost: o.finalCost,
      notes: o.notes, accessories: o.accessories,
      device_condition: o.deviceCondition, assigned_technician: o.assignedTechnician,
      priority: o.priority, is_paid: o.isPaid, paid_amount: o.paidAmount
    }));
    await supabase.from('orders').upsert(rows);

    // Sync all payments
    const allPayments = orders.flatMap(o => (o.payments || []).map(p => ({
      id: p.id, order_id: o.id, order_number: o.orderNumber,
      amount: p.amount, date: p.date, payment_method: p.paymentMethod,
      notes: p.notes, type: p.type
    })));
    if (allPayments.length > 0) {
      await supabase.from('payments').upsert(allPayments);
    }
  } catch (e) { console.error('syncOrders error:', e); }
};

// ============ CUSTOMERS ============
export const loadCustomers = async (): Promise<Customer[]> => {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    return (data || []).map((c: any) => ({
      id: c.id, name: c.name, phone: c.phone, email: c.email || '',
      address: c.address || '', createdAt: c.created_at
    }));
  } catch (e) { console.error('loadCustomers error:', e); return []; }
};

export const syncCustomers = async (customers: Customer[]) => {
  if (!supabase) return;
  try {
    const rows = customers.map(c => ({
      id: c.id, name: c.name, phone: c.phone, email: c.email,
      address: c.address, created_at: c.createdAt
    }));
    await supabase.from('customers').upsert(rows);
  } catch (e) { console.error('syncCustomers error:', e); }
};

// ============ SPARE PARTS ============
export const loadParts = async (): Promise<SparePart[]> => {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('spare_parts').select('*');
    return (data || []).map((p: any) => ({
      id: p.id, name: p.name, category: p.category || '',
      partNumber: p.part_number || '', quantity: p.quantity || 0,
      minQuantity: p.min_quantity || 0, purchasePrice: p.purchase_price || 0,
      sellingPrice: p.selling_price || 0, supplier: p.supplier || '',
      location: p.location || ''
    }));
  } catch (e) { console.error('loadParts error:', e); return []; }
};

export const syncParts = async (parts: SparePart[]) => {
  if (!supabase) return;
  try {
    const rows = parts.map(p => ({
      id: p.id, name: p.name, category: p.category,
      part_number: p.partNumber, quantity: p.quantity,
      min_quantity: p.minQuantity, purchase_price: p.purchasePrice,
      selling_price: p.sellingPrice, supplier: p.supplier, location: p.location
    }));
    await supabase.from('spare_parts').upsert(rows);
  } catch (e) { console.error('syncParts error:', e); }
};

// ============ TRANSACTIONS ============
export const loadTransactions = async (): Promise<Transaction[]> => {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    return (data || []).map((t: any) => ({
      id: t.id, orderId: t.order_id || '', type: t.type,
      category: t.category || '', amount: t.amount || 0,
      date: t.date, description: t.description || '',
      paymentMethod: t.payment_method || ''
    }));
  } catch (e) { console.error('loadTransactions error:', e); return []; }
};

export const syncTransactions = async (transactions: Transaction[]) => {
  if (!supabase) return;
  try {
    const rows = transactions.map(t => ({
      id: t.id, order_id: t.orderId || null, type: t.type,
      category: t.category, amount: t.amount, date: t.date,
      description: t.description, payment_method: t.paymentMethod
    }));
    await supabase.from('transactions').upsert(rows);
  } catch (e) { console.error('syncTransactions error:', e); }
};

// ============ PROCEDURES ============
export const loadProcedures = async (): Promise<MaintenanceProcedure[]> => {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('maintenance_actions').select('*').order('date', { ascending: false });
    return (data || []).map((p: any) => ({
      id: p.id, orderId: p.order_id, orderNumber: p.order_number || '',
      description: p.description || '', technicianName: p.technician_name || '',
      date: p.date, duration: p.duration || 0, status: p.status || 'pending',
      partsUsed: p.parts_used || [], laborCost: p.labor_cost || 0, notes: p.notes || ''
    }));
  } catch (e) { console.error('loadProcedures error:', e); return []; }
};

export const syncProcedures = async (procedures: MaintenanceProcedure[]) => {
  if (!supabase) return;
  try {
    const rows = procedures.map(p => ({
      id: p.id, order_id: p.orderId, order_number: p.orderNumber,
      description: p.description, technician_name: p.technicianName,
      date: p.date, duration: p.duration, status: p.status,
      parts_used: p.partsUsed, labor_cost: p.laborCost, notes: p.notes
    }));
    await supabase.from('maintenance_actions').upsert(rows);
  } catch (e) { console.error('syncProcedures error:', e); }
};

// ============ USERS ============
export const loadUsers = async (): Promise<User[]> => {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('users').select('*');
    return (data || []).map((u: any) => ({
      id: u.id, username: u.username, password: u.password,
      fullName: u.full_name, email: u.email || '', phone: u.phone || '',
      role: u.role, avatar: u.avatar || '', isActive: u.is_active !== false,
      createdAt: u.created_at || '', lastLogin: u.last_login || '',
      permissions: u.permissions || {}
    }));
  } catch (e) { console.error('loadUsers error:', e); return []; }
};

export const syncUsers = async (users: User[]) => {
  if (!supabase) return;
  try {
    const rows = users.map(u => ({
      id: u.id, username: u.username, password: u.password,
      full_name: u.fullName, email: u.email, phone: u.phone,
      role: u.role, avatar: u.avatar, is_active: u.isActive,
      created_at: u.createdAt, last_login: u.lastLogin,
      permissions: u.permissions
    }));
    await supabase.from('users').upsert(rows);
  } catch (e) { console.error('syncUsers error:', e); }
};

// ============ CURRENCIES ============
export const loadCurrencies = async (): Promise<Currency[]> => {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('currencies').select('*');
    return (data || []).map((c: any) => ({
      id: c.id, code: c.code, nameAr: c.name_ar, nameEn: c.name_en || '',
      symbol: c.symbol, exchangeRate: c.exchange_rate || 1,
      isDefault: c.is_default || false, decimalPlaces: c.decimal_places || 2,
      symbolPosition: c.symbol_position || 'after'
    }));
  } catch (e) { console.error('loadCurrencies error:', e); return []; }
};

export const syncCurrencies = async (currencies: Currency[]) => {
  if (!supabase) return;
  try {
    const rows = currencies.map(c => ({
      id: c.id, code: c.code, name_ar: c.nameAr, name_en: c.nameEn,
      symbol: c.symbol, exchange_rate: c.exchangeRate,
      is_default: c.isDefault, decimal_places: c.decimalPlaces,
      symbol_position: c.symbolPosition
    }));
    await supabase.from('currencies').upsert(rows);
  } catch (e) { console.error('syncCurrencies error:', e); }
};

// ============ SETTINGS ============
export const loadSettings = async (): Promise<AppSettings | null> => {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from('settings').select('*').eq('key', 'app_settings').single();
    if (data?.value) {
      return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    }
    return null;
  } catch (e) { console.error('loadSettings error:', e); return null; }
};

export const syncSettings = async (settings: AppSettings) => {
  if (!supabase) return;
  try {
    await supabase.from('settings').upsert({
      key: 'app_settings',
      value: settings,
      updated_at: new Date().toISOString()
    });
  } catch (e) { console.error('syncSettings error:', e); }
};

// ============ LOAD ALL DATA ============
export const loadAllData = async () => {
  if (!supabase) return null;
  try {
    const [orders, customers, parts, transactions, procedures, users, currencies, settings] = await Promise.all([
      loadOrders(), loadCustomers(), loadParts(), loadTransactions(),
      loadProcedures(), loadUsers(), loadCurrencies(), loadSettings()
    ]);
    return { orders, customers, parts, transactions, procedures, users, currencies, settings };
  } catch (e) {
    console.error('loadAllData error:', e);
    return null;
  }
};

// ============ FULL SYNC (upload all local data) ============
export const uploadAllData = async (data: {
  orders: ServiceOrder[];
  customers: Customer[];
  parts: SparePart[];
  transactions: Transaction[];
  procedures: MaintenanceProcedure[];
  users: User[];
  currencies: Currency[];
  settings: AppSettings;
}) => {
  if (!supabase) return false;
  try {
    await Promise.all([
      syncOrders(data.orders),
      syncCustomers(data.customers),
      syncParts(data.parts),
      syncTransactions(data.transactions),
      syncProcedures(data.procedures),
      syncUsers(data.users),
      syncCurrencies(data.currencies),
      syncSettings(data.settings),
    ]);
    return true;
  } catch (e) {
    console.error('uploadAllData error:', e);
    return false;
  }
};
