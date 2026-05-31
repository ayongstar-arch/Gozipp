# 🚀 MyWin App Deployment Guide (Hostinger Cloud Startup)

This guide is specifically for **Hostinger Cloud Startup** or **Business** plans that support the **Node.js Web App** feature.

---

## 📋 Prerequisites

1.  **Hostinger Plan**: Business Web Hosting OR Cloud Startup (Enable Node.js Support).
2.  **Database**: Create a MySQL Database in hPanel.
3.  **GitHub Repo**: Your project must be pushed to GitHub.
4.  **Node.js Version**: **Must be v20.x or higher** (Required by `@google/genai`).

---

## 🛠 Step 1: Prepare Your Project (Already Done)

We have configured your project for this deployment:
*   **Build Script**: `npm run build` automatically builds backend and frontend.
*   **Frontend**: Source moved to `src/index.html` to avoid conflicts. Built files are served from `client_build/`.
*   **Resilience**: Server will start even if Redis is missing (falls back to memory). Database connection retries 3 times.

---

## ☁️ Step 2: Deploy on Hostinger (hPanel)

1.  **Log in to hPanel** and go to **Websites**.
2.  Select **"Node.js Web App"**.

### Configuration Settings:
*   **Application Root**: `public_html` (default)
*   **Application Startup File**: `dist/main.js` (⚠️ IMPORTANT)
*   **Node.js Version**: **20** (Required)
*   **Package Management**: `npm`

### Environment Variables (Create these in Dashboard):
You **MUST** set these for the app to start.

**Essential:**
| Key | Value |
|:---|:---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DB_HOST` | (Copy from MySQL Databases page) |
| `DB_USER` | (Copy from MySQL Databases page) |
| `DB_PASSWORD` | (Your DB Password) |
| `DB_NAME` | (Your DB Name) |
| `JWT_SECRET` | (Create a random secure string) |

**Optional:**
| Key | Value |
|:---|:---|
| `REDIS_URL` | (Only if you have external Redis) |
| `GEMINI_API_KEY` | (For AI features) |

---

## 🚀 Step 3: Troubleshooting "503 Service Unavailable"

If you see a 503 error, it means the server crashed on startup. Common causes:

1.  **Node Version too low**: Ensure it is set to **20** (or 22 if unstable, go back to 20).
2.  **Database Connection**: Check `DB_HOST`, `DB_USER`, `DB_PASSWORD` carefully. Hostinger DB host is usually *not* localhost.
3.  **Logs**: Click the **"Logs"** tab in Node.js Web App to see the actual error.

---

## ✅ Verification

Visit your domain. You should see the login page.
*   **Frontend**: Served by NestJS from `client_build/index.html`.
*   **Backend**: API runs at `/api`.
