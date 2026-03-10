/**
 * PHP API Service
 * نظام إدارة مركز الصيانة
 */

const API_BASE = './api';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // For session cookies
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: 'فشل الاتصال بالخادم',
    };
  }
}

// ============ Auth API ============
export const authApi = {
  login: (username: string, password: string) =>
    apiRequest('auth.php?action=login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () => apiRequest('auth.php?action=logout'),

  check: () => apiRequest('auth.php?action=check'),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest('auth.php?action=change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),
};

// ============ Users API ============
export const usersApi = {
  getAll: () => apiRequest('users.php'),

  get: (id: string) => apiRequest(`users.php?id=${id}`),

  create: (user: Record<string, unknown>) =>
    apiRequest('users.php', {
      method: 'POST',
      body: JSON.stringify(user),
    }),

  update: (id: string, user: Record<string, unknown>) =>
    apiRequest(`users.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    }),

  delete: (id: string) =>
    apiRequest(`users.php?id=${id}`, {
      method: 'DELETE',
    }),
};

// ============ Orders API ============
export const ordersApi = {
  getAll: (params?: { status?: string; customer_id?: string; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest(`orders.php${query ? '?' + query : ''}`);
  },

  get: (id: string) => apiRequest(`orders.php?id=${id}`),

  create: (order: Record<string, unknown>) =>
    apiRequest('orders.php', {
      method: 'POST',
      body: JSON.stringify(order),
    }),

  update: (id: string, order: Record<string, unknown>) =>
    apiRequest(`orders.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(order),
    }),

  delete: (id: string) =>
    apiRequest(`orders.php?id=${id}`, {
      method: 'DELETE',
    }),

  addPayment: (payment: Record<string, unknown>) =>
    apiRequest('orders.php?action=payment', {
      method: 'POST',
      body: JSON.stringify(payment),
    }),

  addAction: (action: Record<string, unknown>) =>
    apiRequest('orders.php?action=action', {
      method: 'POST',
      body: JSON.stringify(action),
    }),
};

// ============ Customers API ============
export const customersApi = {
  getAll: (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiRequest(`customers.php${query}`);
  },

  get: (id: string) => apiRequest(`customers.php?id=${id}`),

  create: (customer: Record<string, unknown>) =>
    apiRequest('customers.php', {
      method: 'POST',
      body: JSON.stringify(customer),
    }),

  update: (id: string, customer: Record<string, unknown>) =>
    apiRequest(`customers.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    }),

  delete: (id: string) =>
    apiRequest(`customers.php?id=${id}`, {
      method: 'DELETE',
    }),
};

// ============ Spare Parts API ============
export const sparePartsApi = {
  getAll: (params?: { category?: string; low_stock?: boolean; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest(`spare-parts.php${query ? '?' + query : ''}`);
  },

  get: (id: string) => apiRequest(`spare-parts.php?id=${id}`),

  create: (part: Record<string, unknown>) =>
    apiRequest('spare-parts.php', {
      method: 'POST',
      body: JSON.stringify(part),
    }),

  update: (id: string, part: Record<string, unknown>) =>
    apiRequest(`spare-parts.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(part),
    }),

  delete: (id: string) =>
    apiRequest(`spare-parts.php?id=${id}`, {
      method: 'DELETE',
    }),

  use: (usage: { order_id: string; part_id: string; quantity: number; unit_price?: number }) =>
    apiRequest('spare-parts.php?action=use', {
      method: 'POST',
      body: JSON.stringify(usage),
    }),
};

// ============ Transactions API ============
export const transactionsApi = {
  getAll: (params?: { type?: string; category?: string; start_date?: string; end_date?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest(`transactions.php${query ? '?' + query : ''}`);
  },

  get: (id: string) => apiRequest(`transactions.php?id=${id}`),

  create: (transaction: Record<string, unknown>) =>
    apiRequest('transactions.php', {
      method: 'POST',
      body: JSON.stringify(transaction),
    }),

  update: (id: string, transaction: Record<string, unknown>) =>
    apiRequest(`transactions.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(transaction),
    }),

  delete: (id: string) =>
    apiRequest(`transactions.php?id=${id}`, {
      method: 'DELETE',
    }),
};

// ============ Settings API ============
export const settingsApi = {
  get: () => apiRequest('settings.php'),

  save: (settings: Record<string, unknown>) =>
    apiRequest('settings.php', {
      method: 'POST',
      body: JSON.stringify(settings),
    }),

  getCurrencies: () => apiRequest('settings.php?action=currencies'),

  saveCurrency: (currency: Record<string, unknown>) =>
    apiRequest('settings.php?action=currencies', {
      method: 'POST',
      body: JSON.stringify(currency),
    }),

  deleteCurrency: (id: string) =>
    apiRequest(`settings.php?action=currency&id=${id}`, {
      method: 'DELETE',
    }),

  getStats: () => apiRequest('settings.php?action=stats'),

  createBackup: () => apiRequest('settings.php?action=backup', { method: 'POST' }),

  restoreBackup: (backupData: Record<string, unknown>) =>
    apiRequest('settings.php?action=restore', {
      method: 'POST',
      body: JSON.stringify(backupData),
    }),
};

// ============ Check if PHP API is available ============
export async function checkPhpApi(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth.php?action=check`, {
      credentials: 'include',
    });
    return response.ok || response.status === 401;
  } catch {
    return false;
  }
}

export default {
  auth: authApi,
  users: usersApi,
  orders: ordersApi,
  customers: customersApi,
  spareParts: sparePartsApi,
  transactions: transactionsApi,
  settings: settingsApi,
  checkPhpApi,
};
