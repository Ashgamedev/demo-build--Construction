# Deepthi Construction CRM - Project Context

## Tech Stack
* **Framework**: React + Vite + TypeScript
* **Styling**: Tailwind CSS, Lucide React (Icons)
* **State Management**: Zustand
* **Backend/DB**: Firebase (Auth, Firestore, Storage)
* **Routing**: React Router DOM

## Project Phase: Full Production Build (DEMO IS OVER)
**CRITICAL CONTEXT FOR IDE AGENT:** 
The initial rushed demo phase is officially over. The user is now building the **full, proper, production-oriented system** exactly as the client requested. 
* **NO MORE SHORTCUTS.** 
* Do not create temporary "mock" UIs or half-finished modules. 
* All new code must be robust, type-safe, production-ready, and fully integrated with the Firebase backend and Zustand stores.
* Ensure all edge cases, loading states, and error handling are properly implemented.

## Current Implementation Status
The foundation has been laid, but requires hardening and completion:
1. **Authentication**: Firebase Auth is configured. *(Note: A temporary dummy bypass exists in `src/pages/Login.tsx` for the demo. This MUST be replaced with real Firebase Auth as soon as valid `.env` credentials are provided).*
2. **Dashboard**: Scaffolded and connected to stores. Needs comprehensive data visualization.
3. **Quotations**: A complex A4 Quotation Builder is implemented (`src/pages/Quotations/Builder.tsx`) with BOQ and simple modes. Needs robust testing and PDF export integration.
4. **Leads, Projects, Finance, Customers, Workforce, Settings**: Scaffolded with basic routing. **These modules need to be fully built out to production standards.**

## Data Models
Data models are defined in `src/types/index.ts` and managed via Zustand stores (`src/store/*`). 
Firestore snapshot listeners are implemented in the stores (e.g., `leadStore.ts`, `financeStore.ts`, `projectStore.ts`).

## Guidelines for IDE Agent
* Prioritize modern, clean UI using Tailwind CSS.
* Ensure all new features integrate properly with the existing Zustand stores and Firebase DB.
* Do not alter the Firebase SDK fallback in `src/lib/firebase.ts` unless the user provides valid API credentials in a `.env` file.
