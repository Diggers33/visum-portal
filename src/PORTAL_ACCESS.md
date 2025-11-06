# Visum® Distribution Portal - Access Guide

This application contains **TWO separate portals**:

## 🔵 Distributor Portal (Blue/Cyan Theme)
**Purpose:** Content hub for distributors to access products, marketing materials, documentation, and training

**Access:**
- Login URL: `/login`
- After login, redirects to: `/dashboard`

**Pages:**
- What's New (landing page) - `/dashboard`
- Products - `/products`
- Marketing Assets - `/marketing-assets`
- Documentation - `/documentation`
- Training Center - `/training`
- My Account - `/account`

**Color Scheme:** Cyan accent (#00a8b5)

---

## 🔴 Admin Portal (Red/Orange Theme)
**Purpose:** IRIS staff interface to manage distributors, content, and communications

**Access:**
- Login URL: `/admin/login`
- After login, redirects to: `/admin/dashboard`

**Pages:**
- Dashboard (overview & stats) - `/admin/dashboard`
- Distributors Management - `/admin/distributors`
- Products Management - `/admin/products`
- Documentation Management - `/admin/documentation`
- Marketing Assets Management - `/admin/marketing`
- Training Content Management - `/admin/training`
- Announcements Management - `/admin/announcements`
- Analytics - `/admin/analytics`
- Territories Management - `/admin/territories`

**Color Scheme:** Red accent (#ef4444)

---

## Quick Start

### To access Distributor Portal:
1. Go to `/login`
2. Enter any email/password (demo mode)
3. Click "Sign in"
4. You'll land on "What's New" page

### To access Admin Portal:
1. Go to `/admin/login`
2. Enter any email/password (demo mode)
3. Click "Sign in"
4. You'll land on Admin Dashboard

---

## Key Features

### Distributor Portal:
- Browse product catalog with detailed product pages
- Access marketing materials (brochures, photos, videos)
- Download technical documentation
- View training materials
- See latest announcements from IRIS
- Manage account settings

### Admin Portal:
- Add/edit/delete distributor accounts
- Manage product catalog (CRUD operations)
- Upload/organize documentation
- Upload/organize marketing assets
- Upload/organize training materials
- Create announcements that appear in distributor "What's New"
- View analytics and engagement metrics
- Assign territories to distributors

---

## Authentication

Both portals use **separate authentication states**:
- Logging into the distributor portal does NOT grant admin access
- Logging into the admin portal does NOT grant distributor access
- Each has its own login page and logout functionality

---

## Design Differences

To avoid confusion between portals:

| Feature | Distributor Portal | Admin Portal |
|---------|-------------------|--------------|
| Accent Color | Cyan (#00a8b5) | Red (#ef4444) |
| Sidebar | Dark blue | Dark navy |
| Badge | "Partner Portal" | "ADMIN MODE" |
| Primary Button | Cyan | Red |
| Icon | Dashboard grid | Bell (What's New) |

---

## File Structure

```
/components/
├── LoginPage.tsx              # Distributor login
├── DashboardLayout.tsx        # Distributor layout
├── WhatsNew.tsx               # Distributor "What's New"
├── ProductCatalog.tsx         # Distributor products
├── ProductDetail.tsx          # Distributor product detail
├── MarketingAssets.tsx        # Distributor marketing
├── TechnicalDocs.tsx          # Distributor docs
├── TrainingCenter.tsx         # Distributor training
├── MyAccount.tsx              # Distributor account
└── admin/
    ├── AdminLoginPage.tsx            # Admin login
    ├── AdminLayout.tsx               # Admin layout
    ├── AdminDashboard.tsx            # Admin overview
    ├── DistributorsManagement.tsx    # Manage distributors
    ├── ProductsManagement.tsx        # Manage products
    ├── DocumentationManagement.tsx   # Manage docs
    ├── MarketingManagement.tsx       # Manage marketing
    ├── TrainingManagement.tsx        # Manage training
    ├── AnnouncementsManagement.tsx   # Manage announcements
    ├── AnalyticsPage.tsx             # View analytics
    └── TerritoriesManagement.tsx     # Manage territories
```

---

## Development Notes

- Both portals share the same UI components (`/components/ui/`)
- Both use the same branding (Visum® by IRIS Technology)
- Content created in admin portal would appear in distributor portal
- All data is currently mock/demo data
- No backend integration yet (frontend only)
