# ADP plugins for Backstage

Backstage integration for the **Agent Developer Portal (ADP)** — governance,
context delivery, decision audit, and approval workflows for AI coding agents,
surfaced inside your Internal Developer Platform.

Two packages:

| Package | Role | What it does |
| --- | --- | --- |
| `@adp/backstage-plugin-adp` | frontend-plugin | Pages (Overview, Sessions, Approvals, Audit, Reports), charts, and a per-entity "ADP" tab. |
| `@adp/backstage-plugin-adp-backend` | backend-plugin | Auth-protected proxy to the ADP REST API, plus an optional catalog entity provider that syncs ADP services into the catalog. |

> **Status: alpha.** These packages target the Backstage **new backend system**.
> See [Known limitations](#known-limitations) before rolling out broadly — most
> importantly, the backend proxy authenticates *callers* but does not yet
> enforce *authorization* on individual operations.

---

## Architecture

```
Browser (frontend plugin)
   │  fetchApi.fetch()  ── Backstage token attached automatically
   ▼
adp-backend plugin  (Backstage backend, route prefix /api/adp)
   │  Bearer <adp.apiKey>
   ▼
adp-server  (ADP REST API, e.g. http://adp-server:8080/v1/...)
```

The browser never talks to the ADP server directly: the ADP API key stays on
the Backstage backend. The frontend calls the backend plugin using Backstage's
`fetchApi`, which attaches the user/service token the backend requires.

---

## Prerequisites

- A Backstage app on the **new backend system** (`@backstage/backend-defaults`,
  `createBackend()`), Backstage release ~1.32+ (the versions these packages were
  written against — reconcile with your app, see [Known limitations](#known-limitations)).
- A reachable **`adp-server`** (the REST API, not the MCP sidecar — the MCP
  sidecar only serves git-commit endpoints). Note its base URL and an API key.
- Backstage auth configured so requests carry a token (any real sign-in
  provider; or guest auth in local dev).

---

## Install

From your Backstage monorepo root:

```bash
# frontend
yarn --cwd packages/app add @adp/backstage-plugin-adp
# backend
yarn --cwd packages/backend add @adp/backstage-plugin-adp-backend
```

---

## Configure

Add an `adp` block to `app-config.yaml`:

```yaml
adp:
  baseUrl: ${ADP_BASE_URL}        # required, e.g. http://adp-server:8080
  apiKey: ${ADP_API_KEY}          # Bearer token for the ADP server
  timeout: 30000                  # optional, ms (default 30000)

  # Only needed if you enable the catalog entity provider (below)
  organizationId: my-org          # optional
  entityProvider:
    refreshIntervalMs: 300000     # optional (default 5 min)
```

A config schema ships in `config.d.ts`; `apiKey` is marked secret so it is
redacted from frontend config and logs.

---

## Wire the backend

In `packages/backend/src/index.ts`:

```ts
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... your existing core features and plugins ...

// ADP backend proxy (routes mounted at /api/adp)
backend.add(import('@adp/backstage-plugin-adp-backend'));

// Optional: sync ADP services into the catalog as Component entities.
// Safe to add unconditionally — it no-ops with a warning if `adp` config
// is absent.
import { catalogModuleAdpEntityProvider } from '@adp/backstage-plugin-adp-backend';
backend.add(catalogModuleAdpEntityProvider);

backend.start();
```

On startup the backend logs whether it reached the ADP server; `/api/adp/health`
is the only unauthenticated route.

---

## Wire the frontend

### 1. Add the standalone page

In `packages/app/src/App.tsx`. The page renders its own nested routes, so it
**must** be mounted with a trailing wildcard:

```tsx
import { AdpPage } from '@adp/backstage-plugin-adp';

// inside <FlatRoutes>
<Route path="/adp/*" element={<AdpPage />} />
```

### 2. Add a sidebar entry

In `packages/app/src/components/Root/Root.tsx`:

```tsx
import ChatBubbleOutlineIcon from '@material-ui/icons/ChatBubbleOutline';

<SidebarItem icon={ChatBubbleOutlineIcon} to="adp" text="ADP" />
```

### 3. Add the per-entity "ADP" tab (optional)

In `packages/app/src/components/catalog/EntityPage.tsx`, add to the relevant
entity layout (e.g. `serviceEntityPage`):

```tsx
import { EntityAdpContent } from '@adp/backstage-plugin-adp';

<EntityLayout.Route path="/adp" title="ADP">
  <EntityAdpContent />
</EntityLayout.Route>
```

The tab shows agent activity for entities annotated with `adp.io/service-id`;
others get a "missing annotation" prompt.

---

## Catalog entity provider (optional)

When `catalogModuleAdpEntityProvider` is registered, ADP services are pulled in
on an interval and emitted as `Component` entities with:

- `adp.io/service-id`, plus `adp.io/context-config` / `adp.io/escalation-config`
  (JSON), and label `adp.io/managed: 'true'`
- `github.com/project-slug` + `backstage.io/source-location` when the service
  has a parseable GitHub `repository_url`
- owner resolved to `group:default/<team>` or `user:default/<user>`

These entities are managed by the provider (`locationKey` scoped by
`organizationId`); manage them in ADP, not by hand in the catalog.

---

## TechDocs integration

ADP's documentation engine auto-generates Markdown docs (session summaries, risk
reports, pattern reports). This plugin surfaces them through TechDocs.

**Data path:** the docs live in ADP's `DocStore` and are exposed by adp-server at
`GET /v1/docs` (and `/v1/docs/{id}`). The adp-backend proxies these (guarded by
the `adp.docs.read` permission) and the frontend reads them via `adpApi.getDocs`.
Note: the doc engine runs inside `adp-mcp`, so adp-server must share the same
database (the SQLite file, or the same Postgres) to read them. In PostgreSQL mode
ADP currently has no doc store, so `/v1/docs` returns `503` there.

There are two integration models — pick per how your entities get docs:

### A. TechDocs Addon (built into this plugin)

`AdpGovernanceDocsAddon` renders a secondary-sidebar panel in the TechDocs reader
listing the viewed entity's ADP governance docs (resolved via the
`adp.io/service-id` annotation → recent sessions → their generated docs), each
expandable to the rendered Markdown. It *augments* an existing TechDocs site, so
it shows for entities that already have docs.

Register it on the entity TechDocs route in
`packages/app/src/components/catalog/EntityPage.tsx`:

```tsx
import { EntityTechdocsContent } from '@backstage/plugin-techdocs';
import { TechDocsAddons } from '@backstage/plugin-techdocs-react';
import { AdpGovernanceDocsAddon } from '@adp/backstage-plugin-adp';

<EntityLayout.Route path="/docs" title="Docs">
  <EntityTechdocsContent>
    <TechDocsAddons>
      <AdpGovernanceDocsAddon />
    </TechDocsAddons>
  </EntityTechdocsContent>
</EntityLayout.Route>
```

### B. ADP docs as first-class TechDocs (for entities without repo docs)

To give ADP-managed entities their own "Docs" tab, set
`adp.entityProvider.techdocsRef` (adds `backstage.io/techdocs-ref` to those
entities) and run TechDocs with `techdocs.builder: 'external'`, publishing the
ADP Markdown as a built site to your TechDocs storage (S3/GCS/local) under each
entity's `namespace/kind/name` path. The build/publish step (Markdown → MkDocs
site → storage) is an **ADP-side publisher you must add** — it is not included
here; without it the Docs tab will 404.

