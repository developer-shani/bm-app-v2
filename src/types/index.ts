// ============================================
// BROTHER MOBILES - TypeScript Type Definitions
// ============================================

export type UserRole = "admin" | "investor" | "reseller";

export interface AppUser {
  password?: string;
  uid: string;
  email: string;
  fullName: string;
  cnic?: string;
  phone?: string;
  role: UserRole;
  sharingRatio: number; // e.g. 50 means 50% for investor, 50% for admin
  status: "active" | "inactive";
  guideSeen: boolean;
  createdAt: string;
  lastLogin: string;
  profileImage?: string;
}

// ============================================
// INVESTOR
// ============================================
export interface Investor {
  password?: string;
  id: string;
  userId: string;
  fullName: string;
  cnic?: string;
  agreementImage?: string;
  profileImage?: string;
  phone: string;
  email: string;
  totalInvestment: number;
  availableBalance: number;
  totalProfit: number;
  totalWithdrawn: number;
  activeInstallments: number; // how many mobiles are on installment from this investor
  sharingRatio: number;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Investment {
  id: string;
  investorId: string;
  investorName: string;
  amount: number;
  type: "initial" | "additional";
  imageProof?: string;
  date: string;
  note?: string;
}

export interface WithdrawalRequest {
  id: string;
  investorId: string;
  investorName: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  requestedAt?: string;
  createdAt?: string;
  processedAt?: string;
  approvedAt?: string;
  adminNote?: string;
  proofImage?: string;
  transactionRef?: string;
  bankDetails?: string;
  rejectReason?: string;
}

// ============================================
// CUSTOMER / SALE
// ============================================
export interface Customer {
  id: string;
  idNumber: string; // auto-generated unique like #3812
  name: string;
  phone1: string;
  phone2?: string;
  image?: string;
  mobileCompany: string;
  mobileModel: string;
  imei1?: string;
  imei2?: string;
  purchasePrice: number;
  markupPercent: number;
  sellingPrice: number;
  profitAmount: number;
  advancePayment: number;
  investmentUsed: number; // sellingPrice - advancePayment
  installmentMonths: number; // 1-9
  monthlyInstallment: number;
  investorId: string;
  investorName: string;
  resellerId?: string;
  resellerName?: string;
  referralCommissionPercent: number; // default 2%
  referralCommissionAmount: number;
  totalPaid: number; // advance + all recoveries
  remainingAmount: number;
  paidInstallments: number;
  nextDueDate: string;
  expenses: Expense[];
  status: "active" | "completed" | "defaulted";
  lossReason?: string;
  lossDate?: string;
  lossAmount?: number;
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  investorShare: number;
  adminShare: number;
}

// ============================================
// RECOVERY / PAYMENT
// ============================================
export interface Recovery {
  id: string;
  customerId: string;
  customerName: string;
  customerIdNumber: string;
  amount: number;
  installmentNumber: number;
  investorId: string;
  investorName: string;
  imageProof?: string;
  date: string;
  collectedBy: string;
}

// ============================================
// RESELLER / REFERRER
// ============================================
export interface Reseller {
  password?: string;
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  totalCommission: number;
  pendingCommission: number;
  totalReferrals: number;
  status: "active" | "inactive";
  createdAt: string;
}

// ============================================
// MOBILE COMPANY
// ============================================
export interface MobileCompany {
  id: string;
  name: string;
  salesCount: number;
  addedBy: string; // "default" or admin userId
}

// ============================================
// NOTIFICATION
// ============================================
export interface Notification {
  id: string;
  userId: string;
  type: "investment" | "sale" | "recovery" | "withdrawal" | "alert" | "system" | "loss" | "referral";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

// ============================================
// LOSS
// ============================================
export interface Loss {
  id: string;
  customerId: string;
  customerName: string;
  customerIdNumber: string;
  amount: number;
  reason: string;
  investorId: string;
  investorName: string;
  investorShare: number;
  adminShare: number;
  date: string;
}

// ============================================
// APP SETTINGS
// ============================================
export interface AppSettings {
  companyName: string;
  watermarkImage?: string;
  defaultExpense: number; // 2000
  defaultCommission: number; // 2%
  smsTemplate: string;
  maxInstallmentMonths: number; // 9
}

// ============================================
// DASHBOARD STATS
// ============================================
export interface DashboardStats {
  totalCustomers: number;
  activeInstallments: number;
  totalInvestors: number;
  totalResellers: number;
  totalRevenue: number;
  totalProfit: number;
  totalRecoveries: number;
  overdueCount: number;
  dueSoonCount: number;
  monthlyCollections: number;
}

// ============================================
// PROFILE CHANGE REQUEST (Pending Approval)
// ============================================
export interface ProfileChangeRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  changes: Record<string, { old: string; new: string }>;
  newProfileImage?: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  processedAt?: string;
  processedBy?: string;
}

// ============================================
// DELETED RECORD (Soft Delete / Trash)
// ============================================
export interface DeletedRecord {
  id: string;
  originalId: string;
  type: "customers" | "investors" | "resellers" | "users";
  data: Record<string, any>;
  deletedAt: string;
  deletedBy: string;
}
