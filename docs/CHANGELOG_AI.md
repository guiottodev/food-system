# CHANGELOG (AI)

## YYYY-MM-DD — <Title>
- What changed:
- Why:
- How to validate:
- Risks:
- Rollback:

## 2026-01-13 — MVP Orders + Catalog Ops
- What changed: Added catalog admin screens and catalog hub, updated order workflow with new status flow, unit validation, snapshot fields, and idempotent stock decrement on "Entregue"; added domain validation + tests; updated Prisma schema and migrations.
- Why: Deliver the MVP flow for orders and catalog with stronger data integrity and operational controls.
- How to validate: Run `npm test` and `npm run build`; create/update catalog entries; create order and verify tabs; cancel with reason; move to "Entregue" and confirm stock decremented once.
- Risks: Legacy data with invalid UnitType, redirect edge cases, and stock decrement concurrency.
- Rollback: Revert migrations and actions/UI changes; disable admin routes if needed.
