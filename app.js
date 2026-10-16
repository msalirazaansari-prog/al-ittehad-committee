/**
 * Committee Management Web Application Logic
 * Modern, responsive, client-side controller with audio synthesis & confetti
 */

// Application State
let appData = Store.load();
let currentFilter = "all";
let currentSearch = "";
let selectedCell = null; // { memberId, month }
let selectedMemberId = null;

// Sound Synthesizer using Web Audio API
const SoundFx = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  },
  playTick() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch(e) {}
  },
  playSuccess() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.4);
    } catch(e) {}
  }
};

// Simple Canvas Confetti
function triggerConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = "block";

  const particles = [];
  const colors = ["#10b981", "#6366f1", "#f59e0b", "#3b82f6", "#ec4899", "#ffffff"];
  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.7) * 16,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rv: (Math.random() - 0.5) * 10
    });
  }

  let frames = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.rotation += p.rv;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });
    frames++;
    if (frames < 70) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = "none";
    }
  }
  animate();
}

// Toast Notifications
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : '⚠️'}</span>
    <div>${message}</div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Helpers
function formatCurrency(amount) {
  return `${appData.config.currency} ${Number(amount || 0).toLocaleString("en-PK")}`;
}

function getMemberById(id) {
  return appData.members.find(m => m.id === Number(id));
}

// Core Calculations
function getCommitteeStats() {
  const totalMonths = appData.config.totalMonths;
  const monthlyPot = appData.config.monthlyAmount * appData.members.length;
  const grandTotalExpected = monthlyPot * totalMonths;
  
  let grandTotalCollected = 0;
  appData.members.forEach(m => {
    for (let month = 1; month <= totalMonths; month++) {
      const pay = appData.payments[m.id]?.[month];
      if (pay) {
        grandTotalCollected += Number(pay.amount || 0);
      }
    }
  });

  const activeMonth = Number(appData.config.currentActiveMonth || 1);
  let activeMonthCollected = 0;
  let activeMonthPaidCount = 0;
  let activeMonthPartialCount = 0;

  appData.members.forEach(m => {
    const pay = appData.payments[m.id]?.[activeMonth];
    if (pay) {
      activeMonthCollected += Number(pay.amount || 0);
      if (pay.status === "paid") activeMonthPaidCount++;
      if (pay.status === "partial") activeMonthPartialCount++;
    }
  });

  const activeMonthPending = monthlyPot - activeMonthCollected;
  const activePayout = appData.payouts[activeMonth];
  const activeBeneficiary = activePayout ? getMemberById(activePayout.memberId) : null;

  return {
    monthlyPot,
    grandTotalExpected,
    grandTotalCollected,
    overallProgress: ((grandTotalCollected / grandTotalExpected) * 100).toFixed(1),
    activeMonth,
    activeMonthCollected,
    activeMonthPending,
    activeMonthPaidCount,
    activeMonthPartialCount,
    activeBeneficiary,
    activePayout
  };
}

// -------------------------------------------------------------
// UI Renderers
// -------------------------------------------------------------

