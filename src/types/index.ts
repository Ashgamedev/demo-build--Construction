export type Role = 'owner' | 'office_staff' | 'supervisor';

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  /** For supervisors: which Workforce record this login represents. Their
   *  advances, spending, and assigned-project visibility all key off this. */
  linkedWorkforceId?: string;
  createdAt: number;
}

/**
 * Created by an owner/office user before a supervisor's account exists, and
 * consumed the moment that email first signs in - see authStore.initialize.
 * This is what makes a new sign-in become a restricted supervisor instead of
 * a full owner, which is the default for any sign-in with no invite waiting.
 */
export interface SupervisorInvite {
  id: string; // lowercased email
  email: string;
  workforceId: string;
  workforceName: string;
  invitedBy: string;
  invitedAt: number;
  usedAt?: number;
}

/**
 * Cash handed to a supervisor to cover site expenses across whichever
 * projects they're running - deliberately NOT tied to one project, since one
 * supervisor can be juggling several at once. This is a real company outflow
 * the moment it's given (see supervisorStore.giveAdvance, which creates the
 * matching Expense) - the SupervisorSpend records below don't create a
 * second one; they just account for how this money was actually used.
 */
export interface SupervisorAdvance {
  id: string;
  workforceId: string;
  amount: number;
  date: number;
  notes?: string;
  /** Set once the advance's Expense record exists, linking the two. */
  expenseId?: string;
  createdAt: number;
  createdBy: string;
  createdByName?: string;
}

/**
 * How a supervisor accounts for money from an advance. Project is mandatory
 * by design - this is the whole point: money handed over without a project
 * attached must come back tagged with one before it's spent.
 */
export interface SupervisorSpend {
  id: string;
  workforceId: string;
  projectId: string;
  amount: number;
  description: string;
  date: number;
  createdAt: number;
  createdBy: string;
  createdByName?: string;
}

export type LeadStatus = 'New' | 'Contacted' | 'Follow-up' | 'Site Visit Scheduled' | 'Site Visit Completed' | 'Quotation Preparing' | 'Quotation Sent' | 'Negotiation' | 'Won' | 'Lost' | 'On Hold';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  workType: string;
  projectCategory: 'residential' | 'commercial';
  siteAddress: string;
  requirements: string;
  estimatedBudget?: number;
  assignedStaffId?: string;
  nextFollowUp?: number;
  notes: string;
  status: LeadStatus;
  websiteSubmissionId?: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface Customer {
  id: string;
  leadId?: string;
  name: string;
  phone: string;
  email?: string;
  billingAddress: string;
  createdAt: number;
  updatedAt: number;
}

export interface SiteVisit {
  id: string;
  leadId: string;
  date: number;
  staffId: string;
  notes: string;
  measurements: string;
  photos: string[];
  outcome: string;
  createdAt: number;
}

export type QuotationType = 'labour' | 'full_spec' | 'measurement';

export interface CompanySettings {
  name: string;
  address: string;
  proprietor: string;
  mobileNumbers: string;
  logoUrl?: string;
  signatureUrl?: string;
}

// Type A: Labour Quotation
export interface LabourQuotationItem {
  id: string;
  floor: string; // e.g. "Ground Floor", "First Floor"
  ratePerSqft: number;
}

export interface LabourScopeItem {
  id: string;
  description: string;
  measurement?: string;
  order: number;
}

// Type B: Full Specification Quotation
export interface FullSpecItem {
  id: string;
  name: string; // e.g. "RCC FOOTING"
  description: string;
  mixRatio?: string; // e.g. "1:1.5:3"
  brandOptions?: string;
  maxRateCap?: number; // e.g. max 60/- per sq.ft
  order: number;
}

// Type C: Measurement Bill
export interface MeasurementDimension {
  id: string;
  description: string; // e.g., "F2", "Column C1"
  length: string; // string to hold feet/inches like 6'-6"
  width: string;
  height: string;
  nos: number; // repeat count
  quantity: number; // calculated cft/sft
}

export interface MeasurementItem {
  id: string;
  description: string; // e.g. "Column Footing first step"
  dimensions: MeasurementDimension[];
  totalQuantity: number;
  unitRate: number;
  amount: number;
  order: number;
}

