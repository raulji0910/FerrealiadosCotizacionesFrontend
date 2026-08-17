# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Angular frontend for Jimaco Cotizaciones — an internal tool that replaces an Excel-based workflow for a hardware-store business. It talks to a separate .NET API in the sibling repo **`JimacoCotizacionesBackend`** (`../Jimaco.Cotizaciones` relative to this repo), which has the full system architecture doc (domain model, auth design, migration tool, etc.) in its own `CLAUDE.md` — read that first for anything backend-related. This repo's `docker-compose.yml` (in the backend repo) builds this frontend from `../Jimaco.Cotizaciones.Web`, so keep both repos checked out as siblings.

## Architecture

Angular 22, standalone components (no NgModules), Angular Material (M3 theming) + RxJS services, no NgRx.

- `src/app/core/` — `models/` (DTOs mirroring the backend's), `services/` (one per resource, thin HttpClient wrappers), `guards/` (`authGuard`, `adminGuard`), `interceptors/` (`auth.interceptor.ts` attaches the JWT and reacts to 401s).
- `src/app/features/<recurso>/` — one folder per screen: `productos`, `proveedores`, `usuarios`, `alertas`, `configuracion`, `login`. Each list feature follows the same shape: a `*-list.component` (table + search + `MatPaginator` wired to server-side pagination) and a `*-form-dialog.component` (create/edit, opened via `MatDialog`, closes with the DTO or `null`).
- `src/app/layout/` — the post-login shell (`mat-sidenav` + `mat-toolbar`), only place that reads `authService.esAdmin` to conditionally show the "Usuarios"/"Configuración" nav items.

**Not PrimeNG.** This project briefly used PrimeNG, but it went closed-source/commercial in June 2026 mid-project, so the UI was rebuilt on Angular Material to avoid licensing risk. If you see PrimeNG mentioned anywhere (old docs, memory, etc.), it's stale — there is no PrimeNG dependency here.

**Brand theme:** `src/theme-colors.scss` is generated, not hand-written — regenerate it if the brand palette changes:
```bash
npx ng generate @angular/material:m3-theme --primary-color="#1c6521" --tertiary-color="#7bbb6f" --directory=src --defaults --force
```
(the schematic drops the output at the repo root as `src_theme-colors.scss` — move/rename it back to `src/theme-colors.scss` after running it). `src/styles.scss` consumes it via `@use './theme-colors' as jimaco-theme` inside the `mat.theme(...)` call.

**Responsive tables:** Angular Material's `<table mat-table>` does **not** auto-stack on mobile by itself. The stacking behavior is hand-rolled globally in `src/styles.scss` (`table.tabla-responsiva` + `@media (max-width: 768px)`, driven by `[attr.data-label]` on each `<td>`). Any new data table needs the `tabla-responsiva` class on the `<table>` and a `data-label` attribute on every `<td>` matching its column header, or it won't stack on small screens.

**Session handling:** `AuthService` decodes the JWT payload client-side (`obtenerExpiracion`) purely to schedule a local `setTimeout` that logs the user out and redirects to `/login` when the token expires — this is a UX nicety, not a security boundary (the backend still validates the token on every request regardless). If you touch this decoding logic, remember JWT base64url payloads are unpadded — `atob()` throws on unpadded input, so the code re-pads to a multiple of 4 before decoding; this bit silently no-op'd the entire feature once already (see "gotchas" below).

## Commands

Requires **Node 22.22.3+** — check `node --version` before running anything here; an older Node (e.g. system-default 20.x) fails `ng build`/`ng serve` outright, not with a subtle error.

```bash
npm install
npx ng build --configuration development     # dev build, catches template/type errors fast
npx ng build                                  # production build (used by the Docker image)
npx ng serve                                  # dev server; reads apiUrl from src/environments/environment.ts (defaults to http://localhost:8080/api — point it at a locally running Api)
npx ng test                                   # unit tests (Vitest-based, via @angular/build:unit-test)
```

To run against the full stack instead of a bare `ng serve`, use the backend repo's `docker compose up -d` (builds this repo's `Dockerfile` too) — see that repo's `CLAUDE.md`.

## Non-obvious gotchas (learned the hard way this project)

- **JWT base64url payloads are unpadded.** `atob()` requires base64 padded to a multiple of 4 chars; JWT segments omit the `=` padding per spec. Decoding a token's payload without re-adding padding first makes `atob()` throw, which — if caught broadly — fails *silently* (no console error) and just skips whatever depended on the decoded claims. This exact bug shipped once in `AuthService.obtenerExpiracion` and made the auto-logout timer never get scheduled, with zero visible symptoms until someone waited out a real token expiry.
- **The backend must serialize enums as strings** (`JsonStringEnumConverter`, registered backend-side). If a new DTO field of enum type shows up as a number in a `GET` response, or a `POST`/`PUT` sending the string value gets rejected with an opaque 400, check the backend's `Program.cs` JSON options first — it's almost never a frontend bug.
- **`mat-select`/role dropdowns must use the exact backend enum names** (`'Admin' | 'Cotizador'`, not `'Comercial'` — that was the pre-rename role name; if you see `'Comercial'` anywhere it's stale and won't match anything the API returns).
- **Every `MatDialog.open()` call needs `autoFocus: 'dialog'` + a forced resize after opening**, or the first `mat-form-field`'s floating-label notch renders with no gap in the outline (the label text overlaps the border). Two causes stack here: (1) Material's default `autoFocus: true` focuses the first input before the dialog's enter animation finishes, so the notch width is calculated too early; (2) even with that fixed, the dialog's enter animation is a CSS `transform`, which doesn't trigger the `ResizeObserver` Material's notched-outline relies on to recalculate — so the notch can still end up wrong and never self-correct, including when a user manually focuses an empty field later. The working pattern (applied to all 4 dialogs — `proveedor-form-dialog`, `usuario-form-dialog`, `producto-form-dialog`, `precio-form-dialog`):
  ```ts
  const dialogRef = this.dialog.open(SomeDialogComponent, { width: '28rem', autoFocus: 'dialog', data: {...} });
  dialogRef.afterOpened().subscribe(() => window.dispatchEvent(new Event('resize')));
  ```
  If you add a new dialog with a `mat-form-field`, copy this pattern — don't assume `autoFocus: 'dialog'` alone is enough (it looks fixed in a screenshot of the *unfocused* resting state, but breaks again the moment a field is actually focused).
- **`Proveedor`'s create/edit form fields are `Nombre`, `Nit` ("Identificación"), `Direccion`, `Telefono`, `Ciudad`** — matching the columns in the real source spreadsheet. There is no Contacto/Email field in the UI (removed, not just hidden — see the backend `CLAUDE.md`'s Proveedor fields note); don't add them back without confirming with the user.
