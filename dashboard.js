// Dashboard Operations Handler

document.addEventListener('DOMContentLoaded', () => {
    // Load profile database parameters immediately
    requestUserProfile();

    // Setup sidebar navigation links highlight on scroll
    setupSidebarScrollTracking();
});

// User profile elements reference
let currentUserObj = null;

async function requestUserProfile() {
    try {
        const response = await fetch('/api/user');

        // Unauthorized check
        if (response.status === 410 || response.status === 401) {
            window.location.href = '/login.html';
            return;
        }

        const user = await response.json();
        currentUserObj = user;

        // Standard DOM binding
        document.getElementById('user-greeting').textContent = user.name;
        document.getElementById('sidebar-user-name').textContent = user.name;
        document.getElementById('sidebar-user-email').textContent = user.email;

        // Sizing initials avatar
        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        document.getElementById('sidebar-user-avatar').textContent = initials;
        document.getElementById('user-main-avatar').textContent = initials;

        // Card details binding
        updateWalletCardUI(user.balance, user.card_number, user.card_frozen);

        // Apply security selections
        document.getElementById('db-biometrics-toggle').checked = user.biometrics_active === 1;
        document.getElementById('db-freeze-toggle').checked = user.card_frozen === 1;

        // Load sub-modules
        loadUserInvoices();
        loadUserTransactions();

    } catch (err) {
        console.error('Fetch Profile Exception:', err);
    }
}

