// ================================================================
// OPERION SYSTEMS LTD — app.js
// All API calls, Stripe integration, UI logic.
// Matches OPERION-CORE v2.0 webhook endpoints exactly.
// ================================================================

// ── CONFIGURATION ───────────────────────────────────────────────
const OPERION = {
  BASE_URL: 'https://YOUR-N8N-INSTANCE.com',
  SECRET:   'YOUR-NETLIFY-WEBHOOK-SECRET',
  PATHS: {
    ONBOARD:         '/webhook/operion/onboard',
    DASHBOARD:       '/webhook/operion/dashboard',
    TIER_CHECK:      '/webhook/operion/tier/check',
    DEMO_REQUEST:    '/webhook/operion/demo-request',
    HEALTH:          '/webhook/operion/health',
    KB_ADD:          '/webhook/operion/kb/add',
    KB_SEARCH:       '/webhook/operion/kb/search',
    ADMIN_RECS:      '/webhook/operion/admin/recommendations',
    MARKETPLACE:     '/webhook/operion/marketplace',
  },
  STRIPE: {
    PUBLISHABLE_KEY: 'pk_live_YOUR_STRIPE_PUBLISHABLE_KEY',
    PRICES: {
      TIER_1: 'price_TIER1_ID',
      TIER_2: 'price_TIER2_ID',
      TIER_3: 'price_TIER3_ID',
      TIER_4: 'price_TIER4_ID',
    },
    BILLING_PORTAL: 'https://billing.stripe.com/p/login/YOUR_PORTAL_LINK',
    SUCCESS_URL:    '/get-started?paid=true',
    CANCEL_URL:     '/pricing',
  },
  TIERS: {
    1: { name: 'Starter',    price: 79,  rate: '500 enquiries/hr' },
    2: { name: 'Growth',     price: 149, rate: '2,000 enquiries/hr' },
    3: { name: 'Scale',      price: 249, rate: '5,000 enquiries/hr' },
    4: { name: 'Enterprise', price: 399, rate: 'Unlimited' },
  }
};

// ── UTILITY FUNCTIONS ────────────────────────────────────────────
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

async function apiCall(path, options = {}) {
  const url = OPERION.BASE_URL + path;
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err.message };
  }
}

function showAlert(container, message, type = 'info') {
  if (!container) return;
  const icons = { info: 'ℹ', success: '✓', error: '✗', warning: '⚠' };
  container.innerHTML = `
    <div class="alert alert-${type === 'success' ? 'success' : type === 'error' ? 'error' : 'info'}">
      <span>${icons[type] || icons.info}</span>
      <span>${message}</span>
    </div>`;
}

function setLoading(btn, loading, text = '') {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = `<span class="spinner"></span> ${text || 'Processing...'}`;
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || text;
  }
}

// ── NAVIGATION ───────────────────────────────────────────────────
function initNav() {
  const burger = $('.nav-burger');
  const links = $('.nav-links');
  if (burger && links) burger.addEventListener('click', () => links.classList.toggle('open'));

  const path = window.location.pathname;
  $$('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === path || (path === '/' && a.getAttribute('href') === 'index.html')) {
      a.classList.add('active');
    }
  });

  window.addEventListener('scroll', () => {
    const nav = $('.nav');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// ── STRIPE CHECKOUT ──────────────────────────────────────────────
async function initStripe() {
  if (typeof Stripe === 'undefined') return;
  const stripe = Stripe(OPERION.STRIPE.PUBLISHABLE_KEY);

  $$('[data-checkout-tier]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tier = parseInt(btn.dataset.checkoutTier);
      const priceKey = `TIER_${tier}`;
      const priceId = OPERION.STRIPE.PRICES[priceKey];
      if (!priceId || priceId.startsWith('price_TIER')) {
        alert('Stripe is not yet configured. Please contact us to subscribe.');
        return;
      }
      setLoading(btn, true, 'Redirecting...');
      try {
        const { error } = await stripe.redirectToCheckout({
          lineItems: [{ price: priceId, quantity: 1 }],
          mode: 'subscription',
          successUrl: window.location.origin + OPERION.STRIPE.SUCCESS_URL + '&tier=' + tier,
          cancelUrl: window.location.origin + OPERION.STRIPE.CANCEL_URL,
        });
        if (error) throw error;
      } catch (err) {
        setLoading(btn, false);
        alert('Error: ' + err.message);
      }
    });
  });

  $$('[data-billing-portal]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = OPERION.STRIPE.BILLING_PORTAL;
    });
  });
}

// ── DEMO REQUEST FORM (UPDATED) ──────────────────────────────────
function initDemoForm() {
  const form = $('#demo-form');
  if (!form) return;

  const submitBtn = $('#demo-submit');
  const responseEl = $('#demo-response');
  const fields = ['business_name','owner_name','owner_email','owner_phone','business_type','interested_tier','message'];

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(submitBtn, true, 'Sending...');

    const payload = {};
    fields.forEach(f => {
      const el = form.querySelector(`[name="${f}"]`);
      payload[f] = el ? el.value.trim() : '';
    });

    // Add Operion secret for internal tracking
    payload.operion_secret = OPERION.SECRET;

    const result = await apiCall(OPERION.PATHS.DEMO_REQUEST, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    setLoading(submitBtn, false);

    if (result.ok) {
      showAlert(responseEl, 'Thank you. We\'ve received your request and will be in touch within one business day.', 'success');
      form.reset();
    } else {
      showAlert(responseEl, 'Something went wrong. Please email us directly at operionautomation@gmail.com', 'error');
    }
  });
}

// ── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initStripe();
  initDemoForm();
});
