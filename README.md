# AuraCommerce Enterprise Web Platform

An enterprise-grade, high-performance E-Commerce platform built completely from standard vanilla web and Node.js APIs (`node:http`, `node:crypto`, `node:fs`, `node:path`, `node:events`).

**Zero Third-Party Packages • Zero GPL/Apache Dependencies • 100% Pure Architecture**

---

## 🌟 Key Architecture & Features

### 1. Zero-Dependency Core Backend Engine
- **Custom Router & HTTP Framework**: Regex route compiler with dynamic parameters (`:id`, `:slug`), nested sub-routing, middleware pipeline, and centralized error interceptors.
- **In-Memory Transactional Database**: High-speed document engine with multi-key indexing, MongoDB-style filter operators (`$gt`, `$lt`, `$in`, `$regex`, etc.), atomic commits, Write-Ahead Logging (`store.wal`), and snapshot persistence (`store.json`).
- **Security & Cryptography**:
  - PBKDF2 password hashing with 16-byte random salts and constant-time buffer comparison.
  - Stateless HMAC-SHA256 session and authorization tokens.
  - Sliding-window in-memory IP rate limiter.
  - HTML input sanitization defense against Stored and Reflected XSS.

### 2. Domain-Driven Commerce Services
- **Product Catalog & Inventory**: Multi-category taxonomy, SKU generator, dynamic stock reservations, out-of-stock guards, and low-inventory warnings.
- **Multi-Faceted Search Engine**: Full-text and keyword fuzzy token matching, price sliders, category filtering, rating filters, and multi-field sorting.
- **Cart & Promotion Engine**: Guest session carts and persistent customer accounts, voucher validation (`WELCOME10`, `SAVE20`, `FREESHIP`, `TECH50`), tiered discounts, automated tax calculation (8.25%), and free shipping threshold checks ($75).
- **Checkout & Order Processing**: State machine transitions (`pending` → `processing` → `shipped` → `delivered`), mock payment gateway with test card simulations, live tracking updates, and printable invoices.
- **Recommendation & Review Engine**: Content-based filtering, "Frequently Bought Together" co-occurrence analysis, verified buyer review checks, and helpfulness voting.
- **Admin Operations & Analytics**: Real-time KPI summaries, interactive SVG sales velocity charts, product inventory CRUD, and order fulfillment status updates.

### 3. Responsive Vanilla Client SPA
- **Modern CSS Design System**: CSS custom properties, responsive fluid typography, glassmorphism headers, responsive grids, and accessible dialogs.
- **Single Page Application (SPA)**: Custom hash router, Pub/Sub state store (`StateStore`), slide-over shopping bag drawer, multi-step checkout wizard, user account portal, and admin management console.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v16.0.0 or higher) - standard installation only, no npm dependencies required.

### 1. Launch the Server
```bash
node server/app.js
```
The server will start at `http://127.0.0.1:3000`.

### 2. Run the Automated Test Suite
```bash
node server/tests/suite.test.js
```

---

## 🔑 Pre-Configured Accounts & Credentials

| Role | Email | Password | Access |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@ecommerce.local` | `AdminSecret2026!` | Full Admin Console & Analytics |
| **Demo Customer** | `sarah.j@example.com` | `DemoPassword123!` | Storefront, Orders, Reviews |
| **Demo Customer 2** | `alex.rivera@example.com` | `DemoPassword123!` | Storefront, Orders |

---

## 🎟️ Active Promotional Discount Codes

- `WELCOME10` — 10% off orders over $50 (Max $30 discount)
- `SAVE20` — $20 flat discount on orders over $150
- `FREESHIP` — Free standard shipping on any order
- `TECH50` — $50 instant discount on orders over $300

---

## 📁 Project Structure

```
e:/Ecommerce/
├── server/
│   ├── app.js                       # HTTP server & SPA fallback
│   ├── config.js                    # System & commerce configuration
│   ├── core/
│   │   ├── router.js                # Custom regex HTTP router
│   │   ├── http-context.js          # Request/response wrapper & parsers
│   │   ├── security.js              # PBKDF2 hashing, HMAC tokens, rate limiting
│   │   └── event-bus.js             # PubSub system event dispatcher
│   ├── db/
│   │   ├── database.js              # In-memory document DB with WAL & persistence
│   │   ├── schema.js                # Validation schemas & indexes
│   │   └── seeder.js                # Initial high-fidelity catalog seed data
│   ├── services/                    # Business logic & calculations
│   │   ├── auth-service.js
│   │   ├── product-service.js
│   │   ├── search-service.js
│   │   ├── cart-service.js
│   │   ├── pricing-service.js
│   │   ├── order-service.js
│   │   ├── review-service.js
│   │   ├── recommendation-service.js
│   │   ├── notification-service.js
│   │   └── analytics-service.js
│   ├── controllers/                 # REST API endpoints
│   └── tests/                       # Custom test runner & integration tests
│       ├── test-runner.js
│       └── suite.test.js
└── public/                          # Client-side Single Page Application
    ├── index.html                   # Shell layout
    ├── css/                         # Custom design system
    │   ├── base.css
    │   ├── components.css
    │   ├── storefront.css
    │   ├── checkout.css
    │   └── admin.css
    └── js/                          # Modular Vanilla JS
        ├── utils.js
        ├── state.js
        ├── api.js
        ├── components/
        └── views/
```
