# Book Store — Admin Dashboard

Separate Vite + React app for Administrators (merchants).

## Run

```bash
cd Dashboard
cp .env.example .env
npm install
npm run dev
```

Opens on **http://localhost:5174**

Requires Backend at `http://localhost:5000` (`VITE_API_URL`).

## Pages

| Route | Page |
|---|---|
| `/login`, `/register` | Reusable auth (`AuthShell` + `AuthForm`) |
| `/` | Analytics — revenue, top customers, charts |
| `/inventory` | Product inventory |
| `/inventory/new`, `/inventory/:id` | Product create / detail |
| `/orders`, `/orders/:id` | Order management + receipt |
| `/billing` | Billing, refunds, receipts |
| `/discounts` | Coupon CRUD |
| `/settings` | Logo, theme, contact, website content CMS |

## Structure

```
Dashboard/src/
  components/auth/     # Reusable Login/SignUp UI
  components/common/   # Button, Input, Badge, ...
  components/layout/   # Sidebar, Topbar
  components/charts/
  features/auth/
  pages/
  services/
  store/
  routes/
  layouts/
```
