// ================================================================
// OPERION SYSTEMS LTD — app.js
// All API calls, Stripe integration, UI logic.
// Matches OPERION-CORE v2.0 webhook endpoints exactly.
// ================================================================

// ── CONFIGURATION ───────────────────────────────────────────────
// Replace these values with your actual details before going live.
const OPERION = {
  BASE_URL: 'https://nonrhymed-elmer-chrysocarpous.ngrok-free.dev',
  SECRET: 'Operion-2026',

  PATHS: {
    DEMO_REQUEST: '/webhook/operion/demo-request',
    ONBOARD: '/webhook/operion/onboard',
    DASHBOARD: '/webhook/operion/dashboard',
    TIER_CHECK: '/webhook/operion/tier/check',
    HEALTH: '/webhook/operion/health',
    KB_ADD: '/webhook/operion/kb/add',
    KB_SEARCH: '/webhook/operion/kb/search',
    ADMIN_RECS: '/webhook/operion/admin/recommendations',
    MARKETPLACE: '/webhook/operion/marketplace',
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
    SUCCESS_URL: '/get-started?paid=true',
    CANCEL_URL: '/pricing',
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
  if (burger && links) {
    burger.addEventListener('click', () => links.classList.toggle('open'));
  }
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

// ── ONBOARDING FORM (stub) ───────────────────────────────────────
function initOnboardingForm() {
  console.log('initOnboardingForm stub called');
}

// ── DEMO REQUEST FORM (stub) ─────────────────────────────────────
function initDemoForm() {
  console.log('initDemoForm stub called');
}

// ── DASHBOARD ────────────────────────────────────────────────────
async function initDashboard() {
  const dashContainer = $('#dashboard-content');
  if (!dashContainer) return;

  const params = new URLSearchParams(window.location.search);
  let bizId = params.get('business_id') || localStorage.getItem('operion_biz_id') || '';
  let apiKey = params.get('api_key') || localStorage.getItem('operion_api_key') || '';

  const loginForm = $('#dashboard-login');
  const dashView = $('#dashboard-view');

  async function loadDashboard(id, key) {
    const result = await apiCall(
      OPERION.PATHS.DASHBOARD + `?business_id=${encodeURIComponent(id)}&api_key=${encodeURIComponent(key)}`
    );

    if (!result.ok || result.data?.status !== 'ok') {
      if (loginForm) loginForm.style.display = 'block';
      if (dashView) dashView.style.display = 'none';
      if (result.data?.status === 'unauthorized') {
        showAlert($('#login-error'), 'Invalid Business ID or API Key.', 'error');
      } else if (result.data?.status === 'suspended') {
        showAlert($('#login-error'), 'Your account is suspended. Please renew your subscription.', 'error');
      }
      return;
    }

    localStorage.setItem('operion_biz_id', id);
    localStorage.setItem('operion_api_key', key);

    if (loginForm) loginForm.style.display = 'none';
    if (dashView) dashView.style.display = 'block';

    renderDashboard(result.data);
  }

  function renderDashboard(d) {
    const tier = d.tier || 1;
    const tierName = d.tier_name || 'Starter';

    const nameEl = $('#dash-business-name');
    const tierEl = $('#dash-tier');
    if (nameEl) nameEl.textContent = d.business_name || '';
    if (tierEl) tierEl.innerHTML = `<span class="badge badge-cyan">${tierName}</span>`;

    if (d.stats) {
      const s = d.stats;
      setEl('#stat-enq-24h', s.enquiries_24h ?? '—');
      setEl('#stat-enq-7d', s.enquiries_7d ?? '—');
      setEl('#stat-responded', s.responded_7d ?? '—');
      setEl('#stat-failed', s.failed_7d ?? '—');
      setEl('#stat-escalated', s.escalated_7d ?? '—');
      setEl('#stat-response-rate', s.response_rate_7d != null ? s.response_rate_7d + '%' : '—');
    }

    const alertsEl = $('#dash-alerts');
    if (alertsEl && d.recent_alerts) {
      if (d.recent_alerts.length === 0) {
        alertsEl.innerHTML = '<p class="text-dim" style="font-size:0.85rem">No unresolved alerts</p>';
      } else {
        alertsEl.innerHTML = d.recent_alerts.map(a => `
          <div class="alert alert-info" style="margin-bottom:8px">
            <span class="text-mono" style="font-size:0.72rem;color:var(--cyan)">[${a.type.replace(/_/g,'·')}]</span>
            <span>${a.message}</span>
          </div>`).join('');
      }
    }
  }

  function setEl(selector, value) {
    const el = $(selector);
    if (el) el.textContent = value;
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = $('#login-bid')?.value?.trim();
      const key = $('#login-key')?.value?.trim();
      if (!id || !key) return;
      const btn = loginForm.querySelector('button[type="submit"]');
      setLoading(btn, true, 'Signing in...');
      await loadDashboard(id, key);
      setLoading(btn, false);
    });
  }

  const logoutBtn = $('#dashboard-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('operion_biz_id');
      localStorage.removeItem('operion_api_key');
      if (loginForm) loginForm.style.display = 'block';
      if (dashView) dashView.style.display = 'none';
    });
  }

  if (bizId && apiKey) {
    await loadDashboard(bizId, apiKey);
  } else if (loginForm) {
    loginForm.style.display = 'block';
  }
}

// ── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initStripe();
  initOnboardingForm();
  initDemoForm();
  initDashboard();
});
