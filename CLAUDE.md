# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Infrastructure
```bash
docker compose up -d          # Start Postgres (5432) + MinIO (9000/9001)
```

### Backend (`cd backend`)
```bash
npm run dev                   # tsx watch — hot reload on :3000
npm run lint                  # tsc --noEmit (type-check only, no eslint)
npm run build                 # compile to dist/
npm run prisma:migrate -- --name <name>   # create + apply migration
npm run prisma:deploy         # apply migrations without generating (CI/prod)
npm run prisma:seed           # seed admin@dental.local / admin123
npm run prisma:generate       # regenerate Prisma client after schema changes
```

### Frontend (`cd frontend`)
```bash
npm run dev                   # Vite dev server on :5173
npm run lint                  # tsc --noEmit
npm run build                 # tsc + vite build
```

There are no automated tests; `lint` (type-check) is the only CI gate.

## Architecture

### Backend

Express app assembled in `src/app.ts`, entry point in `src/server.ts`. All route groups share the same middleware chain: `helmet → cors → json → cookieParser → morgan`.

**Auth flow**: Access token (JWT, 15 min) in `Authorization: Bearer` header; refresh token in `httpOnly` cookie. `requireAuth` middleware decodes and attaches `req.user: AccessTokenPayload`. `requireRole(...roles)` gates specific routes. Passwords hashed with argon2.

**Module layout** (`src/modules/<name>/`): each module has `.routes.ts` (mounts middleware + controller), `.controller.ts` (thin request/response handlers), `.service.ts` (business logic + Prisma calls), `.schema.ts` (Zod schemas for validation via `validate` middleware).

**File storage**: No files are stored on disk. The backend generates pre-signed S3/MinIO URLs (`presignUpload` / `presignDownload`, 5-min TTL) and the frontend uploads/downloads directly. `storageKey` in `MediaFile` is the S3 object key.

**Audit log**: `audit.service.ts` logs changes to Patient, MedicalHistory, Appointment, ClinicalNote, ToothRecord, MediaFile. Call it explicitly in service methods; it is not a Prisma middleware.

**Error handling**: Async route handlers are wrapped with `asyncH` from `src/lib/async.ts` to avoid try/catch boilerplate. Unhandled errors fall through to `errorHandler` in `src/middleware/error.ts`, which returns `{ error, details }` JSON.

### Frontend

React 18 + Vite + Tailwind. State: TanStack Query for server state; no global client-state store.

**API client** (`src/lib/api.ts`): typed `api<T>(path, opts)` function with automatic token refresh on 401. Access token is held in module-level memory (not localStorage). `AuthContext` bootstraps the token on load and wires `configureAuth` for refresh and logout callbacks.

**Feature layout** (`src/features/<name>/`): each feature has `<Name>Page.tsx` or tab component, `<name>.api.ts` (raw fetch wrappers calling `api()`), and `queries.ts` (TanStack Query `queryKey` + `queryFn` definitions).

**Routing**: `src/app/router.tsx` — all authenticated routes nest under `<ProtectedRoute>` → `<AppShell>`. Patient detail routes use nested children tabs (`/pacientes/:id/odontograma`, `/notas`, etc.).

**Specialized viewers**:
- Radiographs (RADIOGRAPH_2D / PHOTO): custom canvas viewer with zoom/pan/brightness/contrast/rotation.
- DICOM: Cornerstone3D initialized in `src/features/radiographs/cornerstoneInit.ts`; viewer in `DicomViewer.tsx`.
- STL (3D scans): `@react-three/fiber` + `three-stdlib` STLLoader in `STLViewer.tsx`; auto-fit camera, wireframe toggle.

**Odontogram**: SVG-based, FDI notation (teeth 11–48), per-tooth condition stored in `ToothRecord`. Color coding and legend defined in `OdontogramTab.tsx`.

### Data model key points

- `Appointment.dentistId` → `User` (role DENTIST); overlap validation done in `appointments.service.ts`.
- `ToothRecord` has a unique constraint on `(patientId, toothNumber)` — upsert, don't insert.
- `MediaFile.storageKey` is unique; thumbnail stored separately as `thumbnailKey`.
- All cascading deletes flow from `Patient` → children.

## Done criteria (enforced by convention)

- No `any` in domain code.
- All backend inputs validated with Zod before reaching the service layer.
- Every view has loading, error, and empty states.
- Pre-signed URLs only — no direct S3 credentials reach the frontend.
- UI language: Spanish throughout.
- Design system: neutral palette + teal accent (`teal-600`), rounded-lg corners, subtle shadows.
