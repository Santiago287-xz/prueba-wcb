export interface Trainer {
  id: string;
  name: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string | number;
  gender: 'male' | 'female' | 'other';
  age?: number;
  rfidCardNumber?: string;
  membershipType?: string;
  membershipStatus?: string;
  accessPoints: number;
  lastCheckIn?: string | Date;
  height?: number;
  weight?: number;
  goal?: string;
  level?: string;
  trainer?: string;
}

export interface MembershipPrice {
  id: string;
  name: string;
  basePrice: number;
  description?: string;
}

export interface FormState {
  name: string;
  email: string;
  phone: string;
  gender: 'male' | 'female' | 'other';
  age: string;
  rfidCardNumber: string;
  membershipTypeId: string;
  membershipStatus: string;
  accessPoints: number;
  paymentMethod: string;
  height: string;
  weight: string;
  goal: string;
  level: string;
  trainer: string;
}

export interface RenewalState {
  membershipTypeId: string;
  pointsAmount: number;
  paymentMethod: string;
  totalAmount: number;
}

export interface FormErrors {
  name: boolean;
  email: boolean;
  rfidCardNumber: boolean;
  phone: boolean;
  age: boolean;
  height: boolean;
  weight: boolean;
}

export interface NotificationState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}