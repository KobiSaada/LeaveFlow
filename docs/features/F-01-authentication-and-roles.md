# F-01 — Authentication and roles

## Purpose

Identify the user, issue a token, and give each of the two roles access to its own interface only.

## Actors

**Requester** (employee) and **Validator** (manager). Four demo users are seeded (`npm run db:seed`).

## Flow

```mermaid
sequenceDiagram
    actor U as User
    participant W as Web (LoginView, auth.store)
    participant C as auth.controller
    participant S as AuthService
    participant R as UserRepository
    U->>W: email + password
    W->>C: POST /auth/login
    C->>S: login(email, password)
    S->>R: findCredentialsByEmail(email)
    alt unknown email
        S->>S: compare against a dummy bcrypt hash (same cost)
        S-->>C: InvalidCredentialsError (401)
    else wrong password
        S-->>C: InvalidCredentialsError (401)
    else valid
        S->>S: issue HS256 JWT {sub, role, name, iss, aud, exp}
        S-->>C: { accessToken, expiresIn, user }
    end
    C-->>W: 200 / 401
    W->>W: session in sessionStorage; redirect to the role's home
```

## Rules

- One generic `INVALID_CREDENTIALS` answer for unknown email and wrong password, with comparable timing.
- Token lifetime `JWT_TTL_SECONDS` (default 8 h); no refresh tokens.
- Roles: `REQUESTER` → `/requests`; `VALIDATOR` → `/dashboard`. Permissions matrix in [F-07](./F-07-security.md).
- A token whose user no longer exists is not a session (`/auth/me` → 401).
- **No self-registration.** Accounts are provisioned (seed today; an admin-only `CreateUserCommand` or SSO in production — FW-12). Self-service sign-up would have to decide a role, and letting users choose `VALIDATOR` would be privilege escalation.

## API

| Method | Path          | Access   | Success                                           | Errors                              |
| ------ | ------------- | -------- | ------------------------------------------------- | ----------------------------------- |
| POST   | `/auth/login` | public   | 200 `{ accessToken, tokenType, expiresIn, user }` | 401 `INVALID_CREDENTIALS`, 422, 400 |
| GET    | `/auth/me`    | any role | 200 `PublicUser`                                  | 401                                 |

## Data

`users(id, name, email UNIQUE lower-case, password_hash, role, created_at)` — the hash is never selected unless explicitly requested (one query only).

## Security

bcrypt (cost 10); JWT HS256 with pinned algorithm, issuer, audience, expiry; claims validated with zod; no hash in any response. Frontend guards are UX only — every route is enforced server-side.

## Edge cases

| Case                                                            | Behaviour                                                                                       |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Email with different case/spaces                                | normalised (`trim().toLowerCase()`)                                                             |
| Expired token                                                   | 401 `UNAUTHENTICATED`; the web app signs out and returns to login (also detected on navigation) |
| Token signed with another secret / `alg: none` / other audience | 401                                                                                             |
| Two roles side by side                                          | per-tab sessions (`sessionStorage`)                                                             |

## Acceptance criteria → tests

| Criterion                                                         | Test                                                                                                     |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Login returns token + profile; wrong password ≡ unknown email     | `apps/api/test/integration/auth.test.ts`                                                                 |
| Expired / forged / malformed tokens → 401                         | `apps/api/test/integration/auth.test.ts`, `apps/api/src/modules/auth/services/jwt-token.service.test.ts` |
| Dummy-hash path for unknown emails; `me` for a deleted user → 401 | `apps/api/src/modules/auth/services/auth.service.test.ts`                                                |
| Role guard per route                                              | `apps/api/test/integration/rbac.test.ts`                                                                 |

## Code map

- API: `apps/api/src/modules/auth/` — `controllers/auth.controller.ts`, `services/auth.service.ts`, `services/jwt-token.service.ts`, `services/bcrypt-password-hasher.ts`; users: `apps/api/src/modules/users/repositories/typeorm-user.repository.ts`
- Web: `apps/web/src/features/auth/` — `auth.store.ts`, `auth.api.ts`, `auth.routes.ts`, `views/LoginView.vue`; guard in `apps/web/src/router.ts`
