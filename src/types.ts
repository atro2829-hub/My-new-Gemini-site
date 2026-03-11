export interface User {
  id: number | string;
  email: string;
  balance: number;
  referral_code: string;
  referrals: number;
  is_admin: boolean;
  activePlans: ActivePlan[];
  transactions: Transaction[];
}

export interface Transaction {
  id: number | string;
  type: 'deposit' | 'withdrawal' | 'investment' | 'profit' | 'bonus';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
}

export interface ActivePlan {
  id: number | string;
  plan_name: string;
  amount: number;
  profit_rate: number;
  duration_days: number;
  start_date: string;
  end_date: string;
}

export interface InvestmentPlan {
  id: string;
  name: string;
  min_investment: number;
  duration_days: number;
  profit_percentage: number;
  color: string;
}
