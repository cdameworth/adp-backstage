# ADP plugins for Backstage

Backstage frontend + backend plugins for the [Agent Developer Portal (ADP)](https://github.com/cdameworth/adp) — surfacing agent governance, decision audit, approvals, ungoverned-activity findings, and TechDocs inside your Internal Developer Platform.

## Packages

| Package | Role |
| --- | --- |
| [`@adp/backstage-plugin-adp`](plugins/adp) | frontend-plugin (pages, charts, TechDocs addon, Enforcement tab) |
| [`@adp/backstage-plugin-adp-backend`](plugins/adp-backend) | backend-plugin (auth-protected proxy to the ADP REST API, catalog entity provider) |

## Install into a Backstage app

```bash
yarn --cwd packages/app add @adp/backstage-plugin-adp
yarn --cwd packages/backend add @adp/backstage-plugin-adp-backend
```

Full wiring (backend, `app-config`, frontend routes, permissions, TechDocs addon, entity provider) is in **[INTEGRATION.md](INTEGRATION.md)**.

## Develop in this repo

This is a Backstage plugin workspace (yarn + `@backstage/cli`).

```bash
corepack enable        # provides yarn 4
yarn install
yarn tsc
yarn build
yarn test
```

> **Status:** authored against Backstage ~1.32 but **not yet build-verified in a Backstage app** ([adp#14](https://github.com/cdameworth/adp/issues/14)). The first `yarn install && yarn build && yarn test` is expected to surface dependency-version reconciliation — pin to your target Backstage release and run `backstage-cli versions:bump` as needed. Requires a running ADP server (the backend plugin proxies its REST API).

## License

Apache-2.0
