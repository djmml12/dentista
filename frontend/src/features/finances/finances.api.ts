import { api } from '@/lib/api';

export interface MonthSummary {
  collected: number;
  pending: number;
  draft: number;
}

export interface MonthData {
  month: string;
  label: string;
  collected: number;
  pending: number;
}

export interface ServiceTypeData {
  type: string;
  label: string;
  total: number;
}

export interface WeekProjection {
  label: string;
  appointments: number;
  estimated: number;
}

export interface Projection {
  upcomingCount: number;
  avgTicket: number;
  estimatedTotal: number;
  byWeek: WeekProjection[];
  hasData: boolean;
}

export interface RecentReceipt {
  id: string;
  patientId: string;
  patientName: string;
  status: 'PAID' | 'ISSUED' | 'CANCELLED';
  issuedAt: string;
  total: number;
}

export interface FinancialSummary {
  currentMonth: MonthSummary;
  lastSixMonths: MonthData[];
  byServiceType: ServiceTypeData[];
  projection: Projection;
  recentReceipts: RecentReceipt[];
}

export function fetchFinancialSummary(year: number, month: number): Promise<FinancialSummary> {
  return api<FinancialSummary>(`/finances/summary?year=${year}&month=${month}`);
}
