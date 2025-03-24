export interface Court {
  id: string;
  name: string;
  type: string;  // Made non-optional
}

export interface Reservation {
  id: string;
  courtId: string;
  courtName?: string;  // Added for UI compatibility
  courtType?: string;  // Added for UI compatibility
  startTime: string | Date;
  endTime: string | Date;
  name: string;
  phone: string;
  paymentMethod: string;
  isRecurring: boolean;
  recurrenceEnd?: string | Date;
  paidSessions?: number;
  paymentNotes?: string;
  virtualId?: string;
  isVirtualInstance?: boolean;
  parentId?: string;
  status?: string;
  lastPaymentDate?: string | Date;
  isEvent?: boolean;  // Added for event identification
}

export interface CourtData {
  id: string;
  name: string;
  type: string;
  reservations: Reservation[];
}

export interface Event {
  id: string;
  name: string;
  courtType?: string;
  courtIds?: string[];
  date?: string | Date;
  startTime: string | Date;
  endTime: string | Date;
}

export interface ModalDataType {
  isOpen: boolean;
  type: 'create' | 'edit' | 'view';
  reservation: Reservation | null;
  selectedDay: Date | null;
  selectedHour?: number;
  courtId?: string;
  paidSessions: number;
  paymentMethod: string;
  paymentNotes: string;
  name: string;
  phone: string;
  isRecurring: boolean;
  recurrenceEnd: string;
  courts?: Court[];
  setCourtId?: (courtId: string) => void;
}