function renderDashboard() {
  const stats = getCommitteeStats();
  
  // Update Hero & KPI cards
  document.getElementById("stat-grand-total").textContent = formatCurrency(stats.grandTotalCollected);
  document.getElementById("stat-overall-target").textContent = `Target: ${formatCurrency(stats.grandTotalExpected)}`;
  document.getElementById("stat-overall-progress-bar").style.width = `${Math.min(stats.overallProgress, 100)}%`;
  document.getElementById("stat-overall-percent").textContent = `${stats.overallProgress}%`;

  document.getElementById("stat-active-month-collected").textContent = formatCurrency(stats.activeMonthCollected);
  document.getElementById("stat-active-month-target").textContent = `Month ${stats.activeMonth} Target: ${formatCurrency(stats.monthlyPot)}`;
  const monthPercent = ((stats.activeMonthCollected / stats.monthlyPot) * 100).toFixed(1);
  document.getElementById("stat-active-progress-bar").style.width = `${Math.min(monthPercent, 100)}%`;
  document.getElementById("stat-active-percent").textContent = `${monthPercent}%`;

  document.getElementById("stat-active-paid-count").textContent = `${stats.activeMonthPaidCount} / ${appData.members.length}`;
  document.getElementById("stat-active-pending-count").textContent = `${appData.members.length - stats.activeMonthPaidCount} Members Due`;

  // Active Month Beneficiary
  const benEl = document.getElementById("stat-active-beneficiary");
  const benStatusEl = document.getElementById("stat-active-ben-status");
  if (stats.activeBeneficiary) {
    benEl.textContent = stats.activeBeneficiary.name;
    const isDisbursed = stats.activePayout?.disbursed;
    benStatusEl.innerHTML = isDisbursed 
      ? `<span class="badge badge-paid">Pot Rs 340,000 Disbursed ✅</span>` 
      : `<span class="badge badge-pending">Ready for Handover (Month ${stats.activeMonth}) ⏳</span>`;
  } else {
    benEl.textContent = "Unassigned";
    benStatusEl.innerHTML = `<span class="badge badge-indigo">Assign via Draw</span>`;
  }

  // Active month selector in header
  const monthSelect = document.getElementById("active-month-selector");
  if (monthSelect) {
    monthSelect.innerHTML = "";
    for (let m = 1; m <= appData.config.totalMonths; m++) {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = `Month ${m} (${getMonthLabel(m, appData.config.startDate)})`;
      if (m === stats.activeMonth) opt.selected = true;
      monthSelect.appendChild(opt);
    }
  }

  // Render Activity Logs
  renderRecentLogs();
}

function renderRecentLogs() {
  const container = document.getElementById("recent-activity-list");
  if (!container) return;
  const logs = appData.logs || [];
  if (logs.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); padding: 12px 0;">No activities logged yet.</div>`;
    return;
  }
  container.innerHTML = logs.slice(0, 6).map(log => `
    <div style="display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid var(--border-subtle); font-size: 0.84rem;">
      <div style="background: rgba(16, 185, 129, 0.15); color: var(--primary); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; flex-shrink: 0;">⚡</div>
      <div style="flex: 1;">
        <div style="font-weight: 600; color: var(--text-primary);">${log.action}</div>
        <div style="color: var(--text-secondary); font-size: 0.78rem;">${log.details}</div>
      </div>
      <div style="color: var(--text-muted); font-size: 0.74rem; white-space: nowrap;">${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  `).join("");
}

// -------------------------------------------------------------
// 17x17 Matrix Ledger Renderer
// -------------------------------------------------------------

