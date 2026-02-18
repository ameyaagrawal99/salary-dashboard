# WPU GŌA Faculty Compensation System

## Overview

This is the **WPU GŌA Faculty Compensation System** — a web application that helps HR teams, finance officers, and university leadership calculate, compare, and plan faculty compensation packages. The system compares UGC (University Grants Commission) standard pay scales against WPU GŌA's enhanced compensation offerings.

The application has three main pages:
1. **Calculator** — Single faculty offer calculation with side-by-side UGC vs WPU GŌA comparison
2. **All Positions Comparison** — Bar/line charts and detailed table comparing all 8 faculty positions for board presentations
3. **Bulk Hiring** — Total cost estimation for hiring multiple faculty across positions

A key feature is the global toggle for applying salary multipliers on either Annual Salary (recommended, keeps basic pay at UGC levels to control future DA/HRA liabilities) or Basic Pay (inflates basic pay for higher immediate salary but increases future costs).

### Recent Changes (Feb 2026)
- Settings v5: per-position salary ranges (min/max), auto-computed CTC ranges, enforcement mode, housing/HRA config
- Default: Housing provided by university, No HRA (providingHousing=true, stillProvideHra=false)
- Default WPU salary ranges: Asst Prof 15L-23L, Assoc Prof 22L-32L, Prof 32L-42L
- CTC ranges auto-computed from salary range + position benefits (shown in settings)
- Enforcement modes: Soft Warning (color warnings when exceeding ranges) and Hard Stop (auto-cap at maximums)
- Housing provision toggle: if providing housing, choose to still pay HRA (percentage or lump sum) or no HRA
- HRA config now correctly applies to WPU calculations only (both methodA and methodB); UGC baseline unaffected
- Per-position premium ranges configurable in settings with min/max annual amounts
- EnforcementStatus tracking: salaryCapped, salaryBelowMin, ctcCapped, premium range violations
- HRA mode tracked in breakdown: 'percent', 'lumpsum', or 'none' displayed in labels
- Mobile fix: pay cell auto-updates reliably via useEffect when experience changes
- Default multiplier changed from 1.5x to 1.3x
- Default financial strategy changed from 'both' to 'multiplier only' (settings v3)
- Default benefit values updated: Housing (Asst ₹435K, Assoc ₹485K, Prof ₹650K annual), Insurance ₹15K/yr, Prof Dev ₹1L/yr, PPF 12%, Gratuity 4.81%
- Monthly/Annual toggle added for benefits input (default: annual) and salary breakdown display
- Position filter added to All Positions Comparison page with quick presets
- All Positions Comparison defaults to hiding Principal positions (shows only Asst/Assoc/Prof levels)
- UI overhauled: refined indigo color palette, muted chart colors, better spacing/hierarchy
- Benefits stored internally as monthly; annual toggle multiplies by 12 for display, divides by 12 on input
- Settings versioning system (v5) added to automatically clear stale localStorage when defaults change
- Salary comparison updated from 2-column to 3-column: UGC, WPU GOA Salary (before benefits), WPU GOA CTC (total with benefits)
- Calculator breakdown now has UGC/WPU/Combined tab views for focused single-column or side-by-side comparison
- NumericInput component created to fix backspace/clearing issues in all number inputs
- Mobile UX: Allowances, Financial Strategy, and Benefits sections are collapsible on mobile with summary previews
- Footer includes attribution to Ameya Aghav with LinkedIn and website links
- Font changed from Space Grotesk to Plus Jakarta Sans for more refined, modern appearance
- Color palette refined: warmer cream background (40 25% 97%), deeper indigo primary (232 62% 52%), bluer dark mode (225 18% 7%)
- Typography improvements: page titles text-2xl font-semibold tracking-tight, shadow-sm on header, pill-shaped benefit toggle container

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: React Context API for global settings (`SettingsContext`), local `useState` for page-level state
- **Data Fetching**: TanStack React Query (configured but minimal server interaction — most computation is client-side)
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Charts**: Recharts (bar charts, line charts, pie charts)
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript (compiled with tsx for dev, esbuild for production)
- **API Pattern**: RESTful routes prefixed with `/api` (currently minimal — the app is primarily a client-side calculator)
- **Storage**: In-memory storage class (`MemStorage`) implementing `IStorage` interface with basic user CRUD. The interface pattern allows swapping to database-backed storage.

### Data & Computation
- **Salary Calculations**: All done client-side in `client/src/lib/salary-calculator.ts`
- **UGC Pay Data**: Hardcoded pay matrices, academic levels, DA/HRA rates in `client/src/lib/ugc-data.ts`
- **No server-side calculation endpoints currently** — the app functions as a sophisticated client-side calculator

### Database
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema**: Defined in `shared/schema.ts` — currently has a basic `users` table with id, username, password
- **Migrations**: Drizzle Kit with `db:push` command
- **Connection**: Requires `DATABASE_URL` environment variable
- **Current State**: Database is provisioned but not heavily used — the app primarily does client-side computation. Storage currently uses in-memory `MemStorage`.

### Key Design Patterns
- **Shared Schema**: `shared/schema.ts` is shared between client and server, using Drizzle-Zod for validation schema generation
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`
- **Settings Architecture**: Global settings context manages multiplier method, DA percentage, city type, financial strategy, benefits per position/level, and tooltip preferences
- **Theme System**: Custom ThemeProvider with localStorage persistence, CSS variable-based light/dark modes
- **Component Pattern**: shadcn/ui components in `client/src/components/ui/`, custom components like `InfoTooltip` and `SettingsDialog` at `client/src/components/`

### Build & Deploy
- **Development**: `npm run dev` — runs tsx with Vite dev server middleware (HMR via WebSocket)
- **Production Build**: `npm run build` — Vite builds client to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Production Start**: `npm start` — serves static files from `dist/public` with Express

## External Dependencies

### Core Infrastructure
- **PostgreSQL** — Database (via `DATABASE_URL` env variable), used with Drizzle ORM and `connect-pg-simple` for session storage
- **Drizzle ORM** — Database ORM with PostgreSQL dialect, schema in `shared/schema.ts`

### Frontend Libraries
- **React 18** with TypeScript
- **Vite** — Build tool with HMR
- **TanStack React Query** — Server state management
- **Recharts** — Data visualization (bar, line, pie charts)
- **Radix UI** — Accessible UI primitives (full suite: dialog, select, tabs, tooltip, etc.)
- **shadcn/ui** — Component library built on Radix (new-york style)
- **Tailwind CSS** — Utility-first CSS framework
- **Wouter** — Client-side routing
- **Lucide React** — Icon library
- **class-variance-authority + clsx + tailwind-merge** — Styling utilities

### Backend Libraries
- **Express 5** — HTTP server
- **express-session + connect-pg-simple** — Session management
- **Zod + drizzle-zod** — Schema validation

### Replit-Specific
- `@replit/vite-plugin-runtime-error-modal` — Runtime error overlay in dev
- `@replit/vite-plugin-cartographer` — Dev tooling (dev only)
- `@replit/vite-plugin-dev-banner` — Dev banner (dev only)