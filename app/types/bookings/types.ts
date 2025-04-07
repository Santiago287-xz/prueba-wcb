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
  selectedHour?: string |number;
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

export interface EventIndicator {
  type: 'futbol' | 'padel' | 'event';
  count: number;
}

export interface DayEvents {
  date: Date;
  events: Reservation[];
  indicators: EventIndicator[];
}

export interface GroupedEvent {
  id: string;
  virtualId: string;
  originalId?: string | null;
  name: string;
  courtId: string;
  courtName: string;
  courtType: string;
  startTime: string | Date;
  endTime: string | Date;
  isEvent: boolean;
  courts: string[];
}

export interface UnifiedCalendarProps {
  courts: Court[];
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  openReservationModal: (date: Date, hour?: number) => void;
  openEventModal: (event: Reservation) => void;
  openDetailModal: (reservation: Reservation) => void;
  loading: boolean;
}