# Contributing

## Branches

Create a feature branch from `develop`:

```text
feature/backend-auth
feature/frontend-soc
feature/ai-anomaly
feature/qa-attack-scenarios
```

## Commit format

Use:

`type(scope): message`

Examples:

- `feat(auth): add session middleware`
- `feat(ai): add anomaly endpoint`
- `test(api): add activity event smoke test`
- `fix(security): reject expired capability`
- `docs(api): update OpenAPI contract`

## Pull requests

Every PR should state:

1. What changed
2. How it was tested
3. Security impact
4. Any API contract changes

## Security rules

- Never commit passwords, API keys, tokens, private keys or real sensitive data.
- Frontend checks are not a security boundary; authorization must be enforced server-side.
- Do not send unnecessary PII or secrets to AI services.
- Do not perform real-world scanning or offensive testing against systems outside the authorized local demo environment.
