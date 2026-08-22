/**
 * Demo dataset — a plausible Nagercoil construction firm.
 *
 * Everything here is invented. No real customer, site, worker, vendor or rupee
 * figure from any client appears in this file.
 *
 * Dates are relative to today, so the dashboard always shows live sites, this
 * week's attendance, and material bills that are actually due.
 */

import { store } from './store';
import { OWNER_UID } from './auth';
import { seedProjectSchedule, ScheduleSeedProject } from './scheduleSeed';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const days = (n: number) => now + n * DAY;

const BY = { createdAt: now, updatedAt: now, createdBy: OWNER_UID, updatedBy: OWNER_UID };

// --- people -------------------------------------------------------------

const customers = [
  { id: 'cust_ramesh', name: 'Ramesh & Latha', phone: '94421 66710', billingAddress: 'Vadasery, Nagercoil', email: 'ramesh@demo.local' },
  { id: 'cust_jose', name: 'Dr. Jose Mathew', phone: '98940 21188', billingAddress: 'Parvathipuram, Nagercoil' },
  { id: 'cust_sunrise', name: 'Sunrise Enterprises', phone: '04652 244 190', billingAddress: 'Kottar, Nagercoil', email: 'accounts@sunrise.demo' },
  { id: 'cust_beena', name: 'Beena Thomas', phone: '99447 30256', billingAddress: 'Thuckalay' },
];

const workforce = [
  { id: 'wf_murugan', name: 'Murugan P', phone: '94430 11278', type: 'Site Staff', trade: 'Site Supervisor', monthlySalary: 28000 },
  { id: 'wf_saravanan', name: 'Saravanan K', phone: '98421 55093', type: 'Permanent Employee', trade: 'Mason', monthlySalary: 24000 },
  { id: 'wf_bala', name: 'Bala Subramani', phone: '90031 74412', type: 'Coolie', trade: 'Helper', dailyWage: 750 },
  { id: 'wf_arumugam', name: 'Arumugam S', phone: '97865 20117', type: 'Coolie', trade: 'Helper', dailyWage: 750 },
  { id: 'wf_kumar', name: 'Kumar M', phone: '94879 61130', type: 'Contractor', trade: 'Electrical', dailyWage: 1400 },
  { id: 'wf_selvi', name: 'Selvi R', phone: '90475 88221', type: 'Coolie', trade: 'Helper', dailyWage: 700 },
];

const vendors = [
  { id: 'ven_amman', name: 'Amman Cement Depot', phone: '04652 231 447', category: 'Cement & steel', address: 'Vadasery, Nagercoil', defaultCreditDays: 15 },
  { id: 'ven_sri', name: 'Sri Balaji Hardware', phone: '94421 90032', category: 'Hardware & fittings', address: 'Kottar, Nagercoil', defaultCreditDays: 7 },
  { id: 'ven_kanya', name: 'Kanya Blue Metals', phone: '98430 71120', category: 'M-sand & jelly', address: 'Boothapandi', defaultCreditDays: 30 },
  { id: 'ven_deepa', name: 'Deepa Electricals', phone: '99446 20871', category: 'Electrical', address: 'Nagercoil Junction' },
];

// --- projects -----------------------------------------------------------

const STAGE_NAMES = ['Foundation', 'Structure', 'Brickwork & Plastering', 'Electrical & Plumbing', 'Finishing'];

const projects = [
  {
    id: 'proj_site1', customerId: 'cust_ramesh', title: 'Ramesh Residence — 3BHK',
    type: 'Residential', siteAddress: 'Plot 14, Vadasery Extension, Nagercoil',
    scope: 'Ground + 1 floor residential building, 1,850 sq ft',
    agreedValue: 3850000, status: 'In Progress', progress: 62, stageIndex: 2,
    start: days(-96), due: days(74),
  },
  {
    id: 'proj_site2', customerId: 'cust_jose', title: 'Dr. Jose — Clinic Building',
    type: 'Commercial', siteAddress: 'Parvathipuram Main Road, Nagercoil',
    scope: 'Two-storey clinic with parking, 2,400 sq ft',
    agreedValue: 6200000, status: 'In Progress', progress: 38, stageIndex: 1,
    start: days(-58), due: days(122),
  },
  {
    id: 'proj_site3', customerId: 'cust_sunrise', title: 'Sunrise Godown',
    type: 'Commercial', siteAddress: 'Industrial Road, Kottar',
    scope: 'Storage godown with office block, 4,000 sq ft',
    agreedValue: 2950000, status: 'In Progress', progress: 81, stageIndex: 3,
    start: days(-140), due: days(26),
  },
  {
    id: 'proj_site4', customerId: 'cust_beena', title: 'Beena House — Renovation',
    type: 'Interior', siteAddress: 'Thuckalay',
    scope: 'Kitchen, two bathrooms and flooring renovation',
    agreedValue: 890000, status: 'Delayed', progress: 45, stageIndex: 2,
    start: days(-72), due: days(-8),
  },
];

