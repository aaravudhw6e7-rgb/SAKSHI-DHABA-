export enum PaymentMode {
  CASH = 'Cash',
  ONLINE = 'Online Payment',
  UDHARI = 'Udhari'
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Bill {
  id: string;
  timestamp: number;
  items: CartItem[];
  subtotal: number;
  tax: number;
  taxEnabled: boolean; // Flag to check if tax was applied
  total: number;
  paymentMode: PaymentMode;
  customerName?: string; // Optional, required for Udhari
  customerPhone?: string;
  isPaid: boolean; // For Udhari tracking
  isCanceled?: boolean; // Flag for canceled orders
  tableNo?: string; // New: Table Number
  notes?: string; // New: Kitchen/Cooking notes
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalDue: number;
  history: Bill[]; // Only Udhari bills associated with this customer
}

export interface AppState {
  menu: MenuItem[];
  bills: Bill[];
  customers: Customer[];
}

export type ViewState = 'POS' | 'UDHARI' | 'REPORTS' | 'MENU';