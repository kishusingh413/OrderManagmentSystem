# Order Management System — Setup & Deployment Guide

This document explains how to run the Inventory & Order Management System locally, with Docker, and how to deploy it for the technical assessment submission.

## Project Structure

```
OrderManagmentSystem/
├── backend/          # FastAPI + PostgreSQL API
├── frontend/         # React (Vite) web app
├── docker-compose.yml
├── .env.example
└── SETUP.md
```

## Prerequisites

Install the following before you begin:

| Tool | Purpose | Download |
|------|---------|----------|
| **Docker Desktop** | Run all services in containers | https://www.docker.com/products/docker-desktop/ |
| **Git** | Version control & GitHub submission | https://git-scm.com/ |
| **Node.js 20+** (optional) | Local frontend development | https://nodejs.org/ |
| **Python 3.12+** (optional) | Local backend development | https://www.python.org/ |

---

## Quick Start (Docker — Recommended)

This is the fastest way to run the full stack exactly as required by the assessment.

### 1. Clone or open the project

```bash
cd C:\Users\Km\Desktop\OrderManagmentSystem
```

### 2. Create environment file

```powershell
Copy-Item .env.example .env
```

Edit `.env` if you want to change database credentials or API URLs. Defaults work for local Docker.

### 3. Start all services

```bash
docker compose up --build
```

Wait until you see the backend and frontend containers running without errors.

### 4. Open the application

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8000 |
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **Health Check** | http://localhost:8000/health |

### 5. Stop the application

Press `Ctrl+C` in the terminal, then:

```bash
docker compose down
```

To remove database data as well:

```bash
docker compose down -v
```

---

## Docker Architecture

The `docker-compose.yml` file orchestrates three services:

```mermaid
flowchart LR
  Browser --> Frontend
  Frontend --> Backend
  Backend --> PostgreSQL
```

| Service | Image / Build | Port | Description |
|---------|---------------|------|-------------|
| `db` | `postgres:16-alpine` | 5432 | PostgreSQL with named volume `postgres_data` |
| `backend` | `./backend/Dockerfile` | 8000 | FastAPI API (Python 3.12 slim) |
| `frontend` | `./frontend/Dockerfile` | 3000 → 80 | React app served by Nginx |

### Docker files included

- `backend/Dockerfile` — production-ready Python slim image
- `backend/.dockerignore`
- `frontend/Dockerfile` — multi-stage Node build + Nginx
- `frontend/.dockerignore`
- `docker-compose.yml` — orchestrates all services
- `.env.example` — environment variable template (no hardcoded secrets in code)

### Environment variables

| Variable | Used by | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | db, backend | Database username |
| `POSTGRES_PASSWORD` | db, backend | Database password |
| `POSTGRES_DB` | db, backend | Database name |
| `DATABASE_URL` | backend | SQLAlchemy connection string |
| `CORS_ORIGINS` | backend | Allowed frontend origins (comma-separated) |
| `VITE_API_URL` | frontend build | Backend API URL baked into the React build |

---

## Local Development (Without Docker)

Use this if you want hot reload while coding.

### Backend

1. Start PostgreSQL locally (or run only the DB container):

   ```bash
   docker compose up db
   ```

2. Create a virtual environment and install dependencies:

   ```powershell
   cd backend
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Create `backend/.env`:

   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/order_management
   CORS_ORIGINS=http://localhost:5173
   ```

4. Run the API:

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend

1. Install dependencies:

   ```powershell
   cd frontend
   npm install
   ```