export interface MeasurementGroup {
  id: string;
  name: string; // e.g. "At site" or "Ground Floor"
  items: MeasurementItem[];
  order: number;
}

export interface Quotation {
  id: string; // family id
  currentVersionId: string;
  customerId: string;
  leadId?: string;
  status: 'Draft' | 'Sent' | 'Negotiation' | 'Accepted' | 'Rejected' | 'Expired';
  createdAt: number;
  updatedAt: number;
}

export interface QuotationVersion {
  id: string;
  familyId: string;
  versionNumber: number;
  quotationNumber: string;
  date: number;
  type: QuotationType;
  
  // Shared fields
  subject: string;
  clientName: string;
  contractorName?: string; // added for Type B (can be used in others if needed)
  siteName: string;
  notes: string;
  validityText: string;
  exclusions: string;
  paymentTerms: string;
  
  // Type A: Labour Quotation data
  labourItems?: LabourQuotationItem[];
  labourScope?: LabourScopeItem[];
  
  // Type B: Full Spec data
  fullSpecRate?: number; // single all-inclusive rate
  fullSpecItems?: FullSpecItem[];
  
  // Type C: Measurement Bill data
  measurementGroups?: MeasurementGroup[];
  
  // Immutable snapshot of letterhead
  companySnapshot: CompanySettings;
  
  // Translation support
  language?: 'en' | 'ta';
  tamilTranslations?: {
    subject?: string;
    notes?: string;
    validityText?: string;
    exclusions?: string;
    paymentTerms?: string;
    labourScope?: Record<string, string>; // mapping id -> translated description
    fullSpecItems?: Record<string, { name?: string; description?: string }>;
    measurementGroups?: Record<string, { name?: string; items?: Record<string, string> }>;
  };
  
  showOwnerSignature?: boolean;
  
  isLocked: boolean;
  createdAt: number;
  createdBy: string;
}

export interface Agreement {
  id: string;
  quotationId: string;
  quotationVersionId: string;
  customerId: string;
  projectId?: string; // If linked to a project
  status: 'Draft' | 'Sent' | 'Signed' | 'Cancelled';
  createdAt: number;
  updatedAt: number;
}

export interface AgreementVersion {
  id: string;
  agreementId: string;
  versionNumber: number;
  agreementNumber: string;
  date: number;
  
  // Copied from quotation
  subject: string;
  clientName: string;
  siteName: string;
  contractorName?: string;
  
  // Contract value — single source of truth
  totalValue: number; // The confirmed contract value used for this agreement
  quotationValue?: number; // Original quotation value for audit trail
  contractValueDiffersFromQuotation?: boolean;
  
  paymentSchedule: {
    id: string;
    description: string;
    percentage: number;
    amount: number;
    dueDate?: number;
    notes?: string;
    linkedStageId?: string;
  }[];
  
  termsAndConditions: string;
  scopeOfWork: string; // Compiled from the quotation items
  
  signatures: {
    clientSigned: boolean;
    contractorSigned: boolean;
    clientSignatureDate?: number;
    contractorSignatureDate?: number;
  };
  
  companySnapshot: CompanySettings;
  
  // Translation
  language?: 'en' | 'ta';
  tamilTranslations?: {
    subject?: string;
    termsAndConditions?: string;
    scopeOfWork?: string;
    paymentSchedule?: Record<string, string>; // mapping id -> translated description
  };
  
  showOwnerSignature?: boolean;

  /** Scanned image or PDF of the physical Rs. 100 non-judicial stamp paper the
   *  agreement will be printed on. Kept as an attachment for the record. */
  stampPaperUrl?: string;
  stampPaperFileName?: string;
  stampPaperUploadedAt?: number;

  /** When true, the generated PDF is laid out to be printed onto a real
   *  stamp paper: the top of page one is left blank for the pre-printed stamp
   *  header, and the Deepthi letterhead is suppressed. */
  printOnStampPaper?: boolean;

  // Override tracking (for locking with schedule mismatch)
  overrideReason?: string;
  overrideBy?: string;
  overrideAt?: number;
  