// --- material purchases -------------------------------------------------

const expenses = [
  { proj: 'proj_site3', cat: 'Material', desc: 'OPC 53 grade cement — 120 bags', amt: 50400, payee: 'ven_amman', d: -2 },
  { proj: 'proj_site3', cat: 'Material', desc: 'M-sand — 2 units', amt: 17600, payee: 'ven_kanya', d: -3 },
  { proj: 'proj_site1', cat: 'Material', desc: 'TMT steel 12mm — 1.4 tonne', amt: 96600, payee: 'ven_amman', d: -4 },
  { proj: 'proj_site1', cat: 'Material', desc: 'Cement — 80 bags', amt: 33600, payee: 'ven_amman', d: -6 },
  { proj: 'proj_site2', cat: 'Material', desc: 'Jelly 20mm — 3 units', amt: 21000, payee: 'ven_kanya', d: -5 },
  { proj: 'proj_site2', cat: 'Material', desc: 'Centering plates hire — 15 days', amt: 12500, payee: 'ven_sri', d: -9 },
  { proj: 'proj_site3', cat: 'Material', desc: 'Electrical conduit and wiring', amt: 38400, payee: 'ven_deepa', d: -7 },
  { proj: 'proj_site4', cat: 'Material', desc: 'Vitrified tiles — 620 sq ft', amt: 58900, payee: 'ven_sri', d: -11 },
  { proj: 'proj_site1', cat: 'Labour', desc: 'Weekly coolie wages settlement', amt: 18750, payee: null, d: -3 },
  { proj: 'proj_site3', cat: 'Labour', desc: 'Weekly coolie wages settlement', amt: 15000, payee: null, d: -3 },
  { proj: 'proj_site2', cat: 'Transport', desc: 'Lorry hire — material shifting', amt: 4200, payee: null, d: -8 },
  { proj: null, cat: 'Office', desc: 'Site office stationery and printing', amt: 2350, payee: null, d: -12 },
];

// --- vendor bills (payables) --------------------------------------------

const vendorBills = [
  { vendor: 'ven_amman', proj: 'proj_site1', desc: 'Cement and TMT steel — August running account', amt: 184600, d: -18, paidFraction: 0.5 },
  { vendor: 'ven_kanya', proj: 'proj_site2', desc: 'M-sand and jelly — three loads', amt: 62400, d: -26, paidFraction: 0 },
  { vendor: 'ven_sri', proj: 'proj_site4', desc: 'Vitrified tiles and fittings', amt: 74300, d: -11, paidFraction: 0 },
  { vendor: 'ven_deepa', proj: 'proj_site3', desc: 'Wiring, conduit and DB boards', amt: 96800, d: -7, paidFraction: 0.35 },
  { vendor: 'ven_amman', proj: 'proj_site3', desc: 'Cement — 200 bags, godown slab', amt: 84000, d: -34, paidFraction: 1 },
];

// --- customer payments --------------------------------------------------

const payments = [
  { proj: 'proj_site1', cust: 'cust_ramesh', amt: 1200000, d: -90, mode: 'bank transfer' },
  { proj: 'proj_site1', cust: 'cust_ramesh', amt: 900000, d: -42, mode: 'bank transfer' },
  { proj: 'proj_site2', cust: 'cust_jose', amt: 1800000, d: -55, mode: 'cheque' },
  { proj: 'proj_site2', cust: 'cust_jose', amt: 600000, d: -14, mode: 'UPI' },
  { proj: 'proj_site3', cust: 'cust_sunrise', amt: 1500000, d: -130, mode: 'bank transfer' },
  { proj: 'proj_site3', cust: 'cust_sunrise', amt: 800000, d: -35, mode: 'bank transfer' },
  { proj: 'proj_site4', cust: 'cust_beena', amt: 400000, d: -68, mode: 'cash' },
];

// --- leads --------------------------------------------------------------