2. Create `frontend/.env`:

   ```env
   VITE_API_URL=http://localhost:8000
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open http://localhost:5173

---

## API Endpoints

### Products
- `POST /products` — Create product
- `GET /products` — List products
- `GET /products/{id}` — Get product
- `PUT /products/{id}` — Update product
- `DELETE /products/{id}` — Delete product

### Customers
- `POST /customers` — Create customer
- `GET /customers` — List customers
- `GET /customers/{id}` — Get customer
- `DELETE /customers/{id}` — Delete customer

### Orders
- `POST /orders` — Create order (auto-calculates total, reduces stock)
- `GET /orders` — List orders
- `GET /orders/{id}` — Get order details
- `DELETE /orders/{id}` — Cancel order (restores inventory)

### Dashboard
- `GET /dashboard/summary` — Totals + low stock products

### Business rules implemented
- Unique product SKU
- Unique customer email
- Stock cannot go negative
- Orders blocked when inventory is insufficient
- Order total calculated by backend
- Proper HTTP status codes and validation errors

---

## Push Backend Image to Docker Hub

Required for assessment submission.

### 1. Create a Docker Hub account

Sign up at https://hub.docker.com/

### 2. Log in from your terminal

```bash
docker login
```

### 3. Build and tag the backend image

Replace `YOUR_DOCKERHUB_USERNAME` with your username:

```bash
docker build -t YOUR_DOCKERHUB_USERNAME/order-management-backend:latest ./backend
```

### 4. Push the image

```bash
docker push YOUR_DOCKERHUB_USERNAME/order-management-backend:latest
```

Your Docker Hub link will be:

```
https://hub.docker.com/r/YOUR_DOCKERHUB_USERNAME/order-management-backend
```

---

## Deploy Backend (Render — Free Tier)

### 1. Push code to GitHub

```bash
git init
git add .
git commit -m "Add inventory and order management system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/order-management-system.git
git push -u origin main
```

### 2. Create PostgreSQL on Render

1. Go to https://render.com/ and sign up
2. Create a new **PostgreSQL** database (free tier)
3. Copy the **Internal Database URL**

### 3. Deploy the backend as a Web Service

1. **New → Web Service** → connect your GitHub repo
2. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Docker (or Python if not using Docker)
   - **Dockerfile Path:** `Dockerfile`
3. Environment variables:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Your Render PostgreSQL URL |
   | `CORS_ORIGINS` | Your frontend URL (set after frontend deploy) |

4. Deploy and note your backend URL, e.g. `https://order-api.onrender.com`

### Alternative backends

- **Railway:** https://railway.app/ — add PostgreSQL plugin + deploy from GitHub
- **Fly.io:** https://fly.io/ — use `fly launch` in the `backend` folder

---

## Deploy Frontend (Vercel — Free Tier)

### 1. Push frontend to GitHub

The repo already contains both frontend and backend.

### 2. Deploy on Vercel

1. Go to https://vercel.com/ and sign up
2. **Add New Project** → import your GitHub repo
3. Settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Environment variable:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | Your deployed backend URL (e.g. `https://order-api.onrender.com`) |

5. Deploy and copy your live URL, e.g. `https://order-management.vercel.app`

### 3. Update backend CORS

Go back to Render (or your backend host) and update:

```
CORS_ORIGINS=https://order-management.vercel.app
```

Redeploy the backend if needed.

### Alternative frontends

- **Netlify:** https://www.netlify.com/ — same settings as Vercel (`frontend` root, `VITE_API_URL` env var)

---

## Assessment Submission Checklist

Submit these four items:

- [ ] **GitHub repository** with frontend + backend code
- [ ] **Docker Hub link** for the backend image
- [ ] **Live frontend URL** (Vercel / Netlify)
- [ ] **Live backend API URL** (Render / Railway / Fly.io)

Suggested smoke test before submitting:

1. Create a product with stock
2. Create a customer
3. Create an order and confirm stock decreases
4. Open dashboard and verify counts
5. Cancel an order and confirm stock is restored

---

## Troubleshooting

### Backend cannot connect to database

- Ensure PostgreSQL is running (`docker compose ps`)
- Verify `DATABASE_URL` matches your credentials
- Wait for the `db` health check to pass before the backend starts

### Frontend shows network errors

- Confirm `VITE_API_URL` points to the correct backend
- Rebuild the frontend after changing `VITE_API_URL` (Docker: `docker compose up --build`)
- Check `CORS_ORIGINS` includes your frontend URL

### Port already in use

Change ports in `docker-compose.yml`, for example:

```yaml
ports:
  - "8001:8000"   # backend
  - "3001:80"     # frontend
```

### Docker build is slow on first run

The first `docker compose up --build` downloads base images and installs dependencies. Later runs are much faster.

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, React Router |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL 16 |
| Containers | Docker, Docker Compose |
| Deployment | Render/Railway/Fly.io + Vercel/Netlify |
