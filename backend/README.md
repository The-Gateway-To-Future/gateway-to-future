# Gateway to Future Backend System

A production-ready, highly secure RESTful API backend and interactive student hub SPA for the **Gateway to Future** brand website (`gatewaytofuture.com`). The backend handles student registrations, counseling slot scheduling (9 PM IST / 5:30 PM CEST), secure Razorpay checkouts, and educational material distribution.

---

## 🛠️ Architecture & Tech Stack

- **Runtime & Language**: Node.js v20+, Express, TypeScript
- **Relational Database**: PostgreSQL 16 (Parametrized SQL queries, custom migrations)
- **Caching Layer**: Redis 7 (Speed-caching course listings and materials with in-memory fallback)
- **Security**: JWT sessions, Bcrypt password salting, Helmet CSP guards, Express Rate Limiting, and Timing-Safe HMAC signatures
- **Payments**: Razorpay Node API Integration (webhook crypt verification, mock environment seeder)
- **Deployment**: Multi-stage `Dockerfile`, orchestration via `docker-compose`, or Render Blueprint (`render.yaml`)

---

## 🚦 Getting Started & Local Development

### 1. Prerequisite Checklist
Ensure you have the following installed on your host system:
- **Node.js** (v18+)
- **NPM** (v9+)
- *(Optional)* **Docker & Docker Compose** (for containerized execution)
- *(Optional)* **PostgreSQL & Redis** (if running without mock repositories)

### 2. Environment Configurations (`.env`)
The project comes pre-configured with a default `.env` template that runs in **Mock Mode** by default. This enables:
- **DB_MOCK=true**: In-memory database repository. No live PostgreSQL server needed.
- **REDIS_MOCK=true**: In-memory cache repository. No live Redis cache server needed.
- **PAY_MOCK=true**: Simulated Razorpay Checkout popup. Allows approving/failing payments directly.

To configure local environments:
```bash
# Copy env example reference
cp .env.example .env
```
For production or live connection testing, change these values to `false` and enter your database connection details under `DATABASE_URL` and `REDIS_URL`.

### 3. Installation
Install all production and development dependencies:
```bash
npm install
```

### 4. Running the Development Server
Boot the hot-reloading development server:
```bash
npm run dev
```
The console will boot, apply migrations (if DB_MOCK=false), seed the initial administrator credentials, and print:
```
🚀 Gateway to Future backend listening on port 5000 in development mode.
🖥️ Frontend Demo UI is available at: http://localhost:5000
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser to view the interactive student portal dashboard.

### 5. Health Check Endpoint
Exposed directly at root level to assist container orchestrators and hosting checkers:
- **Endpoint**: `GET http://localhost:5000/health`
- **Output**: `{ "status": "ok", "environment": "development", "timestamp": "2026-06-05T20:00:00.000Z" }`

### 6. Running the Automated Test Suite
The project includes a comprehensive endpoint test suite using **Jest** and **Supertest** covering registrations, validation guards, timezone scheduling boundaries, and webhook captures.
```bash
npm run test
```

---

## 🐋 Docker Compose Deployment
To deploy the backend, database, and cache services as a containerized stack:
1. Ensure `docker` and `docker-compose` are installed and running.
2. Configure credentials by copying the template file `.env.docker` to `.env` (which is ignored by Git):
   ```bash
   cp .env.docker .env
   ```
   Feel free to edit the `.env` file to customize passwords and secrets.
3. Launch the services:
   ```bash
   docker-compose up --build -d
   ```
This will compile the optimized multi-stage production Docker image, boot PostgreSQL 16 and Redis 7, wait for health-checks to pass, connect them inside a secure network bridge, and expose the application on port `5000`.

---

## 📌 API Endpoints Table

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :---: | :--- |
| **GET** | `/health` | Public | Health Check Endpoint for deployment status |
| **POST** | `/api/auth/register` | Public | Register student with WhatsApp & qualification details |
| **POST** | `/api/auth/login` | Public | Login user and issue JWT token |
| **GET** | `/api/auth/me` | Logged In | Retrieve logged-in student profile details |
| **GET** | `/api/courses` | Public | List language courses (cached, A1-B2 Goethe tracks) |
| **POST** | `/api/courses` | Admin | Create a new language course (invalidates cache) |
| **POST** | `/api/courses/:id/book`| Student | Initiate booking for a language class |
| **GET** | `/api/courses/my-bookings`| Student | Retrieve user course booking logs |
| **GET** | `/api/appointments/available-slots`| Public | Query daily 9:00 PM IST counselor availability |
| **POST** | `/api/appointments/book` | Student | Book counseling session (date limits, timezone-adjusted) |
| **GET** | `/api/appointments/my-appointments`| Student | List scheduled counselor sessions |
| **POST** | `/api/payments/checkout` | Student | Create Razorpay order details |
| **POST** | `/api/payments/verify` | Student | Validate payment signature on checkout success |
| **POST** | `/api/payments/webhook` | Webhook | Handle capturing success notifications from Razorpay |
| **GET** | `/api/materials` | Logged In | Retrieve materials filtered by student CEFR level (cached) |
| **POST** | `/api/materials` | Admin | Register study guides/resources (invalidates cache) |
