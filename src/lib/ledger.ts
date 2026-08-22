import {
  Expense,
  ContractorPayment,
  ContractorAssignment,
  ContractorActivity,
  AttendanceRecord,
  VendorBill,
  Project,
  Workforce,
  WagePayment,
} from '../types';

/**
 * Rollup calculations across the existing money collections (expenses, vendor
 * bills, contractor payments, attendance).
 *
 * This is deliberately a computed layer, not a new physical ledger table. The
 * four underlying collections were each rebuilt and verified this session;
 * merging them into one new collection now would risk breaking working flows
 * for a benefit nobody would see on screen. These functions give the single
 * source of truth for "how much is pending" and "how much have we paid X"
 * everywhere those questions come up, without moving any data.
 */

// ---- Money we still owe out (payable side) ----------------------------

export function vendorBillsPending(bills: VendorBill[]): number {
  return bills.reduce((sum, b) => sum + Math.max(0, (b.amount || 0) - (b.paidAmount || 0)), 0);
}

export function contractorAssignmentsPending(assignments: ContractorAssignment[]): number {
  return assignments
    .filter((a) => a.status !== 'terminated')
    .reduce((sum, a) => sum + Math.max(0, (a.agreedValue || 0) - (a.totalPaid || 0)), 0);
}

/**
 * Total the business still needs to pay out: shops, contractors, and wages
 * owed to its own day-paid workers.
 *
 * Wages must be included - leaving them out made the dashboard's "Pending to
 * Pay" figure disagree with its own breakdown page, and understated what the
 * business actually owes.
 */
export function companyWidePayablePending(
  bills: VendorBill[],
  assignments: ContractorAssignment[],
  wageBalances: WageBalance[] = []
): number {
  return (
    vendorBillsPending(bills) +
    contractorAssignmentsPending(assignments) +
    totalWagesOwed(wageBalances)
  );
}

// ---- Bill due-date reminders --------------------------------------------

export type BillReminderThreshold = 'due_3d' | 'due_1d' | 'due_today' | 'overdue';

export interface BillReminderCandidate {
  bill: VendorBill;
  threshold: BillReminderThreshold;
  /** Unique per bill+threshold, used to avoid ever creating the same reminder twice. */
  key: string;
  title: string;
  message: string;
}

const DAY = 86400000;

/**
 * Which reminders should exist right now for a set of unpaid bills, checked
 * against the current time.
 *
 * This only fires while someone has the CRM open - there is no server
 * running in the background, so a bill due at 2am will not page anyone at
 * 1am. What this DOES guarantee: the moment anyone opens the CRM on or
 * after a threshold, the reminder appears and stays until the bill is paid.
 * A reminder that must reach a phone even with the CRM closed needs a
 * scheduled server job plus a messaging channel (WhatsApp/SMS) - real
 * infrastructure with its own setup and running cost, not built here.
 */
export function billReminderCandidates(bills: VendorBill[], now: number = Date.now()): BillReminderCandidate[] {
  const candidates: BillReminderCandidate[] = [];

  for (const bill of bills) {
    if (bill.status === 'Paid' || !bill.dueDate) continue;
    const balance = bill.amount - bill.paidAmount;
    if (balance <= 0) continue;

    const msUntilDue = bill.dueDate - now;
    const dueDateStr = new Date(bill.dueDate).toLocaleDateString('en-IN');
    const amountStr = `₹${balance.toLocaleString('en-IN')}`;

    if (msUntilDue < 0) {
      candidates.push({
        bill,
        threshold: 'overdue',
        key: `${bill.id}::overdue`,
        title: `Payment Overdue: ${bill.vendorName}`,
        message: `${amountStr} was due ${dueDateStr} and is still unpaid.`,
      });
    } else if (msUntilDue < DAY) {
      candidates.push({
        bill,
        threshold: 'due_today',
        key: `${bill.id}::due_today`,
        title: `Payment Due Today: ${bill.vendorName}`,
        message: `${amountStr} is due today (${dueDateStr}).`,
      });
    } else if (msUntilDue < 2 * DAY) {
      candidates.push({
        bill,
        threshold: 'due_1d',
        key: `${bill.id}::due_1d`,
        title: `Payment Due Tomorrow: ${bill.vendorName}`,
        message: `${amountStr} is due tomorrow (${dueDateStr}).`,
      });
    } else if (msUntilDue < 4 * DAY) {
      candidates.push({
        bill,
        threshold: 'due_3d',
        key: `${bill.id}::due_3d`,
        title: `Payment Due in 3 Days: ${bill.vendorName}`,
        message: `${amountStr} is due ${dueDateStr}.`,
      });
    }
  }

  return candidates;
}