function renderMatrix() {
  const table = document.getElementById("matrix-table");
  if (!table) return;

  const totalMonths = appData.config.totalMonths;
  const members = appData.members;

  // Filter members based on search and status filter
  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(currentSearch.toLowerCase()) || 
                          (m.phone && m.phone.includes(currentSearch));
    if (!matchesSearch) return false;

    if (currentFilter === "all") return true;

    // Check payment statuses for filter
    let hasPending = false;
    let hasPaidAll = true;
    for (let mo = 1; mo <= totalMonths; mo++) {
      const pay = appData.payments[m.id]?.[mo];
      if (!pay || pay.status !== "paid") {
        hasPaidAll = false;
        hasPending = true;
      }
    }

    if (currentFilter === "pending") return hasPending;
    if (currentFilter === "paid") return hasPaidAll;
    return true;
  });

  // Table Header
  let headerHtml = `
    <thead>
      <tr>
        <th class="col-member">Member Name</th>
        <th style="min-width: 90px;">Payout Mo.</th>
  `;
  for (let m = 1; m <= totalMonths; m++) {
    const isCurrent = m === Number(appData.config.currentActiveMonth);
    headerHtml += `
      <th style="${isCurrent ? 'color: var(--primary); border-bottom: 2px solid var(--primary);' : ''}">
        M${m}
        <div style="font-size: 0.68rem; font-weight: normal; color: var(--text-muted);">${getMonthLabel(m, appData.config.startDate)}</div>
      </th>
    `;
  }
  headerHtml += `
        <th class="col-total">Total Contributed</th>
      </tr>
    </thead>
  `;

  // Table Body Rows
  let bodyHtml = `<tbody>`;
  
  if (filteredMembers.length === 0) {
    bodyHtml += `<tr><td colspan="${totalMonths + 3}" style="text-align: center; padding: 24px; color: var(--text-muted);">No matching members found.</td></tr>`;
  } else {
    filteredMembers.forEach((member, index) => {
      let memberTotalPaid = 0;
      
      let cellsHtml = "";
      for (let m = 1; m <= totalMonths; m++) {
        const pay = appData.payments[member.id]?.[m] || { status: "pending", amount: 0 };
        memberTotalPaid += Number(pay.amount || 0);

        let cellClass = "matrix-cell-pending";
        let cellLabel = "Rs 0";
        let icon = "⏳";

        if (pay.status === "paid") {
          cellClass = "matrix-cell-paid";
          cellLabel = "Rs 20k";
          icon = "✓";
        } else if (pay.status === "partial") {
          cellClass = "matrix-cell-partial";
          cellLabel = `Rs ${(pay.amount / 1000).toFixed(0)}k`;
          icon = "½";
        }

        cellsHtml += `
          <td>
            <button class="matrix-cell-btn ${cellClass}" onclick="openPaymentModal(${member.id}, ${m})" title="${member.name} - Month ${m}: ${pay.status.toUpperCase()} (${formatCurrency(pay.amount)})">
              <span>${icon}</span>
              <span>${cellLabel}</span>
            </button>
          </td>
        `;
      }

      const isPayoutAssigned = member.payoutMonth;
      const progressPercent = ((memberTotalPaid / (appData.config.monthlyAmount * totalMonths)) * 100).toFixed(0);

      bodyHtml += `
        <tr>
          <td class="col-member">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.75rem; color: var(--text-muted); width: 16px;">${member.id}</span>
              <strong style="color: var(--text-primary);">${member.name}</strong>
            </div>
          </td>
          <td>
            <span class="badge ${isPayoutAssigned ? 'badge-indigo' : 'badge-pending'}" style="font-size: 0.72rem;">
              ${isPayoutAssigned ? `Mo. ${isPayoutAssigned}` : 'None'}
            </span>
          </td>
          ${cellsHtml}
          <td class="col-total">
            <div style="color: var(--primary); font-weight: 800;">${formatCurrency(memberTotalPaid)}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">${progressPercent}% Completed</div>
          </td>
        </tr>
      `;
    });
  }
  bodyHtml += `</tbody>`;

  // Table Footer (Column Totals)
  let footerHtml = `
    <tfoot>
      <tr>
        <th class="col-member">Monthly Total</th>
        <th>Pot: 340k</th>
  `;
  for (let m = 1; m <= totalMonths; m++) {
    let colTotal = 0;
    appData.members.forEach(mem => {
      const p = appData.payments[mem.id]?.[m];
      if (p) colTotal += Number(p.amount || 0);
    });
    const colPercent = ((colTotal / 340000) * 100).toFixed(0);
    const isCompleted = colTotal >= 340000;

    footerHtml += `
      <td style="${isCompleted ? 'color: var(--primary);' : 'color: var(--accent-gold);'}">
        <div>${(colTotal / 1000).toFixed(0)}k</div>
        <div style="font-size: 0.68rem; font-weight: normal; color: var(--text-muted);">${colPercent}%</div>
      </td>
    `;
  }

  // Grand summary in bottom right cell
  const stats = getCommitteeStats();
  footerHtml += `
        <td class="col-total" style="color: var(--primary); font-size: 0.95rem;">
          ${formatCurrency(stats.grandTotalCollected)}
        </td>
      </tr>
    </tfoot>
  `;

  table.innerHTML = headerHtml + bodyHtml + footerHtml;
}

// -------------------------------------------------------------
// Payout & Draw Renderer
// -------------------------------------------------------------

