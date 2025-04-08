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

// Physical properties for fitness tracking
export interface PhysicalData {
  height: number;          // in cm
  weight: number;          // in kg
  bodyFatPercentage?: number;
  bmi?: number;            // calculated field
  waistCircumference?: number;
  hipCircumference?: number;
  chestMeasurement?: number;
  bicepMeasurement?: number;
  legMeasurement?: number;
  restingHeartRate?: number;
  bloodPressure?: string;
}

// Goals and fitness levels
export interface FitnessProfile {
  goal: "gain_weight" | "lose_weight" | "get_fitter" | "get_stronger" | 
        "get_healthier" | "get_more_flexible" | "get_more_muscular" | "learn_the_basics";
  activityLevel?: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extra_active";
  level: "beginner" | "intermediate" | "advanced" | "expert" | "professional";
  focusAreas?: string[];  // e.g., ["upper body", "cardio", "flexibility"]
  workoutFrequency?: number; // target workouts per week
  dailyCalorieTarget?: number;
  dietaryRestrictions?: string[];
}

// Diet preferences and restrictions
export interface DietaryPreferences {
  dietType?: "omnivore" | "vegetarian" | "vegan" | "pescatarian" | "keto" | "paleo";
  allergies?: string[];
  intolerances?: string[];
  excludedFoods?: string[];
  preferredFoods?: string[];
  mealPreparationTime?: "minimal" | "moderate" | "extensive";
  waterIntakeTarget?: number; // in ml
}

// Medical information
export interface MedicalData {
  conditions?: string[];
  medications?: string[];
  bloodType?: string;
  medicalNotes?: string;
  dateOfLastCheckup?: Date | string;
}

// Emergency contact
export interface EmergencyContactData {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isEmergencyContact: boolean;
}

// Comprehensive member creation data
export interface MemberCreateData extends MembershipData {
  name: string;
  email: string;
  phone?: string | number;
  gender: 'male' | 'female';
  age?: number;
  
  // Physical and fitness data
  height?: number;
  weight?: number;
  goal?: string;
  
  // Additional information
  emergencyContact?: EmergencyContactData;
  medicalInfo?: MedicalData;
  dietaryPreferences?: DietaryPreferences;
  fitnessProfile?: FitnessProfile;
  
  // Custom fields
  notes?: string;
}

// Payment-related data
export interface MemberPaymentData {
  paymentMethod?: "cash" | "card" | "transfer" | "app";
  paymentAmount?: number;
  paymentDate?: Date | string;
  paymentNotes?: string;
  invoiceNumber?: string;
  receiptNumber?: string;
  membershipPeriod?: number; // in months
  discountApplied?: number;
  taxAmount?: number;
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