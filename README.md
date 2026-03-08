# Avacado Monorepo Setup Guide

This repository contains two frontend apps:

- `avacado_browser` (browser/web app)
- `mobile` (mobile-focused app)

Both apps use a local SDK package (`packages/ac-eerc-sdk`) and require environment variables before running.

## Prerequisites

- Node.js 18+
- npm 9+

---

## 1) Setup `avacado_browser`

### A. Install dependencies

```bash
cd avacado_browser
npm install
cd ../..
```

### B. Add environment file

Copy the example file and set real values:

```bash
cp .env.example .env
```

Required env key:

- `VITE_REOWN_PROJECT_ID`

### C. Run in development

```bash
npm run dev
```

---

## 2) Setup `mobile`

### A. Install dependencies

```bash
cd mobile
npm install
cd ../..
```

### B. Add environment file

Copy the example file and set real values:

```bash
cp .env.example .env
```

Required env key:

- `VITE_REOWN_PROJECT_ID`

### C. Run in development

```bash
npm run dev
```

---

## Running both apps at the same time

Because both apps are Vite projects, they can conflict on the default port.

Option 1: Run one app at a time.

Option 2: Run both with different ports (example):

```bash
# Terminal 1
cd avacado_browser
npm run dev -- --port 5173

# Terminal 2
cd mobile
npm run dev -- --port 5174
```

---

## Build commands

From each app folder:

```bash
npm run build
npm run preview
```

---

## Notes

- Always create `.env` from `.env.example` before starting either app.