  isLocked: boolean;
  createdAt: number;
  createdBy: string;
}

export interface ProjectIdea {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category: 'Floor Plan' | 'Elevation' | 'Interior' | 'Exterior' | 'Reference' | 'Other';
  status: 'Pending' | 'Approved' | 'Rejected';
  createdBy: string;
  createdAt: number;
}

export interface WorkLog {
  id: string;
  text: string;
  date: number;
  createdBy: string;
  createdAt: number;
}

export interface SavedReport {
  id: string;
  title: string;
  type: 'Finance' | 'Progress';
  dateRange: string;
  data: any; // snapshot of the report data
  createdAt: number;
  createdBy: string;
}

export type ProjectStatus = 'Planning' | 'Not Started' | 'In Progress' | 'On Hold' | 'Delayed' | 'Completed' | 'Cancelled';

export interface ProjectTask {
  id: string;
  name: string;
  order: number;
  status: 'Pending' | 'In Progress' | 'Completed';
  progressPercentage: number;
  workLogs?: WorkLog[];
}

export interface ProjectStage {
  id: string;
  name: string;
  description?: string;
  order: number;
  startDate?: number; // Phase start date
  endDate?: number; // Phase end date
  tasks?: ProjectTask[];
  
  // Legacy fields (kept for backwards compatibility or computed state)
  status?: 'Pending' | 'In Progress' | 'Completed';
  expectedCompletion?: number;
  actualCompletion?: number;
  progressPercentage?: number;
  notes?: string;
  workLogs?: WorkLog[];
  photoUrls?: string[];
  documentIds?: string[];
  linkedContractorIds?: string[];
  linkedPaymentMilestoneId?: string;
  archivedAt?: number;
  createdBy?: string;
  updatedBy?: string;
}

export interface Project {
  id: string;
  customerId: string;
  leadId?: string;
  quotationVersionId?: string; // Accepted quotation
  title: string;
  type: 'Interior' | 'Exterior' | 'Complete Construction' | 'Residential' | 'Commercial' | 'Custom';
  siteAddress: string;
  scopeSummary: string;
  startDate?: number;
  expectedCompletion?: number;
  actualCompletion?: number;
  agreedValue: number;
  status: ProjectStatus;
  progressPercentage: number;
  stages: ProjectStage[];
  assignedWorkforceIds?: string[];
  warrantyEnabled: boolean;
  warranty?: {
    title: string;
    description: string;
    startDate: number;
    expiryDate: number;
    terms: string;
    exclusions: string;
  };
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface PublicProject {
  id: string; // The website-friendly slug or ID
  internalProjectId: string;
  title: string;
  category: 'Residential' | 'Commercial' | 'Interior' | 'Exterior' | 'Custom';
  description: string;
  featuredImage: string;
  gallery: string[];
  keyHighlights: {
    duration?: string;
    area?: string;
    location?: string;
    client?: string;
  };
  isPublished: boolean;
  publishedAt: number;
  publishedBy: string;
  updatedAt: number;
}

export type WorkforceType = 'Permanent Employee' | 'Site Staff' | 'Coolie' | 'Contractor' | 'Subcontractor';

export interface Workforce {
  id: string;
  name: string;
  phone: string;
  address?: string;
  type: WorkforceType;
  trade: string;
  isActive: boolean;
  notes?: string;
  monthlySalary?: number; // for Permanent Employees and Site Staff
  /** The person's usual day rate. A starting figure only - the actual amount
   *  earned is recorded per day on the attendance record, since site pay
   *  genuinely varies day to day. */
  dailyWage?: number;

  // Identity
  idProofType?: 'Aadhaar' | 'PAN' | 'Voter ID' | 'Driving Licence' | 'Other';
  idProofNumber?: string;
  /** Uploaded photo of the ID document. */
  idProofUrl?: string;

  // How they get paid
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  upiId?: string;

  /** When they started with the company. */
  joinedOn?: number;

