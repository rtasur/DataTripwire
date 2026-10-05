# API contract rules

- Base path: `/api/v1`
- JSON request/response format
- Server-side authorization is mandatory
- Every security-sensitive endpoint should record an audit event
- High-impact actions should bind authorization to the transaction details
- Do not place secrets in the frontend
- Keep the OpenAPI file updated with endpoint changes
