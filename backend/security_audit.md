# Security Audit Report - Gateway to Future Backend

A detailed security audit report identifying potential vulnerability vectors and explaining how our Express/TypeScript architecture mitigates them to achieve production-grade security compliance.

---

## Audit Summary

| Vulnerability Vector | Severity | Mitigation Status | Architecture Component |
| :--- | :---: | :---: | :--- |
| **SQL Injection (SQLi)** | High | **Mitigated** | PostgreSQL parametrized queries via pg pool |
| **Brute-Force & DOS Attacks** | Medium | **Mitigated** | Express Rate Limiter middleware |
| **Weak Password Storage** | High | **Mitigated** | BcryptJS salted hashes (cost factor 10) |
| **Token Compromise / Replay** | High | **Mitigated** | JWT signatures, expiration, role validation |
| **Payment Signature Spoofing** | High | **Mitigated** | timingSafeEqual verification (HMAC SHA256) |
| **Clickjacking / HTTP Exploit** | Medium | **Mitigated** | Helmet secure headers & CORS settings |
| **Cross-Site Scripting (XSS)** | Medium | **Mitigated** | Input sanitization + validation middleware |

---

## Detailed Vulnerability & Mitigation Analysis

### 1. SQL Injection (SQLi)
*   **Threat**: Attackers inject custom SQL code inside user inputs (e.g. search bars, registration inputs) to read, modify, or destroy database records.
*   **Mitigation**: 
    - We utilize **Parametrized Queries** across all Repositories. Instead of concatenating input strings directly into SQL statements, arguments are passed as parameters (e.g., `db.query('SELECT * FROM users WHERE email = $1', [email])`). 
    - The PostgreSQL pg driver processes parameters separately from the compiled statement, preventing input from altering the SQL statement context.

### 2. Password Hashing & Brute-Force Limits
*   **Threat**: Attackers crack password hashes if stored in plain text or with weak hashing functions (MD5/SHA1), or brute-force login routes.
*   **Mitigation**:
    - We use **BcryptJS** with a work factor of 10 to hash and salt student passwords. The random salt prevents dictionary/rainbow-table attacks.
    - We enforce an **Auth Rate Limiter** (`authLimiter` middleware) restricting IPs to a maximum of 15 registration or login requests per hour. This stops dictionary and automated brute-force attacks.

### 3. Webhook Signature Spoofing (Razorpay Verification)
*   **Threat**: Attackers spoof checkout requests or hit payment confirmation routes directly with fake parameters to register for courses for free.
*   **Mitigation**:
    - We enforce signature checks on both direct client callbacks (`POST /api/payments/verify`) and webhook endpoints (`POST /api/payments/webhook`).
    - The signature is verified by calculating the HMAC-SHA256 of the payload using the secure webhook secret.
    - To prevent **Timing Attacks** (where attackers guess signatures character by character by measuring the response delay), we verify the signatures using `crypto.timingSafeEqual()`, which takes a constant time to compare buffers regardless of content similarity.

### 4. JWT Validation & Role Security Controls
*   **Threat**: Students manipulate tokens to act as admins, or session replay attacks compromise profiles.
*   **Mitigation**:
    - Tokens are signed with `jsonwebtoken` using a secure `JWT_SECRET` key, and expire in 1 hour (`JWT_EXPIRES_IN=1h`).
    - The authentication middleware (`authenticateJWT`) extracts and validates the token.
    - We implement a role guard (`requireAdmin`) that cross-checks the user's role stored in the database. Even if a student intercepts and alters the payload of a JWT, the server fetches the user by ID and blocks unauthorized requests with a `403 Forbidden` response.

### 5. Secure HTTP Headers & CORS Compliance
*   **Threat**: Man-in-the-Middle exploits, Clickjacking, or unauthorized cross-origin AJAX queries capture user sessions.
*   **Mitigation**:
    - We integrate **Helmet** middleware. This automatically sets crucial HTTP headers:
        - `X-Frame-Options: SAMEORIGIN` (prevents clickjacking).
        - `X-Content-Type-Options: nosniff` (forces browsers to adhere to MIME types).
        - `Content-Security-Policy` (limits sources for scripts, images, connect scripts, frames, and style tags to prevent code injection).
    - We use **CORS** middleware to strictly authorize API connections.

### 6. XSS & Input Sanitization
*   **Threat**: Attackers insert malicious JavaScript payloads into input fields (e.g. appointment notes) which execute inside the browsers of administrators reviewing requests.
*   **Mitigation**:
    - We use **Express-Validator** to validate and sanitize inputs:
        - Email fields normalize characters (`normalizeEmail`).
        - Strings are trimmed to remove unexpected spacing.
        - Level selections check against a strict whitelist (e.g., `isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])`).
        - Validation errors trigger `validateRequest` which stops processing and returns standard JSON error details.
