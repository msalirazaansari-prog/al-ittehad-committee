/**
 * Committee Management Data Store
 * Configuration: 17 Members, 17 Months, Rs. 20,000 per month
 * Total Pool: Rs. 340,000 per month | Rs. 5,780,000 overall
 */

const COMMITTEE_CONFIG = {
  name: "Al-Ittihad Committee (17 Members)",
  currency: "Rs.",
  monthlyAmount: 20000,
  totalMonths: 17,
  startDate: "2026-10-01", // Defaults to current period
  initialMembers: [
    { id: 1, name: "Ali", phone: "03001234501", payoutMonth: 1 },
    { id: 2, name: "Raza", phone: "03001234502", payoutMonth: 2 },
    { id: 3, name: "Ansari", phone: "03001234503", payoutMonth: 3 },
    { id: 4, name: "Awais", phone: "03001234504", payoutMonth: 4 },
    { id: 5, name: "Hameed", phone: "03001234505", payoutMonth: 5 },
    { id: 6, name: "Sadia", phone: "03001234506", payoutMonth: 6 },
    { id: 7, name: "Junaid", phone: "03001234507", payoutMonth: 7 },
    { id: 8, name: "Ayesha", phone: "03001234508", payoutMonth: 8 },
    { id: 9, name: "Rafia", phone: "03001234509", payoutMonth: 9 },
    { id: 10, name: "Noman", phone: "03001234510", payoutMonth: 10 },
    { id: 11, name: "Rafan", phone: "03001234511", payoutMonth: 11 },
    { id: 12, name: "Shazia", phone: "03001234512", payoutMonth: 12 },
    { id: 13, name: "Fareeda", phone: "03001234513", payoutMonth: 13 },
    { id: 14, name: "Hassan", phone: "03001234514", payoutMonth: 14 },
    { id: 15, name: "Najma", phone: "03001234515", payoutMonth: 15 },
    { id: 16, name: "Raheela", phone: "03001234516", payoutMonth: 16 },
    { id: 17, name: "Rahat", phone: "03001234517", payoutMonth: 17 }
  ]
};

const STORAGE_KEY = "committee_data_v1";

// Helper to calculate Month Name from start date
function getMonthLabel(monthIndex, startDateStr = COMMITTEE_CONFIG.startDate) {
  const start = new Date(startDateStr);
  const date = new Date(start.getFullYear(), start.getMonth() + (monthIndex - 1), 1);
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
}

// Generate default clean data
function generateDefaultData(includeSamplePayments = true) {
  const members = JSON.parse(JSON.stringify(COMMITTEE_CONFIG.initialMembers));
  
  // Matrix payments structure: { [memberId]: { [monthNumber]: { status: 'paid'|'pending'|'partial', amount: 20000, date: '', method: '', notes: '' } } }
  const payments = {};
  members.forEach(m => {
    payments[m.id] = {};
    for (let month = 1; month <= COMMITTEE_CONFIG.totalMonths; month++) {
      payments[m.id][month] = {
        status: "pending",
        amount: 0,
        paidDate: null,
        method: "Cash",
        notes: "",
        receiptNo: `REC-M${month}-${String(m.id).padStart(2, '0')}`
      };
    }
  });

  // Payout records: { [monthNumber]: { memberId: number, disbursed: boolean, date: string, notes: string } }
  const payouts = {};
  for (let month = 1; month <= COMMITTEE_CONFIG.totalMonths; month++) {
    const member = members.find(m => m.payoutMonth === month);
    payouts[month] = {
      memberId: member ? member.id : null,
      disbursed: false,
      disbursedDate: null,
      amount: COMMITTEE_CONFIG.monthlyAmount * COMMITTEE_CONFIG.initialMembers.length,
      notes: ""
    };
  }

  // Pre-seed Month 1 and Month 2 with realistic activity if requested
  if (includeSamplePayments) {
    // Month 1: 100% completed
    members.forEach((m, idx) => {
      payments[m.id][1] = {
        status: "paid",
        amount: 20000,
        paidDate: "2026-10-05",
        method: idx % 3 === 0 ? "Bank Transfer" : (idx % 2 === 0 ? "JazzCash / EasyPaisa" : "Cash"),
        notes: "On time payment",
        receiptNo: `REC-M01-${String(m.id).padStart(2, '0')}`
      };
    });
    payouts[1].disbursed = true;
    payouts[1].disbursedDate = "2026-10-08";
    payouts[1].notes = "Handed over to Ali (Month 1 recipient) via Pay Order / Cash";

    // Month 2: 12 members paid, 2 partial, 3 pending
    members.forEach((m, idx) => {
      if (idx < 12) {
        payments[m.id][2] = {
          status: "paid",
          amount: 20000,
          paidDate: "2026-11-04",
          method: idx % 2 === 0 ? "Bank Transfer" : "Cash",
          notes: "Paid in full",
          receiptNo: `REC-M02-${String(m.id).padStart(2, '0')}`
        };
      } else if (idx < 14) {
        payments[m.id][2] = {
          status: "partial",
          amount: 10000,
          paidDate: "2026-11-07",
          method: "JazzCash",
          notes: "First installment of 10,000 paid. Remaining Rs 10k due next week.",
          receiptNo: `REC-M02-${String(m.id).padStart(2, '0')}`
        };
      } else {
        payments[m.id][2] = {
          status: "pending",
          amount: 0,
          paidDate: null,
          method: "Cash",
          notes: "Reminder sent via WhatsApp",
          receiptNo: `REC-M02-${String(m.id).padStart(2, '0')}`
        };
      }
    });
  }

  const logs = [
    {
      id: "log_1",
      timestamp: new Date().toISOString(),
      action: "System Initialized",
      details: "17 Members and 17 Months configured successfully (Rs. 20,000/month)."
    }
  ];

  return {
    config: {
      name: COMMITTEE_CONFIG.name,
      currency: COMMITTEE_CONFIG.currency,
      monthlyAmount: COMMITTEE_CONFIG.monthlyAmount,
      totalMonths: COMMITTEE_CONFIG.totalMonths,
      startDate: COMMITTEE_CONFIG.startDate,
      currentActiveMonth: 2
    },
    members,
    payments,
    payouts,
    logs
  };
}

// Data Store Controller
const Store = {
  load() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        const initial = generateDefaultData(true);
        this.save(initial);
        return initial;
      }
      return JSON.parse(serialized);
    } catch (e) {
      console.error("Failed to load data from storage, generating defaults:", e);
      return generateDefaultData(true);
    }
  },

  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent("committeeDataUpdated", { detail: data }));
    } catch (e) {
      console.error("Failed to persist data:", e);
    }
  },

  reset(withSampleData = false) {
    const data = generateDefaultData(withSampleData);
    this.save(data);
    return data;
  },

  exportJSON() {
    const data = this.load();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `committee_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.members && parsed.payments && parsed.payouts) {
        this.save(parsed);
        return { success: true };
      }
      return { success: false, error: "Invalid backup format: missing required fields." };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  addLog(action, details) {
    const data = this.load();
    data.logs = data.logs || [];
    data.logs.unshift({
      id: "log_" + Date.now(),
      timestamp: new Date().toISOString(),
      action,
      details
    });
    if (data.logs.length > 50) data.logs = data.logs.slice(0, 50);
    this.save(data);
  }
};