const leads = [
  { id: 'lead_1', name: 'Anand Krishnan', phone: '94425 71903', source: 'Referral', workType: 'New house construction', cat: 'residential', addr: 'Ozhuginasery, Nagercoil', req: '2BHK ground floor, around 1,200 sq ft', budget: 2200000, status: 'Quotation Sent', follow: 2 },
  { id: 'lead_2', name: 'Fathima Beevi', phone: '98942 30017', source: 'Walk-in', workType: 'Compound wall & gate', cat: 'residential', addr: 'Ramanputhur', req: '180 running feet compound wall', budget: 480000, status: 'Site Visit Completed', follow: 1 },
  { id: 'lead_3', name: 'Velmurugan Traders', phone: '04652 277 316', source: 'Website', workType: 'Shop interior', cat: 'commercial', addr: 'Vadasery Main Road', req: 'Retail shop fit-out, 900 sq ft', budget: 1150000, status: 'Follow-up', follow: 4 },
  { id: 'lead_4', name: 'Suresh Babu', phone: '90032 84471', source: 'Referral', workType: 'First floor addition', cat: 'residential', addr: 'Krishnancoil', req: 'Adding first floor over existing house', budget: 1750000, status: 'New', follow: 0 },
];

// --- seeding ------------------------------------------------------------