function renderPayouts() {
  const container = document.getElementById("payout-cards-grid");
  if (!container) return;

  const totalMonths = appData.config.totalMonths;
  const activeMonth = Number(appData.config.currentActiveMonth || 1);

  let html = "";
  for (let m = 1; m <= totalMonths; m++) {
    const payout = appData.payouts[m];
    const beneficiary = payout ? getMemberById(payout.memberId) : null;
    const isActive = m === activeMonth;
    const isDisbursed = payout?.disbursed;

    html += `
      <div class="month-payout-box ${isActive ? 'active-month' : ''}">
        <div class="month-payout-header">
          <span class="month-number">Month ${m} &bull; ${getMonthLabel(m, appData.config.startDate)}</span>
          ${isDisbursed 
            ? `<span class="badge badge-paid">Disbursed ✓</span>` 
            : (isActive ? `<span class="badge badge-gold">Current Payout</span>` : `<span class="badge badge-pending">Scheduled</span>`)}
        </div>

        <div class="beneficiary-info">
          <div class="beneficiary-avatar">${beneficiary ? beneficiary.name.charAt(0) : '?'}</div>
          <div>
            <div class="beneficiary-name">${beneficiary ? beneficiary.name : 'Not Assigned'}</div>
            <div class="beneficiary-amount">${formatCurrency(340000)} Pot</div>
          </div>
        </div>

        <div class="payout-actions">
          <div style="color: var(--text-muted); font-size: 0.74rem;">
            ${isDisbursed ? `Date: ${payout.disbursedDate || 'Completed'}` : 'Status: Ready'}
          </div>
          <div style="display: flex; gap: 6px;">
            ${beneficiary ? `
              <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.74rem;" onclick="openPayoutVoucher(${m})">
                🧾 Voucher
              </button>
            ` : ''}
            <button class="btn ${isDisbursed ? 'btn-secondary' : 'btn-primary'}" style="padding: 4px 8px; font-size: 0.74rem;" onclick="toggleDisbursement(${m})">
              ${isDisbursed ? 'Undo' : 'Mark Disbursed'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// -------------------------------------------------------------
// Members Directory Renderer
// -------------------------------------------------------------

function renderMembers() {
  const container = document.getElementById("members-directory-grid");
  if (!container) return;

  const totalMonths = appData.config.totalMonths;
  const targetPerMember = appData.config.monthlyAmount * totalMonths; // Rs 340,000

  let html = "";
  appData.members.forEach(m => {
    let paidTotal = 0;
    let paidMonthsCount = 0;
    for (let mo = 1; mo <= totalMonths; mo++) {
      const pay = appData.payments[m.id]?.[mo];
      if (pay) {
        paidTotal += Number(pay.amount || 0);
        if (pay.status === "paid") paidMonthsCount++;
      }
    }

    const remaining = targetPerMember - paidTotal;
    const progress = ((paidTotal / targetPerMember) * 100).toFixed(0);

    html += `
      <div class="member-card">
        <div class="member-card-header">
          <div class="member-avatar-group">
            <div class="member-avatar">${m.name.charAt(0)}</div>
            <div class="member-info">
              <h3>${m.name}</h3>
              <div class="phone">📱 ${m.phone || '0300-XXXXXXX'}</div>
            </div>
          </div>
          <span class="badge ${progress >= 100 ? 'badge-paid' : 'badge-pending'}">
            ${paidMonthsCount}/17 Paid
          </span>
        </div>

        <div class="member-payout-tag">
          🎁 Payout Winner: <strong>Month ${m.payoutMonth || 'Unassigned'}</strong> (${formatCurrency(340000)})
        </div>

        <div class="member-metrics-row">
          <div class="metric-item">
            <div class="metric-label">Total Contributed</div>
            <div class="metric-val" style="color: var(--primary);">${formatCurrency(paidTotal)}</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Remaining Dues</div>
            <div class="metric-val" style="color: ${remaining > 0 ? 'var(--accent-gold)' : 'var(--text-muted)'};">${formatCurrency(remaining)}</div>
          </div>
        </div>

        <div style="margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.74rem; color: var(--text-secondary); margin-bottom: 4px;">
            <span>17 Months Target</span>
            <span>${progress}%</span>
          </div>
          <div class="stat-progress">
            <div class="stat-progress-bar" style="width: ${progress}%;"></div>
          </div>
        </div>

        <div class="member-card-actions">
          <button class="btn btn-secondary" style="font-size: 0.78rem;" onclick="openStatementModal(${m.id})">
            📄 Ledger Statement
          </button>
          <button class="btn btn-primary" style="font-size: 0.78rem;" onclick="sendWhatsAppReminder(${m.id})">
            💬 WhatsApp
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// -------------------------------------------------------------
// Payment Modal Operations
// -------------------------------------------------------------

function openPaymentModal(memberId, month) {
  selectedCell = { memberId, month };
  const member = getMemberById(memberId);
  const payment = appData.payments[memberId]?.[month] || {
    status: "pending",
    amount: 0,
    paidDate: new Date().toISOString().slice(0, 10),
    method: "Cash",
    notes: ""
  };

  document.getElementById("modal-pay-member-name").textContent = member.name;
  document.getElementById("modal-pay-month-name").textContent = `Month ${month} (${getMonthLabel(month, appData.config.startDate)})`;
  
  document.getElementById("pay-status").value = payment.status;
  document.getElementById("pay-amount").value = payment.amount || (payment.status === "paid" ? 20000 : 0);
  document.getElementById("pay-date").value = payment.paidDate || new Date().toISOString().slice(0, 10);
  document.getElementById("pay-method").value = payment.method || "Cash";
  document.getElementById("pay-notes").value = payment.notes || "";

  document.getElementById("payment-modal").classList.add("active");
}

function closePaymentModal() {
  document.getElementById("payment-modal").classList.remove("active");
  selectedCell = null;
}

function handleStatusChange() {
  const status = document.getElementById("pay-status").value;
  const amountInput = document.getElementById("pay-amount");
  if (status === "paid") {
    amountInput.value = appData.config.monthlyAmount;
  } else if (status === "pending") {
    amountInput.value = 0;
  } else if (status === "partial" && Number(amountInput.value) <= 0) {
    amountInput.value = 10000;
  }
}

function savePayment() {
  if (!selectedCell) return;
  const { memberId, month } = selectedCell;
  const member = getMemberById(memberId);

  const status = document.getElementById("pay-status").value;
  const amount = Number(document.getElementById("pay-amount").value || 0);
  const paidDate = document.getElementById("pay-date").value;
  const method = document.getElementById("pay-method").value;
  const notes = document.getElementById("pay-notes").value;

  appData.payments[memberId] = appData.payments[memberId] || {};
  appData.payments[memberId][month] = {
    status,
    amount,
    paidDate,
    method,
    notes,
    receiptNo: appData.payments[memberId][month]?.receiptNo || `REC-M${String(month).padStart(2,'0')}-${String(memberId).padStart(2,'0')}`
  };

  Store.addLog(
    `Payment Updated for ${member.name}`,
    `Month ${month}: Status ${status.toUpperCase()} (${formatCurrency(amount)}) via ${method}`
  );

  Store.save(appData);
  SoundFx.playSuccess();
  showToast(`Payment saved for ${member.name} (Month ${month})!`);

  closePaymentModal();
  refreshAllViews();
}

function openReceiptFromModal() {
  if (!selectedCell) return;
  const { memberId, month } = selectedCell;
  closePaymentModal();
  openReceiptModal(memberId, month);
}

// -------------------------------------------------------------
// Official Receipt Modal
// -------------------------------------------------------------

function openReceiptModal(memberId, month) {
  const member = getMemberById(memberId);
  const payment = appData.payments[memberId]?.[month] || {
    status: "paid",
    amount: 20000,
    paidDate: new Date().toISOString().slice(0, 10),
    method: "Cash",
    notes: "Monthly Committee Contribution",
    receiptNo: `REC-M${String(month).padStart(2,'0')}-${String(memberId).padStart(2,'0')}`
  };

  document.getElementById("receipt-number").textContent = payment.receiptNo;
  document.getElementById("receipt-date").textContent = payment.paidDate || new Date().toISOString().slice(0, 10);
  document.getElementById("receipt-member-name").textContent = member.name;
  document.getElementById("receipt-member-phone").textContent = member.phone || "0300-XXXXXXX";
  document.getElementById("receipt-month-label").textContent = `Month ${month} of 17 (${getMonthLabel(month, appData.config.startDate)})`;
  document.getElementById("receipt-method").textContent = payment.method || "Cash";
  document.getElementById("receipt-status-text").textContent = payment.status.toUpperCase();
  document.getElementById("receipt-amount-display").textContent = formatCurrency(payment.amount || 20000);
  const totalEl = document.getElementById("receipt-amount-total");
  if (totalEl) totalEl.textContent = formatCurrency(payment.amount || 20000);
  document.getElementById("receipt-notes").textContent = payment.notes || "Official monthly installment received in full.";

  // Store active receipt info for WhatsApp sharing
  document.getElementById("receipt-modal").dataset.memberId = memberId;
  document.getElementById("receipt-modal").dataset.month = month;

  document.getElementById("receipt-modal").classList.add("active");
}

function closeReceiptModal() {
  document.getElementById("receipt-modal").classList.remove("active");
}

function printReceipt() {
  window.print();
}

function shareReceiptWhatsApp() {
  const modal = document.getElementById("receipt-modal");
  const memberId = modal.dataset.memberId;
  const month = modal.dataset.month;
  const member = getMemberById(memberId);
  const payment = appData.payments[memberId]?.[month];

  const text = `*${appData.config.name} - OFFICIAL RECEIPT*\n` +
    `--------------------------------------\n` +
    `🧾 *Receipt No:* ${payment?.receiptNo || 'REC'}\n` +
    `👤 *Member:* ${member.name}\n` +
    `📅 *Month:* Month ${month} (${getMonthLabel(month, appData.config.startDate)})\n` +
    `💰 *Amount Paid:* ${formatCurrency(payment?.amount || 20000)}\n` +
    `💳 *Payment Method:* ${payment?.method || 'Cash'}\n` +
    `✅ *Status:* ${payment?.status.toUpperCase()}\n` +
    `🗓 *Date:* ${payment?.paidDate || new Date().toISOString().slice(0, 10)}\n` +
    `--------------------------------------\n` +
    `جناب ${member.name} صاحب! آپکی کمیٹی قسط موصول ہو گئی ہے۔ شکریہ!`;

  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

// -------------------------------------------------------------
// Payout Handover Voucher
// -------------------------------------------------------------

function openPayoutVoucher(month) {
  const payout = appData.payouts[month];
  const beneficiary = payout ? getMemberById(payout.memberId) : null;
  if (!beneficiary) {
    showToast("No beneficiary assigned to this month yet!", "error");
    return;
  }

  document.getElementById("voucher-receipt-no").textContent = `PAY-M${String(month).padStart(2,'0')}-${beneficiary.id}`;
  document.getElementById("voucher-date").textContent = payout.disbursedDate || new Date().toISOString().slice(0, 10);
  document.getElementById("voucher-member-name").textContent = beneficiary.name;
  document.getElementById("voucher-month-info").textContent = `Month ${month} of 17 (${getMonthLabel(month, appData.config.startDate)})`;
  document.getElementById("voucher-pot-amount").textContent = formatCurrency(340000);
  document.getElementById("voucher-status").textContent = payout.disbursed ? "DISBURSED / PAID" : "PENDING DISBURSEMENT";

  document.getElementById("payout-voucher-modal").classList.add("active");
}

function closePayoutVoucher() {
  document.getElementById("payout-voucher-modal").classList.remove("active");
}

function toggleDisbursement(month) {
  const payout = appData.payouts[month];
  if (!payout) return;
  payout.disbursed = !payout.disbursed;
  payout.disbursedDate = payout.disbursed ? new Date().toISOString().slice(0, 10) : null;
  
  const beneficiary = getMemberById(payout.memberId);
  Store.addLog(
    `Payout ${payout.disbursed ? 'Disbursed' : 'Unmarked'} for Month ${month}`,
    `Rs 340,000 ${payout.disbursed ? 'handed over to' : 'reset for'} ${beneficiary ? beneficiary.name : 'Beneficiary'}`
  );

  Store.save(appData);
  if (payout.disbursed) {
    SoundFx.playSuccess();
    triggerConfetti();
    showToast(`Rs 340,000 Pot marked as Disbursed for Month ${month}!`);
  } else {
    showToast(`Disbursement status reset for Month ${month}.`);
  }
  refreshAllViews();
}

// -------------------------------------------------------------
// Lucky Draw Wheel & Randomizer
// -------------------------------------------------------------

let isSpinning = false;
function conductLuckyDraw() {
  if (isSpinning) return;
  isSpinning = true;

  const winnerDisplay = document.getElementById("draw-winner-display");
  const spinBtn = document.getElementById("btn-spin-draw");
  spinBtn.disabled = true;
  spinBtn.textContent = "🎲 Drawing in Progress...";

  const members = appData.members;
  let counter = 0;
  const totalTicks = 32;

  const interval = setInterval(() => {
    counter++;
    const randomMember = members[Math.floor(Math.random() * members.length)];
    winnerDisplay.innerHTML = `
      <div style="font-size: 1.8rem; font-weight: 800; color: var(--accent-gold);">${randomMember.name}</div>
      <div style="font-size: 0.85rem; color: var(--text-secondary);">Selecting next lucky recipient...</div>
    `;
    SoundFx.playTick();

    if (counter >= totalTicks) {
      clearInterval(interval);
      isSpinning = false;
      spinBtn.disabled = false;
      spinBtn.textContent = "🎲 Run Draw Again";

      const finalWinner = members[Math.floor(Math.random() * members.length)];
      winnerDisplay.innerHTML = `
        <div style="font-size: 2.2rem; font-weight: 800; color: var(--primary);">🎉 ${finalWinner.name} 🎉</div>
        <div style="font-size: 0.9rem; color: var(--text-primary); font-weight: 600;">Selected for Rs 340,000 Pot!</div>
      `;
      SoundFx.playSuccess();
      triggerConfetti();
      showToast(`Lucky Draw Winner: ${finalWinner.name}!`);
    }
  }, 100);
}

// -------------------------------------------------------------
// Member Statement Modal
// -------------------------------------------------------------

function openStatementModal(memberId) {
  selectedMemberId = memberId;
  const member = getMemberById(memberId);
  const totalMonths = appData.config.totalMonths;

  document.getElementById("statement-member-name").textContent = member.name;
  document.getElementById("statement-member-payout").textContent = `Month ${member.payoutMonth || 'Unassigned'}`;

  const tableBody = document.getElementById("statement-table-body");
  let rowsHtml = "";
  let totalContributed = 0;

  for (let m = 1; m <= totalMonths; m++) {
    const pay = appData.payments[memberId]?.[m] || { status: "pending", amount: 0 };
    totalContributed += Number(pay.amount || 0);

    let badgeClass = "badge-pending";
    if (pay.status === "paid") badgeClass = "badge-paid";
    if (pay.status === "partial") badgeClass = "badge-partial";

    rowsHtml += `
      <tr>
        <td>Month ${m}</td>
        <td>${getMonthLabel(m, appData.config.startDate)}</td>
        <td>${formatCurrency(pay.amount || 0)}</td>
        <td><span class="badge ${badgeClass}">${pay.status.toUpperCase()}</span></td>
        <td>${pay.paidDate || '-'}</td>
        <td>${pay.method || '-'}</td>
      </tr>
    `;
  }

  tableBody.innerHTML = rowsHtml;
  document.getElementById("statement-total-paid").textContent = formatCurrency(totalContributed);
  document.getElementById("statement-balance-due").textContent = formatCurrency((appData.config.monthlyAmount * totalMonths) - totalContributed);

  document.getElementById("statement-modal").classList.add("active");
}

function closeStatementModal() {
  document.getElementById("statement-modal").classList.remove("active");
  selectedMemberId = null;
}

// -------------------------------------------------------------
// WhatsApp Reminder Dispatch
// -------------------------------------------------------------

function sendWhatsAppReminder(memberId) {
  const member = getMemberById(memberId);
  const activeMonth = Number(appData.config.currentActiveMonth || 1);
  const payment = appData.payments[memberId]?.[activeMonth];

  const isPaid = payment?.status === "paid";
  const message = isPaid
    ? `*${appData.config.name}*\n` +
      `محترم ${member.name} صاحب!\n` +
      `آپکی کمیٹی قسط برائے Month ${activeMonth} (${formatCurrency(20000)}) وصول ہو چکی ہے۔\n` +
      `آپکا تعاون ہمارے لئے قابلِ قدر ہے۔ شکریہ!`
    : `*${appData.config.name} - قسط کی یاد دہانی*\n` +
      `محترم ${member.name} صاحب!\n` +
      `کمیٹی Month ${activeMonth} (${getMonthLabel(activeMonth, appData.config.startDate)}) کی ماہانہ قسط *${formatCurrency(20000)}* واجب الادا ہے۔\n` +
      `براہ کرم بروقت ادائیگی یقینی بنائیں۔ شکریہ!`;

  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

// -------------------------------------------------------------
// Tab Switching & Navigation
// -------------------------------------------------------------

function switchTab(tabId) {
  document.querySelectorAll(".nav-pill-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-content").forEach(section => {
    section.classList.toggle("active", section.id === `tab-${tabId}`);
  });

  // Re-render corresponding view
  if (tabId === "matrix") renderMatrix();
  if (tabId === "payouts") renderPayouts();
  if (tabId === "members") renderMembers();
  if (tabId === "dashboard") renderDashboard();
}

// -------------------------------------------------------------
// Settings & Data Management
// -------------------------------------------------------------

function setupSettings() {
  const activeMonthSelect = document.getElementById("setting-active-month");
  if (activeMonthSelect) {
    activeMonthSelect.innerHTML = "";
    for (let m = 1; m <= appData.config.totalMonths; m++) {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = `Month ${m}`;
      if (m === Number(appData.config.currentActiveMonth)) opt.selected = true;
      activeMonthSelect.appendChild(opt);
    }
  }

  const startDateInput = document.getElementById("setting-start-date");
  if (startDateInput) {
    startDateInput.value = appData.config.startDate;
  }
}

function saveSettings() {
  const activeMonth = Number(document.getElementById("setting-active-month").value);
  const startDate = document.getElementById("setting-start-date").value;

  appData.config.currentActiveMonth = activeMonth;
  appData.config.startDate = startDate;
  Store.save(appData);

  showToast("Settings updated successfully!");
  refreshAllViews();
}

function resetToSample() {
  if (confirm("Reset to realistic sample data (Month 1 complete, Month 2 in progress)?")) {
    appData = Store.reset(true);
    showToast("Reset to sample data completed!");
    refreshAllViews();
  }
}

function resetToBlank() {
  if (confirm("Reset all 17 members and 17 months to clean empty state? All payment records will be wiped.")) {
    appData = Store.reset(false);
    showToast("Reset to clean state completed!");
    refreshAllViews();
  }
}

function exportData() {
  Store.exportJSON();
  showToast("Backup file downloaded!");
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = Store.importJSON(e.target.result);
    if (result.success) {
      appData = Store.load();
      showToast("Data imported successfully!");
      refreshAllViews();
    } else {
      showToast("Import error: " + result.error, "error");
    }
  };
  reader.readAsText(file);
}

// Export Matrix to CSV
function exportMatrixCSV() {
  const totalMonths = appData.config.totalMonths;
  let csv = "Member ID,Member Name,Payout Month,";
  for (let m = 1; m <= totalMonths; m++) {
    csv += `Month ${m} (${getMonthLabel(m, appData.config.startDate)}),`;
  }
  csv += "Total Paid,Status\n";

  appData.members.forEach(member => {
    let rowTotal = 0;
    csv += `"${member.id}","${member.name}","Month ${member.payoutMonth || ''}",`;
    for (let m = 1; m <= totalMonths; m++) {
      const p = appData.payments[member.id]?.[m];
      const amt = p ? p.amount : 0;
      rowTotal += Number(amt);
      csv += `"${amt}",`;
    }
    csv += `"${rowTotal}","${rowTotal >= 340000 ? 'Completed' : 'Pending'}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `committee_matrix_17members_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV Ledger downloaded successfully!");
}

// Refresh all views
function refreshAllViews() {
  renderDashboard();
  renderMatrix();
  renderPayouts();
  renderMembers();
  setupSettings();
}

// Theme Toggle
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("committee_theme", next);
}

// -------------------------------------------------------------
// App Initialization
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Apply saved theme
  const savedTheme = localStorage.getItem("committee_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);

  // Nav pills event listeners
  document.querySelectorAll(".nav-pill-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Active month selector change
  const activeMonthSel = document.getElementById("active-month-selector");
  if (activeMonthSel) {
    activeMonthSel.addEventListener("change", (e) => {
      appData.config.currentActiveMonth = Number(e.target.value);
      Store.save(appData);
      refreshAllViews();
      showToast(`Active Month changed to Month ${e.target.value}`);
    });
  }

  // Matrix Search & Filters
  const searchInput = document.getElementById("matrix-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value;
      renderMatrix();
    });
  }

  const filterSelect = document.getElementById("matrix-filter");
  if (filterSelect) {
    filterSelect.addEventListener("change", (e) => {
      currentFilter = e.target.value;
      renderMatrix();
    });
  }

  // Initial renders
  refreshAllViews();
});
