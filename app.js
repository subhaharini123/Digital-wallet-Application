// Initialize Lucide Icons
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  // Navbar scroll background change
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const drawerLinks = mobileDrawer.querySelectorAll('.nav-link');

  mobileMenuBtn.addEventListener('click', () => {
    mobileMenuBtn.classList.toggle('active');
    mobileDrawer.classList.toggle('active');
    document.body.style.overflow = mobileDrawer.classList.contains('active') ? 'hidden' : '';
  });

  drawerLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileMenuBtn.classList.remove('active');
      mobileDrawer.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  // Scroll Reveal Animations using IntersectionObserver
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        revealObserver.unobserve(entry.target); // Trigger once
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // Active Navigation Highlighter on scroll
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-menu .nav-link');
  
  window.addEventListener('scroll', () => {
    let currentSectionId = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      const sectionHeight = section.clientHeight;
      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        currentSectionId = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSectionId}`) {
        link.classList.add('active');
      }
    });
  });

  // Pricing toggle monthly / yearly
  const pricingMonthlyBtn = document.getElementById('pricing-monthly-btn');
  const pricingYearlyBtn = document.getElementById('pricing-yearly-btn');
  
  const standardPrice = document.getElementById('price-standard');
  const premiumPrice = document.getElementById('price-premium');
  const elitePrice = document.getElementById('price-elite');

  pricingMonthlyBtn.addEventListener('click', () => {
    pricingMonthlyBtn.classList.add('active');
    pricingYearlyBtn.classList.remove('active');
    standardPrice.textContent = '0';
    premiumPrice.textContent = '4.99';
    elitePrice.textContent = '11.99';
  });

  pricingYearlyBtn.addEventListener('click', () => {
    pricingYearlyBtn.classList.add('active');
    pricingMonthlyBtn.classList.remove('active');
    standardPrice.textContent = '0';
    premiumPrice.textContent = '3.99'; // 20% discount approximation
    elitePrice.textContent = '9.59'; // 20% discount
  });

  // FAQ Accordion Toggle
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const header = item.querySelector('.faq-header');
    const body = item.querySelector('.faq-body');
    
    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Close other FAQs
      faqItems.forEach(otherItem => {
        otherItem.classList.remove('active');
        otherItem.querySelector('.faq-body').style.maxHeight = null;
        otherItem.querySelector('.faq-header').setAttribute('aria-expanded', 'false');
      });

      if (!isActive) {
        item.classList.add('active');
        body.style.maxHeight = body.scrollHeight + 'px';
        header.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Phone Simulator Controls Tab switcher
  const simBtns = document.querySelectorAll('.sim-btn');
  const phoneModules = document.querySelectorAll('.phone-module');

  simBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Deactivate other tabs
      simBtns.forEach(b => b.classList.remove('active'));
      phoneModules.forEach(m => m.classList.remove('active'));

      // Activate clicked tab
      btn.classList.add('active');
      const targetModuleId = btn.getAttribute('aria-controls');
      const targetModule = document.getElementById(targetModuleId);
      if (targetModule) {
        targetModule.classList.add('active');
      }
    });
  });

  // Form Validation & Handling
  const contactForm = document.getElementById('contact-form');
  const submitBtn = contactForm.querySelector('.contact-submit-btn');

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Validate fields
    const name = document.getElementById('form-name');
    const email = document.getElementById('form-email');
    const subject = document.getElementById('form-subject');
    const message = document.getElementById('form-message');

    let isValid = true;

    // Reset error states
    document.querySelectorAll('.form-feedback').forEach(f => f.classList.remove('error'));

    if (name.value.trim().length < 2) {
      document.getElementById('feedback-name').classList.add('error');
      isValid = false;
    }

    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailPattern.test(email.value.trim())) {
      document.getElementById('feedback-email').classList.add('error');
      isValid = false;
    }

    if (subject.value.trim().length < 4) {
      document.getElementById('feedback-subject').classList.add('error');
      isValid = false;
    }

    if (message.value.trim().length < 15) {
      document.getElementById('feedback-message').classList.add('error');
      isValid = false;
    }

    if (isValid) {
      // Simulate form submission effect
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Sending Security Verification...';

      setTimeout(() => {
        // Success state
        contactForm.style.display = 'none';
        const successContainer = document.getElementById('form-success-container');
        successContainer.classList.add('active');
      }, 1200);
    }
  });

});

// Interactive Phone Mockup Global Scope variables & Functions
let currentBalance = 14250.80;
let selectedRecipient = 'Michael K.';
let selectedInitials = 'MK';

function selectSimRecipient(name, initials, el) {
  selectedRecipient = name;
  selectedInitials = initials;
  
  // Highlight visually
  const listItems = document.querySelectorAll('.phone-user-wrapper');
  listItems.forEach(item => item.style.transform = '');
  el.style.transform = 'scale(1.08)';
}

function triggerSimTransfer() {
  const sendAmount = 120.00;
  
  if (currentBalance < sendAmount) {
    alert("Insufficient funds inside simulator.");
    return;
  }

  // Update Balance
  currentBalance -= sendAmount;
  updatePhoneBalanceUI();

  // Highlight Tx History insert
  addSimulatorTransaction(selectedRecipient, -sendAmount, 'Money Sent');

  // Trigger Success Screen
  const successModal = document.getElementById('phone-sim-success');
  const successTitle = document.getElementById('phone-success-title');
  const successMsg = document.getElementById('phone-success-message');

  successTitle.textContent = "Transfer Successful";
  successMsg.innerHTML = `Sent <strong>$${sendAmount.toFixed(2)}</strong> to ${selectedRecipient}`;
  successModal.classList.add('active');
}

function triggerSimQR() {
  const scanAmount = 45.20;

  if (currentBalance < scanAmount) {
    alert("Insufficient funds for QR checkout.");
    return;
  }

  // Balance Update
  currentBalance -= scanAmount;
  updatePhoneBalanceUI();

  // Log Transaction
  addSimulatorTransaction('Cafe Coffee House', -scanAmount, 'Scan checkout');

  // Launch Success modal
  const successModal = document.getElementById('phone-sim-success');
  const successTitle = document.getElementById('phone-success-title');
  const successMsg = document.getElementById('phone-success-message');

  successTitle.textContent = "Payment Cleared";
  successMsg.innerHTML = `Paid <strong>$${scanAmount.toFixed(2)}</strong> via merchant QR scan`;
  successModal.classList.add('active');
}

function paySimBill(btn, company, amount) {
  if (currentBalance < amount) {
    alert("Insufficient balance to pay invoice.");
    return;
  }

  // Subtraction
  currentBalance -= amount;
  updatePhoneBalanceUI();

  // Change invoice button status
  btn.disabled = true;
  btn.textContent = "Paid";
  btn.style.backgroundColor = 'var(--success)';
  btn.style.color = '#ffffff';
  btn.style.borderColor = 'var(--success)';

  // Log history
  addSimulatorTransaction(company, -amount, 'Utility Payment');

  // Screen pop
  const successModal = document.getElementById('phone-sim-success');
  const successTitle = document.getElementById('phone-success-title');
  const successMsg = document.getElementById('phone-success-message');

  successTitle.textContent = "Invoice Settled";
  successMsg.innerHTML = `Dispatched <strong>$${amount.toFixed(2)}</strong> to ${company}`;
  successModal.classList.add('active');
}

function updatePhoneBalanceUI() {
  const label = document.getElementById('phone-wallet-balance');
  if (label) {
    label.textContent = `$${currentBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  }
}

