# Team workflow

## Ownership

| Area | Owner | Branch prefix |
|---|---|---|
| Frontend / UI | OmBarange | `feature/frontend-*` |
| Backend / Security | Rohith Tinson Thomas | `feature/backend-*` |
| AI / Security Intelligence | Devraj Shrivastav | `feature/ai-*` |
| QA / Attack Simulation / Docs | Aryan | `test/*` or `docs/*` |

## Integration rule

All feature work starts from `develop` and returns to `develop` through a pull request. `main` is reserved for stable demo/release snapshots.

## Shared contract rule

If one service changes an endpoint, request shape, response shape, auth requirement or event schema, update `backend/docs/openapi.yaml` in the same PR or in an explicitly linked contract PR.