  createdAt: number;
  updatedAt: number;
}

export interface Expense {
  id: string;
  projectId?: string; // If null, general business expense
  stageId?: string; // Linking to a specific project stage
  category: string;
  description: string;
  amount: number;
  date: number;
  /** What payeeId points at, so "who was this paid to" can be resolved to a real record. */
  payeeType?: 'workforce' | 'vendor' | 'other';
  payeeId?: string; // Workforce ID or Vendor ID, depending on payeeType
  payeeName: string;
  paidBy: 'Company cash' | 'Company bank' | 'Company UPI' | 'Owner personally' | 'Staff personally' | 'Contractor personally' | 'Other';
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  proofUrl?: string;
  isReimbursed?: boolean; // if paid by staff personally
  createdAt: number;
  createdBy: string;
  createdByName?: string;
  updatedAt: number;
  updatedBy: string;
  updatedByName?: string;
}

/**
 * A single payment can settle several things at once - part of a scheduled
 * milestone, part of a variation the customer just approved, and part on
 * account. Each of those is an allocation; the sum of allocations equals the
 * total received.
 *
 * Old payments were single-purpose and have no allocations array; they render
 * as one implicit "General collection" line so nothing existing breaks.
 */
export type PaymentPurpose =
  | 'milestone'      // Scheduled milestone tied to a stage
  | 'advance'        // Money taken before work starts
  | 'variation'      // Extra work agreed after the contract was signed
  | 'general'        // No specific purpose - on account
  | 'other';         // Free-text - forces a description

export interface PaymentAllocation {
  id: string;
  amount: number;
  purpose: PaymentPurpose;
  /** Only meaningful when purpose === 'milestone'. Refers to Project.stages[].id. */
  stageId?: string;
  /** Free text - always shown on the receipt so the customer knows what the
   *  money settles. */
  description?: string;
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  quotationId: string; // Linking directly to the quotation
  projectId?: string;
  stageId?: string; // Linking to a specific project stage/milestone
  amount: number;
  date: number;
  paymentMode: 'cash' | 'UPI' | 'bank transfer' | 'cheque';
  referenceNumber?: string;
  notes?: string;
  /** Detailed breakdown of what this payment settles. Sum of amounts equals
   *  the top-level amount. Absent on legacy records - callers must handle. */
  allocations?: PaymentAllocation[];
  receivedBy: string; // user ID
  receiptGenerated: boolean;
  receiptId?: string;
  createdAt: number;
  createdBy: string;
}

export interface ReceiptSnapshot {
  clientName: string;
  projectName: string;
  amountReceived: number;
  paymentMode: string;
  date: number;
  remainingBalance: number;
  /** Frozen at receipt time so a printed receipt keeps the breakdown even if
   *  the payment record is edited later (which shouldn't happen, but a snapshot
   *  is the guarantee). Each entry carries a resolved stageName rather than a
   *  raw stageId, so the printed receipt reads as words. */
  allocations?: Array<{
    amount: number;
    purpose: PaymentPurpose;
    stageName?: string;
    description?: string;
  }>;
  companySettings: CompanySettings;
}

export interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  paymentId: string;
  quotationId: string;
  snapshot: ReceiptSnapshot; // Structured snapshot as required by prompt
  isVoided: boolean;
  voidReason?: string;
  createdAt: number;
  createdBy: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  type: string;
  size: number;
  url: string;
  category: 'site photo' | 'measurement' | 'floor plan' | 'agreement' | 'bill' | 'expense proof' | 'payment proof' | 'progress photo' | 'completion document' | 'other';
  uploadedBy: string;
  createdAt: number;
}

export type CompensationModel = 'fixed' | 'daily' | 'sqft';

export interface ContractorAssignment {
  id: string;
  projectId: string;
  workforceId: string;
  assignedScope: string;
  agreedValue: number;
  compensationModel: CompensationModel;
  paymentMethod?: 'milestone' | 'full_job';
  status: 'active' | 'completed' | 'terminated';
  totalPaid: number;
  progressPercentage: number;
  createdAt: number;
  updatedAt: number;
}

export interface ContractorActivity {
  id: string;
  assignmentId: string;
  projectId: string;
  stageId?: string; // Linking to a specific project stage
  workforceId: string;
  date: number;
  description: string;
  progressAdded: number; // Increment to the percentage
  createdAt: number;
  createdBy: string;
}

