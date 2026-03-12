import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Wallet, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Info, 
  LogOut, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft,
  ChevronRight,
  Shield,
  Copy,
  CheckCircle2,
  Clock,
  AlertCircle,
  Bell,
  User as UserIcon,
  Settings as SettingsIcon,
  HelpCircle,
  Filter
} from 'lucide-react';
import { User, Transaction, InvestmentPlan, ActivePlan } from './types';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { cn } from './utils';

// --- Toast System ---

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 20, scale: 0.9 }}
    className={cn(
      "fixed bottom-24 left-6 right-6 z-[100] p-4 rounded-2xl shadow-2xl flex items-center space-x-3 border",
      type === 'success' ? "bg-emerald-600 text-white border-emerald-500" :
      type === 'error' ? "bg-red-600 text-white border-red-500" :
      "bg-indigo-600 text-white border-indigo-500"
    )}
  >
    {type === 'success' ? <CheckCircle2 size={20} /> : 
     type === 'error' ? <AlertCircle size={20} /> : <Bell size={20} />}
    <p className="text-sm font-bold flex-1">{message}</p>
    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
      <Plus size={18} className="rotate-45" />
    </button>
  </motion.div>
);

// --- Skeleton Components ---

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-gray-200 rounded-xl", className)} />
);

// --- Components ---

