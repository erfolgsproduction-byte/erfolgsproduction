export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN_MARKETPLACE = 'ADMIN_MARKETPLACE',
  SETTING = 'SETTING',
  PRINT = 'PRINT',
  PRESS = 'PRESS',
  JAHIT = 'JAHIT',
  PACKING = 'PACKING'
}

export enum ViewType {
  DASHBOARD = 'DASHBOARD',
  INPUT_ORDER = 'INPUT_ORDER',
  ORDER_LIST = 'ORDER_LIST',
  CATALOG = 'CATALOG',
  REPORT = 'REPORT',
  TASKS = 'TASKS'
}

export enum OrderStatus {
  PENDING_SETTING = 'PENDING_SETTING',
  IN_SETTING = 'IN_SETTING',
  PENDING_PRINT = 'PENDING_PRINT',
  IN_PRINT = 'IN_PRINT',
  PENDING_PRESS = 'PENDING_PRESS',
  IN_PRESS = 'IN_PRESS',
  PENDING_JAHIT = 'PENDING_JAHIT',
  IN_JAHIT = 'IN_JAHIT',
  PENDING_PACKING = 'PENDING_PACKING',
  IN_PACKING = 'IN_PACKING',
  READY_TO_SHIP = 'READY_TO_SHIP',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  RETURNED = 'RETURNED'
}

export enum OrderType {
  PRE_ORDER = 'PRE_ORDER',
  STOCK = 'STOCK'
}

export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  image: string;
  description: string;
}

export interface Order {
  id: string;
  orderId: string;
  resi: string;
  productId: string;
  productName: string;
  size: string;
  quantity: number;
  orderDate: string;
  expedition: string;
  marketplace: string;
  type: OrderType;
  status: OrderStatus;
  returnDate?: string;
  backName?: string;
  backNumber?: string;
  history: {
    status: OrderStatus;
    updatedBy: string;
    updatedAt: string;
  }[];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPERADMIN]: 'Super Admin',
  [UserRole.ADMIN_MARKETPLACE]: 'Admin Marketplace',
  [UserRole.SETTING]: 'Tim Setting (Design)',
  [UserRole.PRINT]: 'Tim Print',
  [UserRole.PRESS]: 'Tim Press',
  [UserRole.JAHIT]: 'Tim Jahit',
  [UserRole.PACKING]: 'Tim Packing & Shipping'
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING_SETTING]: 'Menunggu Setting',
  [OrderStatus.IN_SETTING]: 'Proses Setting',
  [OrderStatus.PENDING_PRINT]: 'Menunggu Print',
  [OrderStatus.IN_PRINT]: 'Proses Print',
  [OrderStatus.PENDING_PRESS]: 'Menunggu Press',
  [OrderStatus.IN_PRESS]: 'Proses Press',
  [OrderStatus.PENDING_JAHIT]: 'Menunggu Jahit',
  [OrderStatus.IN_JAHIT]: 'Proses Jahit',
  [OrderStatus.PENDING_PACKING]: 'Menunggu Packing',
  [OrderStatus.IN_PACKING]: 'Proses Packing',
  [OrderStatus.READY_TO_SHIP]: 'Siap Dikirim',
  [OrderStatus.COMPLETED]: 'Selesai',
  [OrderStatus.CANCELED]: 'Dibatalkan (Cancel)',
  [OrderStatus.RETURNED]: 'Dikembalikan (Return)'
};

export const MARKETPLACE_LIST = [
  'Shopee Erfo.id',
  'Shopee Safashion',
  'Shopee Benghar',
  'Tiktok Shop Erfo',
  'Tiktok Shop Safashion',
  'Lazada Erfo',
  'WhatsApp',
  'Offline'
];