export function seedDemoData(): void {
  store.reset();

  store.set('users', OWNER_UID, {
    id: OWNER_UID, email: 'office@deepthi.demo', name: 'Office', role: 'owner', createdAt: days(-400),
  });

  customers.forEach((c, i) =>
    store.set('customers', c.id, { ...c, createdAt: days(-150 + i * 20), updatedAt: now })
  );

  vendors.forEach((v) =>
    store.set('vendors', v.id, { ...v, isActive: true, createdAt: days(-200), createdBy: OWNER_UID, createdByName: 'Office' })
  );

  workforce.forEach((w) =>
    store.set('workforce', w.id, { ...w, isActive: true, address: 'Nagercoil', createdAt: days(-300), updatedAt: now })
  );

  // Projects, each with a five-stage plan and tasks on the live stage.
  projects.forEach((p) => {
    const stages = STAGE_NAMES.map((name, i) => {
      const status = i < p.stageIndex ? 'Completed' : i === p.stageIndex ? 'In Progress' : 'Pending';
      const span = Math.round((p.due - p.start) / STAGE_NAMES.length);
      return {
        id: `${p.id}_stage_${i + 1}`,
        name,
        order: i + 1,
        startDate: p.start + span * i,
        endDate: p.start + span * (i + 1),
        status,
        progressPercentage: status === 'Completed' ? 100 : status === 'In Progress' ? 55 : 0,
        tasks:
          i === p.stageIndex
            ? [
                { id: `${p.id}_t1`, name: `${name} — main run`, order: 1, status: 'In Progress', progressPercentage: 60 },
                { id: `${p.id}_t2`, name: `${name} — material check`, order: 2, status: 'Completed', progressPercentage: 100 },
                { id: `${p.id}_t3`, name: `${name} — final inspection`, order: 3, status: 'Pending', progressPercentage: 0 },
              ]
            : [],
        notes: '',
      };
    });

    store.set('projects', p.id, {
      id: p.id, customerId: p.customerId, title: p.title, type: p.type,
      siteAddress: p.siteAddress, scopeSummary: p.scope,
      startDate: p.start, expectedCompletion: p.due,
      agreedValue: p.agreedValue, status: p.status, progressPercentage: p.progress,
      stages, assignedWorkforceIds: workforce.slice(0, 4).map((w) => w.id),
      warrantyEnabled: false, ...BY,
    });

    // The Stages screen reads the projects/{id}/stages SUBCOLLECTION, not the
    // array on the project document above. Seeding only the array left that
    // tab showing "No stages added yet" through an entire pitch, so write
    // both. The array stays because list views and the published website read
    // it straight off the project.
    stages.forEach((st) => store.set(`projects/${p.id}/stages`, st.id, st));
  });

  // Schedule activities: durations and dependencies, from which the Schedule
  // tab calculates every date. See src/demo/scheduleSeed.ts.
  const scheduleSeeds: ScheduleSeedProject[] = [
    { id: 'proj_site1', start: days(-96), due: days(74), template: 'build' },
    { id: 'proj_site2', start: days(-58), due: days(122), template: 'build' },
    { id: 'proj_site3', start: days(-140), due: days(26), template: 'build', singleStorey: true },
    // The delayed site. This is the demo's sharpest moment: one late activity
    // on the critical path, and the handover date moves on its own.
    {
      id: 'proj_site4', start: days(-72), due: days(-8), template: 'renovation',
      delay: { key: 'replaster', workingDaysLate: 14, reason: 'Waterproofing failed inspection — bathroom slab re-done' },
    },
  ];
  scheduleSeeds.forEach((s) => {
    const progress = seedProjectSchedule(s);
    // Keep the project's headline percentage in step with its own schedule.
    store.update('projects', s.id, { progressPercentage: progress });
  });

  // Material and labour spending, attributed to the right site and vendor.
  expenses.forEach((e, i) => {
    const id = `exp_${i + 1}`;
    const vendor = e.payee ? vendors.find((v) => v.id === e.payee) : undefined;
    store.set('expenses', id, {
      id,
      projectId: e.proj ?? undefined,
      category: e.cat,
      description: e.desc,
      amount: e.amt,
      date: days(e.d),
      payeeType: vendor ? 'vendor' : 'other',
      payeeId: vendor?.id,
      payeeName: vendor?.name ?? (e.cat === 'Labour' ? 'Site workers' : 'Miscellaneous'),
      paidBy: e.amt > 40000 ? 'Company bank' : 'Company cash',
      paymentMethod: e.amt > 40000 ? 'Bank transfer' : 'Cash',
      createdByName: 'Office', updatedByName: 'Office',
      ...BY,
      createdAt: days(e.d), updatedAt: days(e.d),
    });
  });

  payments.forEach((p, i) => {
    const id = `pay_${i + 1}`;
    store.set('payments', id, {
      id, customerId: p.cust, quotationId: '', projectId: p.proj,
      amount: p.amt, date: days(p.d), paymentMode: p.mode,
      receivedBy: OWNER_UID, receiptGenerated: true,
      createdAt: days(p.d), createdBy: OWNER_UID,
    });
  });

  leads.forEach((l) =>
    store.set('leads', l.id, {
      id: l.id, name: l.name, phone: l.phone, source: l.source,
      workType: l.workType, projectCategory: l.cat, siteAddress: l.addr,
      requirements: l.req, estimatedBudget: l.budget, status: l.status,
      nextFollowUp: days(l.follow), notes: '', ...BY,
    })
  );

  // Vendor bills — the payables side. Deliberately a mix of unpaid, partly
  // paid and settled, with one already past its due date, because chasing
  // material credit is the thing a builder actually recognises.
  vendorBills.forEach((b, i) => {
    const id = `bill_${i + 1}`;
    const vendor = vendors.find((v) => v.id === b.vendor)!;
    const paid = Math.round(b.amt * b.paidFraction);
    store.set('vendor_bills', id, {
      id,
      vendorId: vendor.id,
      vendorName: vendor.name,
      description: b.desc,
      amount: b.amt,
      date: days(b.d),
      dueDate: days(b.d + (vendor.defaultCreditDays ?? 15)),
      status: b.paidFraction === 0 ? 'Unpaid' : b.paidFraction >= 1 ? 'Paid' : 'Partial',
      paidAmount: paid,
      payments:
        paid > 0
          ? [{ id: `${id}_p1`, amount: paid, date: days(b.d + 5), paymentMode: 'bank transfer', recordedByName: 'Office' }]
          : [],
      projectId: b.proj,
      purchasedById: 'wf_murugan',
      purchasedByName: 'Murugan P',
      createdByName: 'Office',
      ...BY,
      createdAt: days(b.d),
      updatedAt: days(b.d),
    });
  });

  // Three weeks of site attendance for the daily-wage workers.
  const dailyWorkers = workforce.filter((w) => w.dailyWage);
  for (let d = 20; d >= 0; d -= 1) {
    const date = days(-d);
    if (new Date(date).getDay() === 0) continue; // Sundays off
    dailyWorkers.forEach((w, i) => {
      const id = `att_${w.id}_${d}`;
      const absent = (d + i) % 13 === 0;
      const half = !absent && (d + i) % 9 === 0;
      store.set('attendance', id, {
        id,
        projectId: projects[i % 3].id,
        date,
        workforceId: w.id,
        status: absent ? 'Absent' : half ? 'Half-day' : 'Present',
        wagesEarned: absent ? 0 : half ? (w.dailyWage ?? 0) / 2 : w.dailyWage,
        createdAt: date,
        createdBy: OWNER_UID,
      });
    });
  }
}
