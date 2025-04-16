export interface DateRange {
  start: Date;
  end: Date;
}

// Member related types
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

// Court related types
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

// Sales related types
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

// Attendance related types
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

// Combined metrics
export interface Metrics {
  members: MembersMetrics;
  courts: CourtsMetrics;
  sales: SalesMetrics;
  attendance: AttendanceMetrics;
}

// UI Component props
export interface AnimatedCounterProps {
  value: number;
  duration?: number;
  previousValue?: number;
}

export interface MetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  secondary: string;
  trend: string;
  icon: 'users' | 'court' | 'money' | 'chart';
  loading: boolean;
  prefix?: string;
  suffix?: string;
}

export interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  loading: boolean;
}

export interface TableCardProps {
  title: string;
  children: React.ReactNode;
  loading: boolean;
}

// Transaction related types
export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description?: string;
  paymentMethod: string;
  location?: string;
  createdAt: string;
  userId?: string;
  userName?: string;
}

// Financial metrics by area
export interface AreaMetrics {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  transactionCount: number;
}

export interface AreasBreakdown {
  gym: AreaMetrics;
  courts: AreaMetrics;
  shop: AreaMetrics;
}

// Gym points system metrics
export interface GymPointsMetrics {
  totalPointsSold: number;
  totalPointsUsed: number;
  averagePointsPerMember: number;
  pointPackagesSold: PointPackageSale[];
}

export interface PointPackageSale {
  name: string;
  points: number;
  count: number;
  revenue: number;
}

// Gym access metrics
export interface GymAccessMetrics {
  today: number;
  thisWeek: number;
  thisMonth: number;
  byHour: { hour: string; count: number }[];
  byDay: { day: string; count: number }[];
}

// Financial comparison over time
export interface FinancialComparison {
  date: string;
  income: number;
  expense: number;
  balance: number;
}

// Enhanced metrics with new data points
export interface EnhancedMetrics extends Metrics {
  areas: AreasBreakdown;
  gymPoints: GymPointsMetrics;
  gymAccess: GymAccessMetrics;
  financialComparison: FinancialComparison[];
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    cashTotal: number;
    incomeCount: number;
    expenseCount: number; 
    cashCount: number;
  };
  chartData: {
    categoryData: {category: string; total: number}[];
    trendData: {month: string; income: number; expense: number}[];
  };
}