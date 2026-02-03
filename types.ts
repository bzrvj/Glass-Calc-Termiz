
export interface GlassType {
  id: string;
  name: string;
  pricePerM2: number;
  colorClass: string;
  textColor: string;
}

export interface OrderItem {
  id: string;
  glassType: GlassType;
  height: number; // in cm
  width: number;  // in cm
  quantity: number;
  areaM2: number;
  totalPrice: number;
}

export interface SavedOrder {
  id: string;
  timestamp: number;
  items: OrderItem[];
  totalAmount: number;
  totalArea: number;
  customerName?: string;
  wastePercent: number;
  // Added optional fields for payment tracking used by Receipt component
  paymentStatus?: 'unpaid' | 'full' | 'partial';
  paidAmount?: number;
}

export type ActiveInput = 'height' | 'width' | 'quantity';
