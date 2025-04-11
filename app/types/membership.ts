// /app/types/membership.ts

// Core membership types
export interface MembershipData {
  membershipType: string;
  membershipStatus: "active" | "expired" | "pending" | "suspended";
  membershipExpiry: Date | string | null;
  rfidCardNumber: string;
  rfidAssignedAt?: Date | string;
  lastCheckIn?: Date | string | null;
}

// Access log entry
export interface AccessLogData {
  userId: string;
  status: 'allowed' | 'denied' | 'warning';
  reason?: string | null;
  processedBy?: string;
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
  membershipExpiry?: string | Date;
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
// Response formats
export interface RFIDScanResponse {
  status: 'allowed' | 'denied' | 'warning';
  user?: {
    id: string;
    name: string;
    email: string;
    membershipType: string;
    membershipExpiry: Date | string | null;
    membershipStatus: string;
    lastCheckIn: Date | string | null;
  };
  accessLog?: any;
  message: string;
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

// Event payload for real-time notifications
export interface RFIDEventPayload {
  type: 'allowed' | 'denied' | 'warning';
  message: string;
  user?: {
    id: string;
    name: string;
    membershipType: string;
    membershipStatus: string;
  };
  cardNumber: string;
  timestamp?: string;
}