# Auditoría y Propuesta Técnica — Segmentación por Crew

## 1. Resumen de Estructura Actual

### Base de datos (Supabase)

| Tabla | Rows | Notas |
|-------|------|-------|
| **psp_locations** | 3 | Locations PSP (penetrómetro/compaction). FK: sections, records, reports, penetrometer_options. Sin crew/zone. |
| **psp_sections** | 1 | Sections por location. FK → psp_locations. |
| **psp_records** | 40 | Registros operativos por location/section. |
| **psp_reports** | 11 | Reportes por location. |
| **psp_admins** | 2 | Admins (email, user_id→auth.users). user_id null en ambos. Sin crew_id. |
| **psp_penetrometer_options** | 2 | Opciones por location. |
| **drainer_sections** | 1 | Sections Drainer (pipe jointing). Sin crew/zone. |
| **drainer_pipe_records** | 68 | Registros por section. |
| **drainer_itr_reports** | 0 | ITR reports. |
| **wc_vehicles** | 4 | Tiene `zone` (north/south) y `crew` (A/B/C/D). |
| **wc_water_logs** | 395 | Tiene `crew` (text). |
| **wc_destination_sites** | 4 | Tiene `zone` (north/south/shared). |
| **wc_tasks** | 5 | Sin crew/zone. |
| **checkpoints** | 1 | Sin crew/zone. |
| **checkpoint_history** | 0 | RLS deshabilitado. |

### Relaciones clave

- **psp**: locations → sections → records
- **drainer**: sections → pipe_records (sin locations)
- **water cart**: vehicles (zone, crew) → water_logs (crew)
- **psp_admins** → auth.users (user_id)

### Auth / RLS

- **psp_admins**: solo SELECT si `user_id = auth.uid()`
- **psp_locations**: authenticated INSERT/UPDATE; anon/authenticated SELECT (sin filtro por crew)
- **psp_sections**: mismo patrón
- **drainer_***: anon read/insert; authenticated full access
- **wc_***: public ALL (sin restricción por crew)

### Dashboard actual (OnSite-Dashboard)

- **Stack**: Next.js 16, Tailwind, Recharts, Supabase anon client
- **Rutas**: solo `/` (Daily View)
- **Auth**: ninguna; usa anon key
- **Datos**: 100% mock en `lib/queries/daily.ts` (drainer_pipe_records, backfill_records, water_logs comentados)
- **Nav**: Daily | Progress | Resources | Reports (solo Daily activo)
- **Sin**: admin mode, login, filtrado por crew/zone

### Naming existente

- `crew` en wc_vehicles y wc_water_logs: A, B, C, D
- `zone` en wc_vehicles, wc_destination_sites: north, south, shared
- No existe tabla `crews` ni `zones`

### Backfill

- No existe tabla `backfill_records`. El dashboard asume datos mock.

---

## 2. Propuesta Técnica

### Decisión: zone derivada desde crew

- **crews** (id, name, zone) — zone = north | south
- Evitar tabla zones: redundante, crew → zone es 1:1

### Tablas nuevas

1. **crews** (id, name, zone)
   - A→North, B→North, C→South, D→South
   - Índice en name para joins

### Columnas nuevas

1. **psp_admins**: `crew_id` (FK → crews, nullable al inicio)
2. **psp_locations**: `crew_id` (FK → crews, nullable)
3. **psp_sections**: `qr_token` (text, unique), `qr_token_created_at` (timestamptz)
4. **drainer_sections**: `crew_id`, `qr_token`, `qr_token_created_at` (por consistencia con PSP)
5. **psp_locations** (alternativa): si QR es a nivel location, agregar qr_token ahí. Decisión: **QR a nivel section** (más granular; psp_sections y drainer_sections)

### Flujo Admin

1. Login Supabase Auth
2. Buscar psp_admins por user_id o email
3. Si admin: leer crew_id → redirigir a `/dashboard?crew=X`
4. Filtrar locations por crew_id en queries
5. RLS: INSERT/UPDATE/DELETE solo si location.crew_id = admin.crew_id

### Flujo QR (User panel)

1. Crear token único (uuid o nanoid) al crear section
2. URL: `/location-access/[token]`
3. Ruta valida token contra psp_sections o drainer_sections
4. Si válido: mostrar solo esa section; permitir ingresar datos; sin admin mode
5. RLS: policy para anon con token válido (o endpoint server-side que valide y devuelva datos)

### Dashboard

- Tabs: Crew A | Crew B | Crew C | Crew D | Global (opcional)
- Cada tab filtra por crew_id
- Reutilizar DailyView, pasar `crewId` a queries

---

## 3. Por qué esta arquitectura

- **Mínimo cambio**: crews pequeño, FKs nullable, sin romper datos existentes
- **Sin duplicar zone**: crew lleva zone
- **Reutilizar wc_* crew text**: mapear A/B/C/D a crew id en queries
- **QR en section**: más granular que location; aplica a PSP y Drainer
- **RLS centralizado**: filtrado en DB, apps heredan seguridad

---

## 4. Migraciones SQL (orden)

1. `create_crews_table`
2. `add_crew_id_to_psp_admins`
3. `add_crew_id_to_psp_locations`
4. `add_crew_id_to_drainer_sections`
5. `add_qr_token_to_psp_sections`
6. `add_qr_token_to_drainer_sections`
7. `rls_crew_restrictions`
8. `seed_crews_and_assign_federico`

---

## 5. Cambios Backend (resumen)

- `lib/supabase.ts`: cliente con cookie para SSR auth (opcional)
- `lib/auth.ts`: getSession, getAdminCrew
- `lib/queries/daily.ts`: filtrar por crew; conectar drainer_pipe_records, wc_water_logs (backfill seguir mock si no hay tabla)
- API route o Server Action: validar token QR, devolver section
- Generación QR: lib o API que genere token y QR image

---

## 6. Cambios Frontend (resumen)

- Middleware: proteger rutas admin
- `/login`, `/dashboard` (con query crew)
- NavTabs: Crew A|B|C|D|Global
- Ruta `/location-access/[token]`: User panel limitado
- Admin: crear location/section → generar token, guardar, descargar QR, enviar email (futuro)

---

## 7. Archivos modificados/creados

| Archivo | Acción |
|---------|--------|
| `supabase/migrations/*.sql` | 9 migraciones aplicadas |
| `lib/supabase/server.ts` | Nuevo – cliente server con cookies |
| `lib/supabase/client.ts` | Nuevo – cliente browser |
| `lib/auth.ts` | Nuevo – getSession, getAdminCrew |
| `lib/qr.ts` | Nuevo – generateQrToken, buildQrUrl |
| `lib/queries/crews.ts` | Nuevo – getCrews |
| `lib/queries/daily.ts` | Filtro crew, queries reales (pipes, water) |
| `lib/queries/qrAccess.ts` | Nuevo – getSectionByToken |
| `app/page.tsx` | Redirect por crew, tabs |
| `app/login/page.tsx` | Nuevo |
| `app/login/LoginForm.tsx` | Nuevo |
| `app/auth/callback/route.ts` | Nuevo – OAuth callback |
| `app/location-access/[token]/page.tsx` | Nuevo |
| `app/location-access/[token]/UserPanel.tsx` | Nuevo |
| `app/api/qr/generate/route.ts` | Nuevo – generar QR |
| `components/dashboard/NavTabs.tsx` | Tabs Crew A|B|C|D|Global |
| `components/dashboard/Header.tsx` | Crew badge, link Login |
| `package.json` | @supabase/ssr, nanoid, qrcode |