function addSimulatorTransaction(party, amount, type) {
  const txList = document.getElementById('phone-sim-tx-list');
  if (!txList) return;

  const item = document.createElement('div');
  item.className = 'phone-tx-item';

  const isPos = amount > 0;
  const amtFormatted = (isPos ? '+' : '') + amount.toFixed(2);

  item.innerHTML = `
    <div class="phone-tx-left">
      <div class="phone-tx-icon-wrap ${!isPos ? 'negative' : ''}">
        <i data-lucide="${isPos ? 'arrow-down-left' : 'arrow-up-right'}" size="12"></i>
      </div>
      <div class="phone-tx-details">
        <h4>${party}</h4>
        <p>Just now, ${type}</p>
      </div>
    </div>
    <div class="phone-tx-right">
      <span class="phone-tx-amount ${!isPos ? 'negative' : ''}">${amtFormatted}</span>
      <div class="phone-tx-status">Completed</div>
    </div>
  `;

  // Prepend to transaction list
  txList.insertBefore(item, txList.firstChild);
  
  // Re-render Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons({
      attrs: {
        size: 12
      },
      nameAttr: 'data-lucide'
    });
  }
}

function closeSimSuccess() {
  const successModal = document.getElementById('phone-sim-success');
  successModal.classList.remove('active');
}

// Biometric & Card Freeze Switches
function toggleSimBiometrics(slider) {
  const securityInfo = document.querySelector('.phone-security-info p');
  if (slider.checked) {
    securityInfo.textContent = "All biometric validations operate locally on devices. Safe & sandbox restricted.";
    securityInfo.style.color = "#a7f3d0";
  } else {
    securityInfo.textContent = "Security shield warnings: Biometric logs deactivated. PIN validation required.";
    securityInfo.style.color = "#fca5a5";
  }
}

function toggleSimFreeze(slider) {
  const walletCard = document.querySelector('.phone-wallet-card');
  if (slider.checked) {
    walletCard.style.background = 'linear-gradient(135deg, #475569 0%, #1e293b 100%)';
    walletCard.style.opacity = '0.75';
    // Add "FROZEN" visual overlay
    const freezeTag = document.createElement('div');
    freezeTag.id = 'card-frozen-tag';
    freezeTag.style.position = 'absolute';
    freezeTag.style.top = '50%';
    freezeTag.style.left = '50%';
    freezeTag.style.transform = 'translate(-50%, -50%) rotate(-10deg)';
    freezeTag.style.backgroundColor = '#ef4444';
    freezeTag.style.color = 'white';
    freezeTag.style.padding = '4px 12px';
    freezeTag.style.borderRadius = '4px';
    freezeTag.style.fontSize = '0.75rem';
    freezeTag.style.fontWeight = '800';
    freezeTag.style.border = '2px solid white';
    freezeTag.textContent = 'FROZEN';
    walletCard.appendChild(freezeTag);
  } else {
    walletCard.style.background = '';
    walletCard.style.opacity = '';
    const tag = document.getElementById('card-frozen-tag');
    if (tag) tag.remove();
  }
}

// Reset contact form
function resetContactForm() {
  const contactForm = document.getElementById('contact-form');
  const successContainer = document.getElementById('form-success-container');
  const submitBtn = contactForm.querySelector('.contact-submit-btn');

  successContainer.classList.remove('active');
  contactForm.reset();
  contactForm.style.display = 'block';
  submitBtn.disabled = false;
  submitBtn.innerHTML = 'Send Secure Message <i data-lucide="send-active" size="18"></i>';
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}
