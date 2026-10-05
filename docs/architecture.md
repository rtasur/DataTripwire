# Pre-production architecture

```text
WorkSphere / SOC
       |
       v
   Backend API
       |
  +----+--------------------+
  |                         |
  v                         v
Policy / Security       Activity / Audit
  |                         |
  +------------+------------+
               |
               v
         Evidence / Scores
               |
               v
           AI Service
               |
               v
          SOC decision UI
```

Design rule:

> AI assists analysis; deterministic security policies control enforcement.

The scaffold is intentionally incomplete. Problem-specific detection and response logic should be added after the official challenge problem is known.
