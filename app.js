// ================================================================
// OPERION SYSTEMS LTD — app.js
// All API calls, Stripe integration, UI logic.
// Matches OPERION-CORE v2.0 webhook endpoints exactly.
// ================================================================

// ── CONFIGURATION ───────────────────────────────────────────────
// Replace these values with your actual details before going live.
const OPERION = {
  BASE_URL: 'https://YOUR-N8N-INSTANCE.com',   // Your n8n domain
  SECRET:   'YOUR-NETLIFY-WEBHOOK-SECRET',      // Matches admin_config.netlify_webhook_secret

  // ── API ENDPOINTS (v2.0) ─────────────────────────────────────
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

  // ── STRIPE ───────────────────────────────────────────────────
  STRIPE: {
    PUBLISHABLE_KEY: 'pk_live_YOUR_STRIPE_PUBLISHABLE_KEY',
    PRICES: {
      TIER_1: 'price_TIER1_ID',   // £79/month — Starter
      TIER_2: 'price_TIER2_ID',   // £149/month — Growth
      TIER_3: 'price_TIER3_ID',   // £249/month — Scale
      TIER_4: 'price_TIER4_ID',   // £399/month — Enterprise
    },
    BILLING_PORTAL: 'https://billing.stripe.com/p/login/YOUR_PORTAL_LINK',
    SUCCESS_URL:    '/get-started?paid=true',
    CANCEL_URL:     '/pricing',
  },

  // ── TIER CONFIG ──────────────────────────────────────────────
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
  // Highlight active page
  const path = window.location.pathname;
  $$('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === path || (path === '/' && a.getAttribute('href') === 'index.html')) {
      a.classList.add('active');
    }
  });
  // Scroll behaviour
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

  // Billing portal button
  $$('[data-billing-portal]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = OPERION.STRIPE.BILLING_PORTAL;
    });
  });
}

// ── ONBOARDING FORM ──────────────────────────────────────────────
function initOnboardingForm() {
  const form = $('#onboarding-form');
  if (!form) return;

  // FAQ builder
  let faqCount = 0;
  const faqContainer = $('#faq-container');
  const addFaqBtn = $('#add-faq');

  function addFaqRow(q = '', a = '') {
    faqCount++;
    const row = document.createElement('div');
    row.className = 'faq-row';
    row.innerHTML = `
      <div class="form-group">
        <label class="form-label">Question ${faqCount}</label>
        <input type="text" class="form-input faq-q" placeholder="e.g. What areas do you cover?" value="${q}">
      </div>
      <div class="form-group">
        <label class="form-label">Answer</label>
        <textarea class="form-textarea faq-a" rows="2" placeholder="Your answer...">${a}</textarea>
      </div>
      <button type="button" class="btn btn-ghost btn-sm remove-faq" style="align-self:flex-end">Remove</button>
    `;
    row.querySelector('.remove-faq').addEventListener('click', () => { row.remove(); });
    faqContainer.appendChild(row);
  }

  if (addFaqBtn) addFaqBtn.addEventListener('click', () => addFaqRow());

  // Check for paid=true in URL (from Stripe redirect)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('paid') === 'true') {
    const notice = $('#payment-notice');
    if (notice) {
      notice.style.display = 'block';
      notice.innerHTML = `<div class="alert alert-success">✓ Payment confirmed. Please complete your business profile below to activate your account.</div>`;
    }
  }

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = $('#onboard-submit');
    const responseEl = $('#onboard-response');
    setLoading(submitBtn, true, 'Activating...');

    // Collect FAQs
    const faqs = [];
    $$('.faq-row', faqContainer).forEach(row => {
      const q = row.querySelector('.faq-q')?.value?.trim();
      const a = row.querySelector('.faq-a')?.value?.trim();
      if (q && a) faqs.push({ question: q, answer: a });
    });

    const formData = new FormData(form);
    const payload = {
      operion_secret: OPERION.SECRET,
      business_name: formData.get('business_name'),
      owner_name: formData.get('owner_name'),
      owner_email: formData.get('owner_email'),
      owner_phone: formData.get('owner_phone'),
      business_type: formData.get('business_type'),
      brand_voice: formData.get('brand_voice'),
      services: formData.get('services'),
      operating_hours: formData.get('operating_hours'),
      smtp_host: formData.get('smtp_host'),
      smtp_port: formData.get('smtp_port') || '587',
      smtp_user: formData.get('smtp_user'),
      smtp_pass: formData.get('smtp_pass'),
      smtp_from_email: formData.get('smtp_from_email'),
      smtp_from_name: formData.get('smtp_from_name'),
      escalation_email: formData.get('escalation_email'),
      emergency_contact: formData.get('emergency_contact'),
      website: formData.get('website'),
      custom_instructions: formData.get('custom_instructions'),
      response_persona: formData.get('response_persona'),
      faqs: JSON.stringify(faqs),
    };

    const result = await apiCall(OPERION.PATHS.ONBOARD, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    setLoading(submitBtn, false);

    if (result.ok && result.data?.status === 'onboarded') {
      // Redirect to success page with business details
      const params = new URLSearchParams({
        bid: result.data.business_id,
        key: result.data.dashboard_api_key,
        name: result.data.business_name,
        tier: result.data.subscription_tier,
      });
      window.location.href = '/onboard-success.html?' + params.toString();
    } else if (result.data?.status === 'already_registered') {
      showAlert(responseEl, 'This email address is already registered. Please log in to your dashboard or contact us if you need help.', 'error');
    } else {
      showAlert(responseEl, result.data?.message || 'Something went wrong. Please try again or contact us.', 'error');
    }
  });
}