## Auth model

- **Browser → backend:** `fetchApi` attaches the Backstage token; the backend's
  default auth policy requires it on every route except `/health`.
- **Per-operation authorization:** every route (except `/health`) is guarded by
  a Backstage permission (see [Permissions](#permissions)).
- **Backend → ADP server:** a single shared `adp.apiKey` Bearer token. This is a
  service-level credential; per-user identity is **not** propagated to ADP (see
  limitations).

## Permissions

The backend defines and enforces basic permissions on every proxied route. They
are registered with the permission framework (via the plugin's integration
router) and exported for use in your permission policy:

```ts
import { adpPermissions, adpApprovalResolvePermission }
  from '@adp/backstage-plugin-adp-backend';
```

| Permission | Guards |
| --- | --- |
| `adp.session.read` / `adp.session.write` | list/get vs create/update/delete/heartbeat sessions |
| `adp.context.read` | context retrieval |
| `adp.governance.check` | policy checks |
| `adp.approval.read` / `adp.approval.request` / **`adp.approval.resolve`** | read vs request vs approve/deny (sensitive) |
| `adp.decision.read` / `adp.decision.write` | read vs log decisions |
| `adp.commit.write` | prepare/verify commits |
| `adp.service.read` / `adp.service.write` / **`adp.service.delete`** | read vs create/update vs delete (sensitive) |
| `adp.report.read` | all reports incl. compliance export |

**Default behavior:** when the permission system is disabled (Backstage's
default, `permission.enabled: false`) every check resolves to ALLOW, so adding
these guards is non-breaking. They start enforcing once you set
`permission.enabled: true` and install a policy. A minimal policy that limits the
two sensitive actions to an `adp-admins` group:

```ts
// packages/backend/src/extensions/permissionsPolicyExtension.ts (sketch)
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import {
  adpApprovalResolvePermission,
  adpServiceDeletePermission,
} from '@adp/backstage-plugin-adp-backend';

async handle(request, user) {
  const sensitive = [
    adpApprovalResolvePermission.name,
    adpServiceDeletePermission.name,
  ];
  if (sensitive.includes(request.permission.name)) {
    const isAdmin = /* look up user's groups */ false;
    return { result: isAdmin ? AuthorizeResult.ALLOW : AuthorizeResult.DENY };
  }
  return { result: AuthorizeResult.ALLOW };
}
```

Denied requests return `403`.

---

## Build & test

These packages are source-only and are meant to be built inside your Backstage
workspace. From the monorepo root:

```bash
yarn install
yarn workspace @adp/backstage-plugin-adp build
yarn workspace @adp/backstage-plugin-adp-backend build
yarn workspace @adp/backstage-plugin-adp test
yarn workspace @adp/backstage-plugin-adp-backend test
```

> The build/tests have **not** been executed in the ADP source repo (it is not a
> Backstage workspace and the Backstage toolchain isn't installed there). Run the
> commands above in your app and treat a clean build + green tests as the
> acceptance gate before deploying.

---

## Known limitations

Honest list of what still needs work before broad production exposure:

1. **Single shared API key to ADP.** ADP-side audit attribution (e.g. who
   approved) relies on values the proxy forwards in the request body, not on a
   cryptographically verified end-user identity. (Backstage-side authz is
   enforced — see [Permissions](#permissions) — but identity is not propagated
   downstream to the ADP server.)
2. **Permission policy is yours to write.** The plugin defines and enforces
   permissions, but ships no policy. Until you set `permission.enabled: true` and
   add a policy, all checks resolve to ALLOW (i.e. authenticated-but-unrestricted).
3. **Version pinning.** Dependencies target Backstage ~1.32 (late 2024) and
   Material UI v4, using the legacy frontend plugin API (`createPlugin`). It is
   compatible with current Backstage but is not the new frontend system; align
   the version ranges with your app and run `backstage-cli versions:bump`.
4. **Reports typing.** A few report responses are typed `unknown` end-to-end
   (`getServiceReport`, compliance export); consumers must narrow them.

---

## Endpoints proxied

`/api/adp` exposes: `health`, `sessions` (CRUD + heartbeat), `context`,
`governance/check`, `governance/approvals` (+ `/pending`, resolve),
`audit/decisions` (+ `/lineage`), `commits/prepare|verify`, `services` (CRUD),
and `reports/{summary,governance,escalations,by-service,by-user,compliance}`.

## License

Apache-2.0
