# Operion Systems Ltd — Website Repository

This repository contains the complete front-end website for Operion Systems Ltd, the managed AI enquiry handling platform.

## Repository Structure

```
operion-website/
├── index.html              # Homepage
├── how-it-works.html       # Platform architecture and how it works
├── pricing.html            # Pricing tiers and comparison table
├── get-started.html        # Business onboarding form
├── dashboard.html          # Client dashboard (read-only, tier-gated)
├── onboard-success.html    # Post-onboarding confirmation
├── about.html              # About Operion and contact
├── legal.html              # All legal documents (Terms, Privacy, AI Disclaimer, etc.)
├── style.css               # Global stylesheet
├── app.js                  # All JavaScript, API calls, Stripe integration
├── netlify.toml            # Netlify deployment configuration
├── README.md               # This file
└── LICENSE                 # Proprietary licence
```

## Configuration

Before deploying, update `app.js` with your actual values:

```javascript
const OPERION = {
  BASE_URL: 'https://YOUR-N8N-INSTANCE.com',   // Your n8n domain
  SECRET:   'YOUR-NETLIFY-WEBHOOK-SECRET',      // Matches admin_config.netlify_webhook_secret

  STRIPE: {
    PUBLISHABLE_KEY: 'pk_live_YOUR_STRIPE_KEY',
    PRICES: {
      TIER_1: 'price_XXXX',   // £79/month
      TIER_2: 'price_XXXX',   // £149/month
      TIER_3: 'price_XXXX',   // £249/month
      TIER_4: 'price_XXXX',   // £399/month
    },
    BILLING_PORTAL: 'https://billing.stripe.com/p/login/YOUR_LINK',
  }
};
```

Also update `legal.html` and `about.html` with your registered company number and office address once incorporated.

## Deployment (Netlify)

1. Push this repository to GitHub
2. Connect to Netlify: New site → Import from Git
3. Build settings: none required (static site)
4. Publish directory: `.` (root)
5. Deploy

Netlify will automatically use `netlify.toml` for redirects and security headers.

## API Endpoints (Operion v2.0)

This website connects to the following Operion platform endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/webhook/operion/onboard` | POST | Business onboarding |
| `/webhook/operion/dashboard` | GET | Client dashboard data (tier-gated) |
| `/webhook/operion/tier/check` | GET | Tier info |
| `/webhook/operion/demo-request` | POST | Demo enquiry from website |

## Legal

This repository and all its contents are the proprietary property of Operion Systems Ltd.
See LICENSE for full terms.

© 2025 Operion Systems Ltd. All rights reserved.
