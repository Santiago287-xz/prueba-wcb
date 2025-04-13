// /app/types/membership.ts

// Core membership types - Updated for points-based system
export interface MembershipData {
  membershipType: string;
  membershipStatus: "active" | "expired" | "pending" | "suspended";
  accessPoints: number;
  rfidCardNumber: string;
  rfidAssignedAt?: Date | string;
  lastCheckIn?: Date | string | null;
}

// Access log entry - Updated with points and tolerance info
export interface AccessLogData {
  userId: string;
  status: 'allowed' | 'denied' | 'warning';
  reason?: string | null;
  processedBy?: string;
  pointsDeducted: number;
  isToleranceEntry: boolean;
  timestamp?: Date;
  location?: string;
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
}

export interface MembershipPrice {
  id: string;
  name: string;
  basePrice: number;
  description?: string;
}

// Response formats - Updated for points-based system
export interface RFIDScanResponse {
  status: 'allowed' | 'denied' | 'warning';
  user?: {
    id: string;
    name: string;
    email: string;
    membershipType: string;
    accessPoints: number;
    membershipStatus: string;
    lastCheckIn: Date | string | null;
  };
  accessLog?: any;
  message: string;
  pointsDeducted: number;
  isToleranceEntry: boolean;
}

export interface MembershipStatsResponse {
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  todayAccesses: number;
  averageVisitsPerWeek?: number;
  membershipsByType?: Record<string, number>;
  revenueThisMonth?: number;
}

// Event payload for real-time notifications - Updated for points
export interface RFIDEventPayload {
  type: 'allowed' | 'denied' | 'warning';
  message: string;
  user?: {
    id: string;
    name: string;
    membershipType: string;
    accessPoints: number;
    membershipStatus: string;
  };
  pointsDeducted?: number;
  isToleranceEntry?: boolean;
  cardNumber: string;
  timestamp?: string;
}