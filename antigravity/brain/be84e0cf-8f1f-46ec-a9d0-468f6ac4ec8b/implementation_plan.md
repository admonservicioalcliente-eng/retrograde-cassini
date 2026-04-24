# Financial Analysis Application - Implementation Plan

This implementation plan covers the development of a modern web application for managing and analyzing an "Estado de Resultados" (Income Statement) on a monthly and annual basis.

## User Review Required

> [!IMPORTANT]  
> The application will use **Vanilla CSS** per the system rules to deliver a premium, dynamic, and state-of-the-art aesthetic. It will leverage a local **SQLite** database for data storage, ensuring immediate and persistent data without requiring external cloud databases.

Please review the proposed database schema and technology stack below before execution.

## Proposed Changes

### 1. Project Initialization & Dependencies
- **Framework**: Next.js (App Router)
- **Styling**: Vanilla CSS (Global tokens, modern aesthetics, responsive)
- **Database**: SQLite using `better-sqlite3`
- **Charts**: `recharts` for dynamic financial charting

### 2. Database Schema
We will create a SQLite local file (`database.sqlite`) with two main tables:
- **`companies`**: Details for login authentication.
  - `id` (Primary Key, UUID/String)
  - `password` (Hashed or plaintext for MVP)
- **`financial_records`**: Monthly inputs.
  - `id` (Primary Key)
  - `company_id` (Foreign Key -> companies.id)
  - `year` (Integer)
  - `month` (Integer)
  - `ventas_netas` (Float)
  - `costo_ventas` (Float)
  - `gastos_administracion` (Float)
  - `depreciacion_amortizacion` (Float)
  - `ingresos_financieros` (Float)
  - `gastos_financieros` (Float)
  - `impuestos` (Float)

*Calculated Fields (computed dynamically during querying/rendering):*
- Utilidad Bruta = Ventas Netas - Costo de Ventas
- EBITDA = Utilidad Bruta - Gastos de Administración
- EBIT = EBITDA - Depreciación y Amortización
- Utilidad antes de impuestos = EBIT + Ingresos Financieros - Gastos Financieros
- Utilidad Neta = Utilidad antes de impuestos - Impuestos

### 3. Application Structure

---

#### [NEW] Database Access Layer (`lib/db.js`)
Service layer to initialize the SQLite database and handle queries (get companies, insert monthly records, list records by year).

#### [NEW] Authentication (`app/login/page.js` & `app/api/auth/route.js`)
A premium login page allowing a company to log in using their `ID` and `Password`. Stores a secure session cookie.

#### [NEW] Monthly Data Entry (`app/dashboard/entry/page.js`)
A dynamic form interface to register or update the financial data for a specific Month and Year.

#### [NEW] Financial Dashboard (`app/dashboard/page.js`)
The main hub displaying:
- **Annual Income Statement Table**: An aggregated view grouping all recorded months for a given year.
- **Monthly Breakdown Table**: A detailed list of each month.
- **Comparative Charts**: Powered by `recharts`, showing trends for Sales, EBITDA, and Net Income across months.

#### [NEW] Styling System (`app/globals.css`)
Implementation of a sleek dark mode with glassmorphism, dynamic animations, modern generic fonts, and CSS variables for theming.

## Open Questions

> [!WARNING]  
> 1. Do you want to pre-load a specific set of Companies, or should I create a "Register" page as well? I will assume we should start by automatically creating one default company (e.g., ID: "demo", Password: "password123") to test the functionality if you don't need a registration form right now.
> 2. Are there any specific brand colors or aesthetics you'd prefer? If not, I will design a premium sleek dark mode.

## Verification Plan

### Automated/Code Verification
- Run `npm run dev` to ensure the application compiles.
- Check that the SQLite database file gets created automatically when testing the API routes.

### Manual Verification
- You will be able to log in with a test company, add financial entries for multiple months.
- Verify that the tables accurately calculate the aggregate fields like EBITDA and Utilidad Neta.
- Verify that the charts populate dynamically and compare the months accurately.