// ---- Wages owed to day-paid workers -----------------------------------

/** What one day of attendance is worth, wage plus any overtime. */
export function dayEarnings(record: AttendanceRecord): number {
  return (record.wagesEarned || 0) + (record.overtimeAmount || 0);
}

export interface WageBalance {
  workforceId: string;
  name: string;
  type: string;
  trade: string;
  totalEarned: number;
  /** Everything paid, advances included - this is what reduces the balance. */
  totalPaid: number;
  /** The advance portion of totalPaid, shown separately so the client can see
   *  why the amount owed is lower than the days worked would suggest. */
  totalAdvances: number;
  /** Positive means the company still owes this person. */
  owed: number;
  daysWorked: number;
  /** True when days were worked but no amount is recorded against them, so
   *  "owed nothing" would be a lie rather than a fact. */
  hasUnratedDays: boolean;
  lastWorked?: number;
  projectIds: string[];
  /** Every payment made to this person in the window, newest first. */
  payments: WagePayment[];
}

/**
 * The running balance for every day-paid worker: everything they have earned,
 * minus everything actually paid to them, regardless of which week either
 * happened in. This is the number to show when someone asks to be paid.
 */
export function buildWageBalances(params: {
  workforce: Workforce[];
  attendance: AttendanceRecord[];
  wagePayments: WagePayment[];
  /** Optional window. Omit for the true all-time balance. */
  from?: number;
  to?: number;
}): WageBalance[] {
  const { workforce, attendance, wagePayments, from, to } = params;

  const inWindow = (ts: number) =>
    (from === undefined || ts >= from) && (to === undefined || ts <= to);

  const dayPaid = workforce.filter(
    (w) => w.type === 'Coolie' || w.type === 'Site Staff' || w.type === 'Permanent Employee'
  );

  return dayPaid
    .map((person) => {
      const days = attendance.filter(
        (a) => a.workforceId === person.id && a.status !== 'Absent' && inWindow(a.date)
      );
      const payments = wagePayments
        .filter((p) => p.workforceId === person.id && inWindow(p.date))
        .sort((a, b) => b.date - a.date);

      const totalEarned = days.reduce((sum, d) => sum + dayEarnings(d), 0);
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const totalAdvances = payments.filter((p) => p.isAdvance).reduce((sum, p) => sum + p.amount, 0);

      return {
        workforceId: person.id,
        name: person.name,
        type: person.type,
        trade: person.trade,
        totalEarned,
        totalPaid,
        totalAdvances,
        owed: totalEarned - totalPaid,
        daysWorked: days.reduce((n, d) => n + (d.status === 'Present' ? 1 : 0.5), 0),
        hasUnratedDays: days.some((d) => dayEarnings(d) === 0),
        lastWorked: days.length ? Math.max(...days.map((d) => d.date)) : undefined,
        projectIds: [...new Set(days.map((d) => d.projectId).filter(Boolean))] as string[],
        payments,
      };
    })
    .filter((b) => b.daysWorked > 0 || b.totalPaid > 0)
    .sort((a, b) => b.owed - a.owed);
}

/** Total still owed to all day-paid workers company-wide. */
export function totalWagesOwed(balances: WageBalance[]): number {
  return balances.reduce((sum, b) => sum + Math.max(0, b.owed), 0);
}

