export interface GrowthData {
  date: string;
  total: number;
  active: number;
}

export interface MembersMetrics {
  total: number;
  active: number;
  newThisMonth: number;
  retention: number;
  growthData: GrowthData[];
}

export interface PopularTime {
  hour: string;
  reservations: number;
}

export interface UtilizationByDay {
  day: string;
  futbol: number;
  padel: number;
}

export interface TopClient {
  name: string;
  reservations: number;
}

export interface CourtsMetrics {
  utilization: number;
  revenue: number;
  popularTimes: PopularTime[];
  popularCourts: any[];
  utilizationByDay: UtilizationByDay[];
  topClients: TopClient[];
}

export interface ByCategory {
  name: string;
  value: number;
}

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

export interface SalesMetrics {
  total: number;
  byCategory: ByCategory[];
  topProducts: TopProduct[];
}

export interface ByDayOfWeek {
  day: string;
  count: number;
}

export interface AttendanceMetrics {
  today: number;
  thisWeek: number;
  avgDaily: number;
  peakHours: any[];
  byDayOfWeek: ByDayOfWeek[];
}

export interface Metrics {
  members: MembersMetrics;
  courts: CourtsMetrics;
  sales: SalesMetrics;
  attendance: AttendanceMetrics;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AnimatedCounterProps {
  value: number;
  duration?: number;
  previousValue?: number;
}
