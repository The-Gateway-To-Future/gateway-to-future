# 🇩🇪 Gateway to Future

> **Your Complete German Language Learning Journey from A1 to C2**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CEFR Aligned](https://img.shields.io/badge/CEFR-A1%20to%20C2-blue)](https://www.coe.int/en/web/common-european-framework-reference-languages)
[![Made for Indian Learners](https://img.shields.io/badge/Made%20for-Indian%20Learners-orange)](https://github.com/Gateway-To-Future/gateway-to-future)

## 📖 About

**Gateway to Future** is a comprehensive German language learning program specifically designed for Indian learners pursuing:
- 🎓 **Studienkolleg** (Foundation Year)
- 🔧 **Ausbildung** (Vocational Training)
- 🏛️ **University Admission**
- 💼 **Professional Career in Germany**

---

## 🚀 Getting Started & Local Development

This repository contains both a static frontend and a Node.js + TypeScript backend system.

### 1. Frontend (Static Site)
The frontend is a static web application located in the repository root.

#### Running Locally
To run the static frontend locally, you can open `index.html` directly in any web browser, or serve it using a lightweight local web server:

```bash
# Using live-server (npm)
npx live-server .

# Or using Python's built-in HTTP server
python -m http.server 8000
```
Then navigate to `http://localhost:8000` (or the port specified by live-server) in your browser.

- **Main Files**:
  - `index.html` - Homepage styling and layout
  - `css/styles.css` - Core design system and visual branding styles
  - `js/main.js` - Smooth scrolls, reveal animations, and interactive controls
  - `js/background.js` - Immersive 3D particle animation using Three.js

---

### 2. Backend (Node.js + TypeScript)
The backend service handles JWT authentication, counseling slot booking, course registrations, Razorpay payments integration, and cached educational materials. It resides in the `backend/` directory.

#### Local Setup
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your local configuration file:
   Copy the reference `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
   The backend will boot up, auto-seed the initial admin credentials, and expose:
   - **Local Server API**: `http://localhost:5000`
   - **Health Status Endpoint**: `http://localhost:5000/health`
   - **Interactive Hub SPA**: `http://localhost:5000/`

*Note: By default, the app starts with mock modes enabled (`DB_MOCK=true`, `REDIS_MOCK=true`, and `PAY_MOCK=true`) for easy setup without external dependencies.*

#### Running Backend Tests
Execute the Jest and Supertest automated test suite:
```bash
cd backend
npm test
```

---

## 🐋 Docker & Containerization

You can run the backend along with PostgreSQL and Redis databases using Docker Compose:

```bash
cd backend
docker-compose up --build -d
```
This boots:
1. **API Web Server**: Listening on port `5000`
2. **PostgreSQL DB**: Port `5432` (health-checked and connected)
3. **Redis Cache**: Port `6379` (health-checked and connected)

---

## 🌐 Deployment Configuration

- **Frontend Deployment**: Deployed automatically to **GitHub Pages** from the `main` branch.
- **Backend Deployment**: Proposed and configured for **Render** via the `render.yaml` blueprint file in the repository root. Initiating a new service on Render using this blueprint will deploy the Node.js/Express app connected to a private PostgreSQL database.
- **CI/CD Pipeline**: A GitHub Actions workflow (`.github/workflows/deploy.yml`) is active on push/pull requests to the `main` branch to run automated test suites, verify builds, and deploy the frontend.

---

## 🛠️ Project Directory Tree

```
gateway-to-future/
│
├── .github/workflows/      # CI/CD Action pipelines (test & Pages deploy)
├── assets/                 # Brand assets and official logo files
│   └── logo.jpg            # Unified premium brand logo image
├── books/                  # Released educational PDF study materials
├── css/                    # Frontend stylesheet directories
│   ├── style.css           # Subpage styles
│   └── styles.css          # Homepage Redesign layout and brand colors
├── js/                     # Frontend client interaction scripts
│   ├── background.js       # Immersive Three.js particle canvas animation
│   └── main.js             # General scrolls, reveals, and hooks
├── backend/                # Express TypeScript Backend Server
│   ├── src/                # TS source codes (controllers, routes, etc.)
│   ├── tests/              # Jest/Supertest endpoint verification tests
│   ├── Dockerfile          # Production runner image spec
│   ├── docker-compose.yml  # Docker multi-service local stack orchestration
│   └── package.json        # Dependencies and scripts definitions
├── render.yaml             # Render Blueprint configuration for backend deployment
├── index.html              # Main Landing page
└── README.md               # Root documentation (this file)
```

---

## 🤝 Contributing & Support

For issues, please open a ticket on [GitHub Issues](https://github.com/Gateway-To-Future/gateway-to-future/issues) or reach out to the development team.

**Dein Tor zur Zukunft beginnt hier. (Your gateway to the future starts here.)**