// ---- Per-person payment history (staff detail page) -------------------

export interface LedgerEntry {
  id: string;
  date: number;
  amount: number;
  kind: 'Expense' | 'Contractor Payment' | 'Advance';
  description: string;
  projectId?: string;
  projectTitle: string;
}

export interface AttendanceDaySummary {
  date: number;
  status: AttendanceRecord['status'];
  wagesEarned: number;
  projectId?: string;
  projectTitle: string;
}

export interface WorkforceLedger {
  /** Real money movements only: expenses and contractor payments. */
  entries: LedgerEntry[];
  totalPaid: number;
  totalAdvances: number;
  /** Attendance is a work record, not a payment record, shown separately.
   *  Nothing links an attendance day to the expense that eventually settles
   *  it, so summing wagesEarned into totalPaid would double-count money
   *  already captured the day it's actually paid out via an expense. */
  attendanceDays: AttendanceDaySummary[];
  totalWagesAccrued: number;
  projectIds: string[];
}

/**
 * Every real payment ever made to one workforce member, across every
 * project, pulled together from expenses and contractor payments - plus
 * their attendance record, shown separately (see note above).
 */
export function buildWorkforceLedger(params: {
  workforceId: string;
  expenses: Expense[];
  contractorPayments: ContractorPayment[];
  attendance: AttendanceRecord[];
  projects: Project[];
}): WorkforceLedger {
  const { workforceId, expenses, contractorPayments, attendance, projects } = params;
  const projectTitle = (id?: string) =>
    (id && projects.find((p) => p.id === id)?.title) || 'General / Not project-specific';

  const entries: LedgerEntry[] = [];

  for (const e of expenses) {
    // payeeType is a recent addition - older expenses only have payeeId set.
    // Matching on payeeId alone is safe: vendor and workforce ids are never
    // shared, so there's no risk of pulling in a shop's payment by mistake.
    if (e.payeeId !== workforceId) continue;
    entries.push({
      id: e.id,
      date: e.date,
      amount: e.amount,
      kind: e.category === 'Labour Advance' ? 'Advance' : 'Expense',
      description: e.description,
      projectId: e.projectId,
      projectTitle: projectTitle(e.projectId),
    });
  }

  for (const p of contractorPayments) {
    if (p.workforceId !== workforceId) continue;
    entries.push({
      id: p.id,
      date: p.date,
      amount: p.amount,
      kind: 'Contractor Payment',
      description: p.notes || `Payment via ${p.paymentMode}`,
      projectId: p.projectId,
      projectTitle: projectTitle(p.projectId),
    });
  }

  entries.sort((a, b) => b.date - a.date);

  const totalAdvances = entries.filter((e) => e.kind === 'Advance').reduce((s, e) => s + e.amount, 0);
  const totalPaid = entries.reduce((sum, e) => sum + e.amount, 0);

  const attendanceDays: AttendanceDaySummary[] = attendance
    .filter((a) => a.workforceId === workforceId)
    .map((a) => ({
      date: a.date,
      status: a.status,
      wagesEarned: a.wagesEarned || 0,
      projectId: a.projectId,
      projectTitle: projectTitle(a.projectId),
    }))
    .sort((a, b) => b.date - a.date);

  const totalWagesAccrued = attendanceDays.reduce((s, d) => s + d.wagesEarned, 0);

  const projectIds = [
    ...new Set([
      ...entries.map((e) => e.projectId),
      ...attendanceDays.map((d) => d.projectId),
    ].filter(Boolean)),
  ] as string[];

  return { entries, totalPaid, totalAdvances, attendanceDays, totalWagesAccrued, projectIds };
}

/** How much has actually been paid to a workforce member on one specific project. */
export function amountPaidOnProject(ledger: WorkforceLedger, projectId: string): number {
  return ledger.entries.filter((e) => e.projectId === projectId).reduce((s, e) => s + e.amount, 0);
}

export interface WorkforceActivitySummary {
  activities: ContractorActivity[];
  assignments: ContractorAssignment[];
}