const SubNav = ({ tabs, activeTab, setActiveTab }: { tabs: { id: string, label: string }[], activeTab: string, setActiveTab: (tab: string) => void }) => (
  <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
          activeTab === tab.id 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
            : 'bg-white text-gray-400 border border-gray-100'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

const BottomNav = ({ activeTab, setActiveTab, isAdmin }: { activeTab: string, setActiveTab: (tab: string) => void, isAdmin: boolean }) => {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
    { id: 'plans', icon: TrendingUp, label: 'Invest' },
    { id: 'wallet', icon: Wallet, label: 'Wallet' },
    { id: 'referral', icon: Users, label: 'Invite' },
    { id: 'support', icon: MessageSquare, label: 'Support' },
  ];

  if (isAdmin) {
    tabs.push({ id: 'admin', icon: Shield, label: 'Admin' });
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50 pb-safe">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex flex-col items-center space-y-1 transition-colors ${
            activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
          <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

const Header = ({ user, onLogout }: { user: User | null, onLogout: () => void }) => (
  <div className="flex justify-between items-center px-6 py-4 bg-white sticky top-0 z-40">
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
        <TrendingUp size={18} className="text-white" />
      </div>
      <span className="font-bold text-xl tracking-tight text-gray-900">Vanguard</span>
    </div>
    {user && (
      <button onClick={onLogout} className="text-gray-400 hover:text-red-500 transition-colors">
        <LogOut size={20} />
      </button>
    )}
  </div>
);

// --- Screens ---

const LoginScreen = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isRegister) {
        // 1. Register on server (creates Auth user + Firestore profile)
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, referralCode }),
        });
        const data = await res.json();
        if (res.ok) {
          // 2. Sign in on client
          await signInWithEmailAndPassword(auth, email, password);
          onLogin(data);
        } else {
          setError(data.error || 'Registration failed');
        }
      } else {
        // 1. Sign in on client
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();
        
        // 2. Get profile from server
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        const data = await res.json();
        if (res.ok) {
          onLogin(data);
        } else {
          setError(data.error || 'Login failed');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-12">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Shield size={32} className="text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          {isRegister ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Professional investment management at your fingertips.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-gray-200/50 rounded-3xl border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center space-x-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Referral Code (Optional)</label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="block w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                  placeholder="CODE123"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isRegister ? 'Sign Up' : 'Sign In')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardScreen = ({ user, refreshUser, setActiveTab, subTab, setSubTab }: { user: User, refreshUser: () => void, setActiveTab: (tab: string) => void, subTab: string, setSubTab: (tab: string) => void }) => {
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'profit'>('all');
  
  const totalInvested = user.activePlans.reduce((sum, plan) => sum + plan.amount, 0);
  const totalProfit = user.transactions
    .filter(tx => tx.type === 'profit')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return user.transactions;
    return user.transactions.filter(tx => tx.type === filter);
  }, [user.transactions, filter]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'investments', label: 'Investments' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div className="space-y-6 pb-24 px-6 pt-2">
      <SubNav tabs={tabs} activeTab={subTab} setActiveTab={setSubTab} />

      {subTab === 'overview' && (
        <>
          {/* Balance Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-600 rounded-3xl p-6 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp size={120} />
            </div>
            <div className="relative z-10">
              <p className="text-indigo-100 text-xs font-semibold uppercase tracking-widest mb-1">Total Balance</p>
              <h3 className="text-4xl font-bold tracking-tight">${user.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
              
              <div className="mt-8 flex space-x-3">
                <button 
                  onClick={() => setActiveTab('wallet')}
                  className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md py-3 rounded-xl flex items-center justify-center space-x-2 transition-all"
                >
                  <Plus size={18} />
                  <span className="font-bold text-sm">Deposit</span>
                </button>
                <button 
                  onClick={() => setActiveTab('wallet')}
                  className="flex-1 bg-white text-indigo-600 py-3 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg"
                >
                  <ArrowUpRight size={18} />
                  <span className="font-bold text-sm">Withdraw</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Investment Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Invested</p>
              </div>
              <p className="text-xl font-bold text-gray-900">${totalInvested.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Profit</p>
              </div>
              <p className="text-xl font-bold text-emerald-600">+${totalProfit.toLocaleString()}</p>
            </div>
          </div>

          {/* Rewards & Referrals */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-3xl border border-amber-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Available Rewards</h4>
                <p className="text-[10px] text-amber-700 font-medium">Invite friends to earn more</p>
              </div>
              <div className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                {user.referrals} Referrals
              </div>
            </div>
            <div className="flex items-center justify-between bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-white/40">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Referral Bonus</p>
                  <p className="text-[10px] text-gray-500">Earn 5% on every deposit</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('referral')}
                className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-xl transition-colors shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {subTab === 'investments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-gray-900">Active Investments</h4>
            <button onClick={() => setActiveTab('plans')} className="text-indigo-600 text-xs font-bold flex items-center space-x-1">
              <Plus size={14} />
              <span>New Plan</span>
            </button>
          </div>
          {user.activePlans.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-sm">No active investments</p>
              <button onClick={() => setActiveTab('plans')} className="mt-4 text-indigo-600 font-bold text-sm underline">Browse Plans</button>
            </div>
          ) : (
            <div className="space-y-3">
              {user.activePlans.map((plan) => (
                <div key={plan.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-100 transition-colors">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{plan.plan_name}</p>
                        <p className="text-[10px] text-gray-400">Matures: {new Date(plan.end_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-indigo-600">${plan.amount.toFixed(2)}</p>
                      <div className="flex items-center justify-end space-x-1">
                        <ArrowUpRight size={10} className="text-emerald-500" />
                        <p className="text-[10px] font-bold text-emerald-500">{plan.profit_rate}% Return</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === 'activity' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-gray-900">Activity History</h4>
            <div className="flex items-center space-x-2">
              <Filter size={14} className="text-gray-400" />
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="text-xs font-bold text-gray-600 bg-transparent outline-none cursor-pointer"
              >
                <option value="all">All</option>
                <option value="deposit">Deposits</option>
                <option value="withdrawal">Withdrawals</option>
                <option value="profit">Profits</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">No transactions found</p>
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div key={tx.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      tx.type === 'deposit' ? 'bg-emerald-50 text-emerald-600' : 
                      tx.type === 'withdrawal' ? 'bg-red-50 text-red-600' : 
                      tx.type === 'profit' ? 'bg-indigo-50 text-indigo-600' :
                      'bg-blue-50 text-blue-600'
                    )}>
                      {tx.type === 'deposit' ? <ArrowDownLeft size={20} /> : 
                       tx.type === 'withdrawal' ? <ArrowUpRight size={20} /> : 
                       tx.type === 'profit' ? <TrendingUp size={20} /> :
                       <TrendingUp size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900 capitalize">{tx.type}</p>
                      <p className="text-[10px] text-gray-400">{new Date(tx.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-bold text-sm",
                      tx.type === 'deposit' || tx.type === 'profit' ? 'text-emerald-600' : 'text-gray-900'
                    )}>
                      {tx.type === 'deposit' || tx.type === 'profit' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </p>
                    <p className={cn(
                      "text-[10px] font-bold uppercase tracking-tighter",
                      tx.status === 'completed' ? 'text-emerald-500' : 
                      tx.status === 'pending' ? 'text-amber-500' : 'text-red-500'
                    )}>
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const PlansScreen = ({ user, refreshUser, plans }: { user: User, refreshUser: () => void, plans: InvestmentPlan[] }) => {
  const [investing, setInvesting] = useState<InvestmentPlan | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleInvest = async () => {
    if (!investing) return;
    const invAmount = parseFloat(amount);
    if (isNaN(invAmount) || invAmount < investing.min_investment) {
      alert(`Minimum investment for this plan is $${investing.min_investment}`);
      return;
    }
    if (invAmount > user.balance) {
      alert('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/invest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          planName: investing.name,
          amount: invAmount,
          profitRate: investing.profit_percentage,
          durationDays: investing.duration_days,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        refreshUser();
        setTimeout(() => {
          setSuccess(false);
          setInvesting(null);
          setAmount('');
        }, 2000);
      }
    } catch (e) {
      alert('Investment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 pb-24 space-y-6">
      <div className="pt-2">
        <h2 className="text-2xl font-bold text-gray-900">VIP Investment Plans</h2>
        <p className="text-sm text-gray-500">Choose a plan that fits your goals.</p>
      </div>

      <div className="space-y-4">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm overflow-hidden relative">
            <div className={`absolute top-0 right-0 w-32 h-32 ${plan.color} opacity-5 -mr-8 -mt-8 rounded-full`} />
            <div className="flex justify-between items-start relative z-10">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md text-white ${plan.color} mb-2 inline-block`}>
                  {plan.name}
                </span>
                <h3 className="text-2xl font-bold text-gray-900">+{plan.profit_percentage}%</h3>
                <p className="text-xs text-gray-400 font-medium">Profit after {plan.duration_days} days</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Min Invest</p>
                <p className="text-lg font-bold text-gray-900">${plan.min_investment}</p>
              </div>
            </div>
            <button 
              onClick={() => setInvesting(plan)}
              className="w-full mt-4 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-indigo-600 transition-colors"
            >
              Invest Now
            </button>
          </div>
        ))}
      </div>

      {/* Investment Modal */}
      <AnimatePresence>
        {investing && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !loading && setInvesting(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-8 relative z-10"
            >
              {success ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Investment Successful!</h3>
                  <p className="text-gray-500 mt-2">Your plan is now active.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Invest in {investing.name}</h3>
                  <p className="text-sm text-gray-500 mb-6">Enter the amount you wish to invest.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Investment Amount</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full pl-8 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 text-xl font-bold outline-none"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2">Available Balance: ${user.balance.toFixed(2)}</p>
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-2xl space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-indigo-600 font-medium">Expected Profit</span>
                        <span className="text-indigo-900 font-bold">
                          ${((parseFloat(amount) || 0) * (investing.profit_percentage / 100)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-indigo-600 font-medium">Total Return</span>
                        <span className="text-indigo-900 font-bold">
                          ${((parseFloat(amount) || 0) * (1 + investing.profit_percentage / 100)).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleInvest}
                      disabled={loading || !amount}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Confirm Investment'}
                    </button>
                    <button
                      onClick={() => setInvesting(null)}
                      disabled={loading}
                      className="w-full py-2 text-gray-400 font-bold text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const WalletScreen = ({ user, refreshUser, settings, subTab, setSubTab }: { user: User, refreshUser: () => void, settings: any, subTab: string, setSubTab: (tab: string) => void }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const tabs = [
    { id: 'deposit', label: 'Deposit' },
    { id: 'withdraw', label: 'Withdraw' },
    { id: 'history', label: 'History' },
  ];

  const handleAction = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/${subTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, amount: val }),
      });
      if (res.ok) {
        alert(`${subTab.charAt(0).toUpperCase() + subTab.slice(1)} successful!`);
        setAmount('');
        refreshUser();
      } else {
        const data = await res.json();
        alert(data.error || 'Action failed');
      }
    } catch (e) {
      alert('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(settings.usdt_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-6 pb-24 space-y-6">
      <div className="pt-2">
        <h2 className="text-2xl font-bold text-gray-900">My Wallet</h2>
        <p className="text-sm text-gray-500">Manage your funds securely.</p>
      </div>

      <SubNav tabs={tabs} activeTab={subTab} setActiveTab={setSubTab} />

      {subTab === 'history' ? (
        <div className="space-y-3">
          {user.transactions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-sm">No transaction history</p>
            </div>
          ) : (
            user.transactions.map((tx) => (
              <div key={tx.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tx.type === 'deposit' ? 'bg-emerald-50 text-emerald-600' : 
                    tx.type === 'withdrawal' ? 'bg-red-50 text-red-600' : 
                    'bg-blue-50 text-blue-600'
                  }`}>
                    {tx.type === 'deposit' ? <ArrowDownLeft size={20} /> : 
                     tx.type === 'withdrawal' ? <ArrowUpRight size={20} /> : 
                     <TrendingUp size={20} />}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900 capitalize">{tx.type}</p>
                    <p className="text-[10px] text-gray-400">{new Date(tx.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${
                    tx.type === 'deposit' || tx.type === 'profit' ? 'text-emerald-600' : 'text-gray-900'
                  }`}>
                    {tx.type === 'deposit' || tx.type === 'profit' ? '+' : '-'}${tx.amount.toFixed(2)}
                  </p>
                  <p className={`text-[10px] font-bold uppercase tracking-tighter ${
                    tx.status === 'completed' ? 'text-emerald-500' : 
                    tx.status === 'pending' ? 'text-amber-500' : 'text-red-500'
                  }`}>
                    {tx.status}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Amount to {subTab}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 text-xl font-bold outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          {subTab === 'deposit' ? (
            <div className="space-y-4">
              <div className="bg-indigo-50 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">USDT Address (TRC20)</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono font-bold text-indigo-900 break-all mr-2">{settings.usdt_address}</p>
                  <button onClick={copyAddress} className="text-indigo-600 p-2 bg-white rounded-lg shadow-sm">
                    {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              <div className="bg-indigo-50 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Binance ID</p>
                <p className="text-sm font-mono font-bold text-indigo-900">{settings.binance_id}</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl flex items-start space-x-3">
                <AlertCircle size={20} className="text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  After sending funds, enter the amount above and click confirm. Our team will verify and credit your account.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 p-4 rounded-2xl flex items-start space-x-3">
              <AlertCircle size={20} className="text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">
                Withdrawals are processed within 24 hours after verification. Please ensure your wallet address is correct.
              </p>
            </div>
          )}

          <button
            onClick={handleAction}
            disabled={loading || !amount}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {loading ? 'Processing...' : `Confirm ${subTab.charAt(0).toUpperCase() + subTab.slice(1)}`}
          </button>
        </div>
      )}
    </div>
  );
};

const ReferralScreen = ({ user, subTab, setSubTab }: { user: User, subTab: string, setSubTab: (tab: string) => void }) => {
  const [copied, setCopied] = useState(false);
  const referralLink = `${window.location.origin}/register?ref=${user.referral_code}`;

  const tabs = [
    { id: 'invite', label: 'Invite' },
    { id: 'stats', label: 'Stats' },
  ];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(user.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-6 pb-24 space-y-6">
      <div className="pt-2">
        <h2 className="text-2xl font-bold text-gray-900">Referral Program</h2>
        <p className="text-sm text-gray-500">Earn bonuses for every friend you invite.</p>
      </div>

      <SubNav tabs={tabs} activeTab={subTab} setActiveTab={setSubTab} />

      {subTab === 'invite' && (
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
          <div className="relative z-10 text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={40} />
            </div>
            <h3 className="text-2xl font-bold mb-2">Refer & Earn</h3>
            <p className="text-indigo-100 text-sm mb-6">Get 5% of your friend's first investment as a bonus.</p>
            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between border border-white/20">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 text-left">Your Code</p>
                <p className="text-xl font-mono font-bold tracking-widest">{user.referral_code}</p>
              </div>
              <button 
                onClick={copyToClipboard}
                className="bg-white text-indigo-600 p-3 rounded-xl shadow-lg hover:scale-105 transition-transform"
              >
                {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {subTab === 'stats' && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <h4 className="font-bold text-gray-900 mb-4">Referral Stats</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Invited</p>
              <p className="text-2xl font-bold text-gray-900">{user.referrals}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Bonus</p>
              <p className="text-2xl font-bold text-emerald-600">$0.00</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SupportScreen = ({ user, onLogout, subTab, setSubTab }: { user: User, onLogout: () => void, subTab: string, setSubTab: (tab: string) => void }) => {
  const tabs = [
    { id: 'support', label: 'Support' },
    { id: 'profile', label: 'Profile' },
  ];

  return (
    <div className="px-6 pb-24 space-y-6">
      <div className="pt-2">
        <h2 className="text-2xl font-bold text-gray-900">Account & Support</h2>
        <p className="text-sm text-gray-500">Manage your profile and get help.</p>
      </div>

      <SubNav tabs={tabs} activeTab={subTab} setActiveTab={setSubTab} />

      {subTab === 'support' && (
        <div className="space-y-4">
          <button className="w-full bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <MessageSquare size={24} />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900">Live Chat</p>
                <p className="text-xs text-gray-400">Average wait: 2 mins</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
          </button>

          <button className="w-full bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <HelpCircle size={24} />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900">FAQs</p>
                <p className="text-xs text-gray-400">Common questions answered</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-300 group-hover:text-emerald-600 transition-colors" />
          </button>
        </div>
      )}

      {subTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm text-center">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
              <UserIcon size={48} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{user.email}</h3>
            <p className="text-sm text-gray-400">Member since {new Date().getFullYear()}</p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <SettingsIcon size={18} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Account Settings</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
            <div className="p-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield size={18} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Security & 2FA</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
            <button 
              onClick={onLogout}
              className="w-full p-4 flex items-center space-x-3 text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} />
              <span className="text-sm font-bold">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminTab, setAdminTab] = useState('stats'); // stats, users, plans, settings

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [sRes, tRes, uRes, pRes, setRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/transactions'),
        fetch('/api/admin/users'),
        fetch('/api/plans'),
        fetch('/api/settings')
      ]);
      setStats(await sRes.json());
      setTransactions(await tRes.json());
      setUsers(await uRes.json());
      setPlans(await pRes.json());
      const settingsObj = await setRes.json();
      setSettings(Object.entries(settingsObj).map(([key, value]) => ({ key, value })));
    } catch (e) {
      console.error('Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  const updateTxStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/transactions/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchAdminData();
    } catch (e) { alert('Failed to update status'); }
  };

  const updateUserBalance = async (id: string, currentBalance: number) => {
    const amount = prompt('Enter new balance:', currentBalance.toString());
    if (amount === null) return;
    try {
      const res = await fetch(`/api/admin/users/${id}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: parseFloat(amount) })
      });
      if (res.ok) fetchAdminData();
    } catch (e) { alert('Failed to update balance'); }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAdminData();
    } catch (e) { alert('Failed to delete user'); }
  };

  const updateSetting = async (key: string, currentValue: string) => {
    const value = prompt(`Update ${key}:`, currentValue);
    if (value === null) return;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      if (res.ok) fetchAdminData();
    } catch (e) { alert('Failed to update setting'); }
  };

  if (loading) return <div className="p-6 text-center">Loading admin data...</div>;

  return (
    <div className="px-6 pb-24 space-y-6">
      <div className="pt-2">
        <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
        <div className="flex space-x-4 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          {['stats', 'users', 'plans', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setAdminTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                adminTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {adminTab === 'stats' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total Users</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Pending WDs</p>
              <p className="text-xl font-bold text-amber-600">{stats.pendingWithdrawals}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total Deposits</p>
              <p className="text-xl font-bold text-emerald-600">${stats.totalDeposits.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total WDs</p>
              <p className="text-xl font-bold text-red-600">${stats.totalWithdrawals.toFixed(2)}</p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-4">Pending Requests</h4>
            <div className="space-y-3">
              {transactions.filter(t => t.status === 'pending').map(tx => (
                <div key={tx.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-sm text-gray-900 capitalize">{tx.type}</p>
                      <p className="text-xs text-gray-500">{tx.email}</p>
                    </div>
                    <p className="font-bold text-indigo-600">${tx.amount.toFixed(2)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => updateTxStatus(tx.id, 'completed')} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">Approve</button>
                    <button onClick={() => updateTxStatus(tx.id, 'failed')} className="flex-1 py-2 bg-red-600 text-white rounded-xl text-xs font-bold">Reject</button>
                  </div>
                </div>
              ))}
              {transactions.filter(t => t.status === 'pending').length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">No pending transactions</p>
              )}
            </div>
          </div>
        </>
      )}

      {adminTab === 'users' && (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="font-bold text-sm text-gray-900">{u.email}</p>
                  <p className="text-[10px] text-gray-400">Balance: ${u.balance.toFixed(2)}</p>
                </div>
                {u.is_admin ? <Shield size={16} className="text-indigo-600" /> : null}
              </div>
              <div className="flex space-x-2">
                <button onClick={() => updateUserBalance(u.id, u.balance)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-[10px] font-bold">Edit Balance</button>
                <button onClick={() => deleteUser(u.id)} className="flex-1 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {adminTab === 'plans' && (
        <div className="space-y-3">
          {plans.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
              <div>
                <p className="font-bold text-sm text-gray-900">{p.name}</p>
                <p className="text-[10px] text-gray-400">${p.min_investment} Min • {p.duration_days} Days • {p.profit_percentage}%</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${p.color}`} />
            </div>
          ))}
          <p className="text-[10px] text-gray-400 text-center italic">Plan editing coming soon in full UI</p>
        </div>
      )}

      {adminTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {settings.map(s => (
            <div key={s.key} className="p-4 border-b border-gray-50 last:border-0 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.key.replace('_', ' ')}</p>
                <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{s.value}</p>
              </div>
              <button onClick={() => updateSetting(s.key, s.value)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                <Plus size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subTab, setSubTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('vanguard_user');
    if (savedUser) {
      fetchUserData(JSON.parse(savedUser).id);
    } else {
      setLoading(false);
    }
    fetchGlobalData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Set default sub-tabs
    if (tab === 'dashboard') setSubTab('overview');
    if (tab === 'wallet') setSubTab('deposit');
    if (tab === 'referral') setSubTab('invite');
    if (tab === 'support') setSubTab('support');
  };

  const fetchGlobalData = async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        fetch('/api/plans'),
        fetch('/api/settings')
      ]);
      setPlans(await pRes.json());
      setSettings(await sRes.json());
    } catch (e) {
      console.error('Failed to fetch global data');
    }
  };

  const fetchUserData = async (id: number | string) => {
    try {
      const res = await fetch(`/api/user/${id}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem('vanguard_user', JSON.stringify(data));
      } else {
        localStorage.removeItem('vanguard_user');
        setUser(null);
      }
    } catch (e) {
      console.error('Failed to fetch user');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('vanguard_user', JSON.stringify(userData));
    fetchUserData(userData.id);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      localStorage.removeItem('vanguard_user');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 bg-indigo-600 rounded-xl"
        />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative shadow-2xl shadow-gray-200">
      <Header user={user} onLogout={handleLogout} />
      
      <main className="min-h-[calc(100vh-140px)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <DashboardScreen user={user} refreshUser={() => fetchUserData(user.id)} setActiveTab={handleTabChange} subTab={subTab} setSubTab={setSubTab} />}
            {activeTab === 'plans' && <PlansScreen user={user} refreshUser={() => fetchUserData(user.id)} plans={plans} />}
            {activeTab === 'wallet' && <WalletScreen user={user} refreshUser={() => fetchUserData(user.id)} settings={settings} subTab={subTab} setSubTab={setSubTab} />}
            {activeTab === 'referral' && <ReferralScreen user={user} subTab={subTab} setSubTab={setSubTab} />}
            {activeTab === 'support' && <SupportScreen user={user} onLogout={handleLogout} subTab={subTab} setSubTab={setSubTab} />}
            {activeTab === 'admin' && user.is_admin === 1 && <AdminDashboard />}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={handleTabChange} isAdmin={user.is_admin === 1} />

      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
