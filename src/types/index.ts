export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isCustom: boolean;
  createdAt: string;
}

export interface Subscription {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  amount: number;
  currency: string;
  billingCycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  nextRenewal: string;
  endDate: string | null;
  reminderDaysBefore: number;
  reminderSent: boolean;
  provider: string | null;
  website: string | null;
  notes: string | null;
  status: 'active' | 'paused' | 'cancelled';
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewSubscription {
  name: string;
  description?: string;
  categoryId?: string;
  amount: number;
  currency?: string;
  billingCycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  nextRenewal: string;
  endDate?: string;
  reminderDaysBefore?: number;
  provider?: string;
  website?: string;
  notes?: string;
  status?: 'active' | 'paused' | 'cancelled';
  autoRenew?: boolean;
}

export interface Alternative {
  id: string;
  subscriptionId: string;
  name: string;
  provider: string;
  amount: number;
  website: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Stats {
  totalActive: number;
  totalMonthly: number;
  totalYearly: number;
  expiringSoon: number;
}

export interface Settings {
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: string;
  emailFrom?: string;
  emailTo?: string;
}

export const BILLING_CYCLES = [
  { value: 'weekly', label: 'Settimanale' },
  { value: 'monthly', label: 'Mensile' },
  { value: 'quarterly', label: 'Trimestrale' },
  { value: 'yearly', label: 'Annuale' },
] as const;

export const STATUS_OPTIONS = [
  { value: 'active', label: 'Attivo', color: 'bg-green-100 text-green-800' },
  { value: 'paused', label: 'In pausa', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'cancelled', label: 'Cancellato', color: 'bg-red-100 text-red-800' },
] as const;