// ── DEMO REQUEST FORM ────────────────────────────────────────────
function initDemoForm() {
  const form = $('#demo-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#demo-submit');
    const responseEl = $('#demo-response');
    setLoading(btn, true, 'Sending...');

    const formData = new FormData(form);
    const result = await apiCall(OPERION.PATHS.DEMO_REQUEST, {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData))
    });

    setLoading(btn, false);

    if (result.ok) {
      showAlert(responseEl, 'Thank you. We\'ve received your request and will be in touch within one business day.', 'success');
      form.reset();
    } else {
      showAlert(responseEl, 'Something went wrong. Please email us directly at operionautomation@gmail.com', 'error');
    }
  });
}

// ── DASHBOARD ────────────────────────────────────────────────────
async function initDashboard() {
  const dashContainer = $('#dashboard-content');
  if (!dashContainer) return;

  // Get credentials from URL or localStorage
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

    // Header
    const nameEl = $('#dash-business-name');
    const tierEl = $('#dash-tier');
    if (nameEl) nameEl.textContent = d.business_name || '';
    if (tierEl) tierEl.innerHTML = `<span class="badge badge-cyan">${tierName}</span>`;

    // Stats (all tiers)
    if (d.stats) {
      const s = d.stats;
      setEl('#stat-enq-24h', s.enquiries_24h ?? '—');
      setEl('#stat-enq-7d', s.enquiries_7d ?? '—');
      setEl('#stat-responded', s.responded_7d ?? '—');
      setEl('#stat-failed', s.failed_7d ?? '—');
      setEl('#stat-escalated', s.escalated_7d ?? '—');
      setEl('#stat-response-rate', s.response_rate_7d != null ? s.response_rate_7d + '%' : '—');
    }

    // Alerts (all tiers)
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

    // HIVE (Tier 2+)
    const hiveSection = $('#dash-hive');
    if (hiveSection) {
      hiveSection.style.display = tier >= 2 ? 'block' : 'none';
      if (tier >= 2 && d.hive) {
        setEl('#hive-patterns', d.hive.patterns_detected_30d ?? '—');
        setEl('#hive-pending-recs', d.hive.pending_recommendations ?? '—');
        const patternsEl = $('#hive-pattern-list');
        if (patternsEl && d.hive.top_patterns?.length) {
          patternsEl.innerHTML = d.hive.top_patterns.map(p => `
            <div class="card" style="padding:1rem;margin-bottom:8px">
              <div class="badge badge-cyan" style="margin-bottom:8px">${p.type.replace(/_/g,' ')}</div>
              <p style="font-size:0.85rem;color:var(--white-dim)">${p.description}</p>
            </div>`).join('');
        } else if (patternsEl) {
          patternsEl.innerHTML = '<p class="text-dim" style="font-size:0.85rem">No patterns detected yet</p>';
        }
      }
    }

    // Analytics (Tier 3+)
    const analyticsSection = $('#dash-analytics');
    if (analyticsSection) {
      analyticsSection.style.display = tier >= 3 ? 'block' : 'none';
      if (tier >= 3 && d.analytics) {
        const a = d.analytics;
        setEl('#analytics-quality', a.avg_response_quality ? a.avg_response_quality + '/100' : '—');
        setEl('#analytics-response-time', a.avg_response_time_seconds ? a.avg_response_time_seconds + 's' : '—');
        const clsEl = $('#analytics-classifications');
        if (clsEl && a.classification_breakdown) {
          const entries = Object.entries(a.classification_breakdown).sort((x,y) => y[1]-x[1]);
          clsEl.innerHTML = entries.map(([k,v]) => `
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:0.85rem;text-transform:capitalize">${k.replace(/_/g,' ')}</span>
              <span class="text-mono" style="color:var(--cyan)">${v}</span>
            </div>`).join('');
        }
      }
    }

    // Enterprise (Tier 4)
    const enterpriseSection = $('#dash-enterprise');
    if (enterpriseSection) {
      enterpriseSection.style.display = tier >= 4 ? 'block' : 'none';
      if (tier >= 4 && d.enterprise) {
        const e = d.enterprise;
        setEl('#ent-kb-count', e.kb_entries ?? '—');
        setEl('#ent-vector-count', e.vector_entries ?? '—');
        setEl('#ent-queue', e.queue_pending ?? '—');
        setEl('#ent-health', (d.enterprise?.system_health_score ?? '—') + (typeof d.enterprise?.system_health_score === 'number' ? '/100' : ''));
        const payEl = $('#ent-payments');
        if (payEl && e.payment_history?.length) {
          payEl.innerHTML = e.payment_history.slice().reverse().map(p => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:0.82rem;color:var(--white-dim)">${new Date(p.date).toLocaleDateString('en-GB')}</span>
              <span class="badge badge-${p.status==='succeeded'?'green':'red'}">${p.status}</span>
              <span class="text-mono" style="color:var(--cyan)">£${p.amount}</span>
            </div>`).join('');
        }
      }
    }

    // Tier upgrade prompts
    $$('.tier-upgrade-prompt').forEach(el => {
      const requiredTier = parseInt(el.dataset.requiredTier);
      el.style.display = tier < requiredTier ? 'block' : 'none';
    });
  }

  function setEl(selector, value) {
    const el = $(selector);
    if (el) el.textContent = value;
  }

  // Login form
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

  // Logout
  const logoutBtn = $('#dashboard-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('operion_biz_id');
      localStorage.removeItem('operion_api_key');
      if (loginForm) loginForm.style.display = 'block';
      if (dashView) dashView.style.display = 'none';
    });
  }

  // Auto-load if credentials exist
  if (bizId && apiKey) {
    await loadDashboard(bizId, apiKey);
  } else if (loginForm) {
    loginForm.style.display = 'block';
  }
}

// ── ONBOARD SUCCESS PAGE ─────────────────────────────────────────
function initOnboardSuccess() {
  const params = new URLSearchParams(window.location.search);
  const bid = params.get('bid');
  const key = params.get('key');
  const name = params.get('name');
  const tier = params.get('tier');

  if (!bid) return;

  const setEl = (sel, val) => { const el = $(sel); if(el) el.textContent = val; };
  setEl('#success-business-name', name || 'Your Business');
  setEl('#success-bid', bid);
  setEl('#success-key', key);
  setEl('#success-tier', OPERION.TIERS[tier]?.name || 'Starter');

  const dashLink = $('#success-dash-link');
  if (dashLink && bid && key) {
    dashLink.href = `/dashboard.html?business_id=${encodeURIComponent(bid)}&api_key=${encodeURIComponent(key)}`;
  }

  // Copy button
  $$('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.copy;
      const el = $(target);
      if (el) {
        navigator.clipboard.writeText(el.textContent.trim()).then(() => {
          const orig = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => btn.textContent = orig, 2000);
        });
      }
    });
  });
}

// ── ANIMATED COUNTERS ────────────────────────────────────────────
function initCounters() {
  const counters = $$('[data-count]');
  if (!counters.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const duration = 1500;
      const start = performance.now();
      const initial = 0;
      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = (initial + (target - initial) * eased).toFixed(el.dataset.decimals || 0) + suffix;
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
      observer.unobserve(el);
    });
  }, { threshold: 0.3 });
  counters.forEach(c => observer.observe(c));
}

// ── SCROLL ANIMATIONS ────────────────────────────────────────────
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-up');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  $$('[data-animate]').forEach(el => observer.observe(el));
}

// ── TICKER TAPE ──────────────────────────────────────────────────
function initTicker() {
  const ticker = $('.ticker-inner');
  if (!ticker) return;
  const items = ['Emergency enquiry handled', 'Booking confirmed', 'Complaint resolved', 'Quote delivered', 'HIVE pattern detected', 'Prompt updated', 'New business onboarded', 'Payment confirmed', 'Self-test passed', 'Knowledge base updated'];
  const channels = ['email', 'webhook', 'web form', 'API', 'CRM'];
  let html = '';
  for (let i = 0; i < 3; i++) {
    items.forEach(item => {
      const ch = channels[Math.floor(Math.random() * channels.length)];
      html += `<span class="ticker-item"><span class="ticker-dot"></span>${item} <span class="ticker-meta">via ${ch}</span></span>`;
    });
  }
  ticker.innerHTML = html;
}

// ── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initStripe();
  initOnboardingForm();
  initDemoForm();
  initDashboard();
  initOnboardSuccess();
  initCounters();
  initScrollAnimations();
  initTicker();
});