function updateWalletCardUI(balance, cardNumber, cardFrozen) {
    const balanceLbl = document.getElementById('card-balance-val');
    const cardNumLbl = document.getElementById('card-number-lbl');
    const cardBox = document.querySelector('.wallet-card-container');
    const alertBanner = document.getElementById('frozen-alert-banner');

    balanceLbl.textContent = `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    cardNumLbl.textContent = cardNumber;

    if (cardFrozen === 1) {
        cardBox.classList.add('frozen');
        alertBanner.classList.add('active');
    } else {
        cardBox.classList.remove('frozen');
        alertBanner.classList.remove('active');
    }
}

// Fetch Outstanding Bills Invoices
async function loadUserInvoices() {
    const container = document.getElementById('dashboard-bills-list');
    container.innerHTML = '<span style="font-size:0.9rem; color:var(--text-muted);">Loading outstanding statements...</span>';

    try {
        const res = await fetch('/api/bills');
        const bills = await res.json();

        if (bills.length === 0) {
            container.innerHTML = '<p style="font-size:0.9rem; color:var(--text-light); text-align:center;">All invoices clear! Nice job.</p>';
            return;
        }

        container.innerHTML = '';

        bills.forEach(bill => {
            const row = document.createElement('div');
            row.className = 'dashboard-bill-row';

            const isPaid = bill.paid === 1;
            const payButtonHtml = isPaid
                ? `<button class="bill-pay-action-btn settled" disabled>Paid</button>`
                : `<button class="bill-pay-action-btn" onclick="executeBillPay(${bill.id}, this, ${bill.amount}, '${bill.company}')">Pay Now</button>`;

            row.innerHTML = `
        <div class="bill-row-left">
          <div class="bill-row-icon">
            <i data-lucide="${bill.icon || 'file-text'}"></i>
          </div>
          <div class="bill-row-info">
            <h4>${bill.company}</h4>
            <p>Due amount: <strong>$${bill.amount.toFixed(2)}</strong></p>
          </div>
        </div>
        ${payButtonHtml}
      `;
            container.appendChild(row);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (err) {
        console.error('Invoice loads error:', err);
        container.innerHTML = '<p style="font-size:0.9rem; color:#ef4444;">Failed to sync outstanding invoice list.</p>';
    }
}

// Fetch Ledger Transactions
async function loadUserTransactions() {
    const tbody = document.getElementById('dashboard-tx-table-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Syncing secure logs ledger...</td></tr>';

    try {
        const res = await fetch('/api/transactions');
        const txs = await res.json();

        if (txs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-light);">No operations found. Start transferring assets.</td></tr>';
            return;
        }

        tbody.innerHTML = '';

        txs.forEach(tx => {
            const tr = document.createElement('tr');
            const isCredit = tx.amount > 0;
            const amtSign = isCredit ? '+' : '';
            const amtClass = isCredit ? 'tx-positive' : 'tx-negative';
            const iconType = isCredit ? 'arrow-down-left' : 'arrow-up-right';
            const iconColor = isCredit ? 'var(--success)' : '#ef4444';
            const iconBg = isCredit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';

            const dateStr = new Date(tx.timestamp).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            tr.innerHTML = `
        <td>
          <div class="tx-type-badge">
            <div class="tx-type-icon" style="background-color: ${iconBg}; color: ${iconColor};">
              <i data-lucide="${iconType}"></i>
            </div>
            <span>${tx.type}</span>
          </div>
        </td>
        <td><strong>${tx.party}</strong></td>
        <td>Banking Channels</td>
        <td>${dateStr}</td>
        <td class="${amtClass}">${amtSign}$${Math.abs(tx.amount).toFixed(2)}</td>
      `;
            tbody.appendChild(tr);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (err) {
        console.error('Ledger sync error:', err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ef4444;">Failed to sync transaction ledger logs.</td></tr>';
    }
}

// Execute Money Transfer via API
async function executeDbTransfer(event) {
    event.preventDefault();

    const recipient = document.getElementById('transfer-recipient');
    const amount = document.getElementById('transfer-amount');

    const alertBox = document.getElementById('transfer-alert-box');
    const successBox = document.getElementById('transfer-success-box');

    alertBox.style.display = 'none';
    successBox.style.display = 'none';

    if (!recipient.value.trim()) {
        alertBox.textContent = 'Recipient email or identifier required.';
        alertBox.style.display = 'block';
        return;
    }

    const amtVal = parseFloat(amount.value);
    if (isNaN(amtVal) || amtVal <= 0) {
        alertBox.textContent = 'Transfer amount must exceed $0.00.';
        alertBox.style.display = 'block';
        return;
    }

    try {
        const res = await fetch('/api/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: recipient.value.trim(),
                amount: amtVal
            })
        });

        const data = await res.json();

        if (res.ok) {
            successBox.textContent = `Asset success! Wire $${amtVal.toFixed(2)} dispatched to ${recipient.value.trim()}`;
            successBox.style.display = 'block';

            recipient.value = '';
            amount.value = '';

            // Reload updated values
            requestUserProfile();
        } else {
            alertBox.textContent = data.error || 'Transfer checkout declined.';
            alertBox.style.display = 'block';
        }
    } catch (err) {
        alertBox.textContent = 'Unable to wire funds. Connect server status checks.';
        alertBox.style.display = 'block';
    }
}

// Settle Outstanding Invoice Payment
async function executeBillPay(billId, btn, amount, company) {
    const originalHtml = btn.outerHTML;
    btn.disabled = true;
    btn.textContent = 'Paying...';

    try {
        const res = await fetch('/api/bills/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ billId })
        });

        const data = await res.json();

        if (res.ok) {
            btn.textContent = 'Paid';
            btn.className = 'bill-pay-action-btn settled';
            // Reload User balance
            requestUserProfile();
        } else {
            alert(data.error || 'Utility payment declined.');
            btn.outerHTML = originalHtml;
        }
    } catch (err) {
        alert('Security check: Unable to pay utility bill. Connection offline.');
        btn.outerHTML = originalHtml;
    }
}

// Toggle account safety check parameters
async function toggleSecuritySetting(type, checkbox) {
    const value = checkbox.checked ? 1 : 0;

    try {
        const res = await fetch('/api/security/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, value })
        });

        if (res.ok) {
            if (type === 'freeze') {
                // Redraw card layouts
                if (currentUserObj) {
                    currentUserObj.card_frozen = value;
                    updateWalletCardUI(currentUserObj.balance, currentUserObj.card_number, value);
                }
            }
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to update safety configurations.');
            checkbox.checked = !checkbox.checked; // Revert
        }
    } catch (err) {
        alert('Unable to notify settings check. Connection offline.');
        checkbox.checked = !checkbox.checked;
    }
}

// Handle session termination
async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (err) {
        window.location.href = '/';
    }
}

// Sidebar links active tracker scroll
function setupSidebarScrollTracking() {
    const sidebarItems = document.querySelectorAll('.sidebar-menu .sidebar-item');
    const scrollElements = document.querySelectorAll('.scroll-anchor');

    window.addEventListener('scroll', () => {
        let currentId = 'overview';
        scrollElements.forEach(el => {
            const elTop = el.offsetTop - 120;
            if (window.scrollY >= elTop) {
                currentId = el.getAttribute('id');
            }
        });

        sidebarItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${currentId}`) {
                item.classList.add('active');
            }
        });
    });
}
