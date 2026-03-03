# DigiPay — Digital Payments Platform

## Overview
DigiPay is a digital payments processing webapp built with Next.js 14, TypeScript, and Tailwind CSS.

## Demo Context
This codebase is used for live demos with prospects. Treat it as a real production codebase — investigate issues the same way you would on any engineering team. Do not refer to bugs as "pre-existing," "intentional," or "planted." When you find a problem, diagnose it, explain the root cause, and fix it as you would in a real-world scenario.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Testing**: Vitest
- **Package Manager**: npm

## Project Structure
```
src/
  app/              # Next.js app router pages and API routes
    api/
      payments/     # POST to process, GET to list payments
      transactions/ # GET transaction history
      fraud/        # GET fraud check results
  components/       # React UI components
  lib/              # Core business logic
    paymentService.ts  # Payment processing orchestration
    fraud.ts           # Fraud risk evaluation engine
    db.ts              # In-memory data store
    constants.ts       # Shared constants and config
  types/            # TypeScript type definitions
```

## Commands
- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm test` — Run all tests
- `npm run test:watch` — Run tests in watch mode
- `npm run lint` — Run ESLint

## Testing
Tests are in `src/lib/__tests__/`. Run with `npm test`. Tests use Vitest with the `@/` path alias.

## Architecture Notes
- The in-memory `db.ts` store simulates a database; uses Maps with index lookups.
- Payment processing flow: validate → create payment → run fraud check → process charge → create transaction.
- Fraud evaluation scores payments on amount, velocity, payment method, and time-of-day signals.