export interface ContractorPayment {
  id: string;
  assignmentId: string;
  projectId: string;
  stageId?: string; // Linking to a specific project stage
  workforceId: string;
  amount: number;
  date: number;
  paymentMode: 'cash' | 'UPI' | 'bank transfer' | 'cheque';
  referenceNumber?: string;
  notes?: string;
  createdAt: number;
  createdBy: string;
}

export interface AttendanceRecord {
  id: string;
  projectId?: string; // Optional for centralized tracking
  date: number;
  workforceId: string;
  status: 'Present' | 'Half-day' | 'Absent';
  /** What this person actually earned on this specific day. Pre-filled from
   *  their usual rate but editable, because site pay genuinely varies. */
  wagesEarned?: number;
  /** Extra paid on top of the day's wage. Kept separate from wagesEarned so
   *  overtime stays visible rather than being buried in one merged figure. */
  overtimeAmount?: number;
  /** @deprecated Advances are WagePayment records with isAdvance set, so they
   *  reduce what the worker is owed. Kept only to read older records. */
  advanceGiven?: number;
  notes?: string;
  createdAt: number;
  createdBy: string;
}

/**
 * A payment made against what a worker has earned. Deliberately NOT tied to
 * specific days: the client pays whatever amount they choose, whenever they
 * choose, and the shortfall carries forward as a running balance. Trying to
 * mark individual days "settled" cannot express a partial payment.
 */
export interface WagePayment {
  id: string;
  workforceId: string;
  workforceName: string;
  amount: number;
  date: number;
  /** Optional - a payment may cover work across several sites. */
  projectId?: string;
  paymentMethod: string;
  notes?: string;
  /**
   * True when this was cash handed over mid-week rather than a settle-up.
   * An advance is still money against wages already being earned, so it
   * reduces the balance exactly like any other payment - the flag only
   * changes how it's labelled, so the client can see why the amount owed at
   * week end is lower than the days worked suggest.
   */
  isAdvance?: boolean;
  /** The Expense record created alongside this, so the money appears once in finance. */
  expenseId?: string;
  createdAt: number;
  createdBy: string;
  createdByName?: string;
}

/**
 * A shop or supplier the company buys from.
 *
 * Purchases previously stored the shop name as free text, so the same shop
 * could be spelled three ways and "what do we owe SRK Cements?" was
 * unanswerable. Bills now reference a vendor record instead.
 */
export interface Vendor {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  /** What they mainly supply, e.g. "Cement & steel", "Sanitary ware". */
  category?: string;
  gstNumber?: string;
  /** Default number of days before a bill from this shop falls due. */
  defaultCreditDays?: number;
  notes?: string;
  isActive: boolean;
  createdAt: number;
  createdBy: string;
  createdByName?: string;
  updatedAt: number;
  updatedBy?: string;
  updatedByName?: string;
}

/** A single line on a purchase, so bills record what was actually bought. */
export interface PurchaseLineItem {
  id: string;
  description: string;
  quantity: number;
  unit?: string; // bags, tonnes, sq.ft, nos
  rate: number;
  amount: number;
}

export interface VendorBill {
  id: string;
  /** Link to the vendor master. Older records may only have vendorName. */
  vendorId?: string;
  vendorName: string;
  description: string;
  lineItems?: PurchaseLineItem[];
  amount: number;
  date: number;
  dueDate?: number;
  status: 'Unpaid' | 'Partial' | 'Paid';
  paidAmount: number;
  payments: {
    id: string;
    amount: number;
    date: number;
    paymentMode: string;
    referenceNumber?: string;
    recordedBy?: string;
    recordedByName?: string;
  }[];
  projectId?: string;
  /** Who physically made the purchase, for site accountability. */
  purchasedById?: string;
  purchasedByName?: string;
  createdAt: number;
  createdBy: string;
  createdByName?: string;
  updatedAt: number;
  updatedBy?: string;
  updatedByName?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'Payment Due' | 'Work Pending' | 'Milestone Completed' | 'System';
  isRead: boolean;
  relatedEntityId?: string;
  dueDate?: number;
  createdAt: number;
}
