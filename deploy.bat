@echo off
title Ojaoba — Deploy to Production
echo.
echo  ==========================================
echo   Ojaoba — Production Deployment
echo  ==========================================
echo.

:: ── 1. GitHub ──────────────────────────────
echo [1/4] Pushing code to GitHub...
echo.
echo  You'll need a GitHub repo. Steps:
echo  1. Go to https://github.com/new
echo  2. Create repo named "ojaoba"
echo  3. Copy the repo URL (e.g. https://github.com/yourusername/ojaoba.git)
echo.
set /p GITHUB_URL="Paste your GitHub repo URL: "

cd /d "%~dp0"
git remote remove origin 2>nul
git remote add origin %GITHUB_URL%
git push -u origin master
echo  ✓ Code pushed to GitHub
echo.

:: ── 2. Railway (Backend) ───────────────────
echo [2/4] Deploying backend to Railway...
echo  (A browser will open — log in with GitHub)
echo.
cd /d "%~dp0backend"
railway login
railway init
railway up --detach
for /f %%i in ('railway domain') do set RAILWAY_URL=%%i
echo  ✓ Backend live at: https://%RAILWAY_URL%
echo.

:: ── 3. Set Railway env vars ────────────────
echo [3/4] Setting Railway environment variables...
echo  Opening backend\.env for you to copy values from...
notepad "%~dp0backend\.env"
echo.
echo  In Railway dashboard (https://railway.app) → your project →
echo  Variables tab → paste all values from your .env file.
echo.
echo  IMPORTANT: Set BACKEND_URL=https://%RAILWAY_URL%
echo.
pause

:: ── 4. Vercel (Frontend) ──────────────────
echo [4/4] Deploying frontend to Vercel...
echo  (A browser will open — log in with GitHub)
echo.
cd /d "%~dp0frontend"
vercel login
vercel --yes

echo.
echo  ==========================================
echo   DEPLOYMENT COMPLETE!
echo  ==========================================
echo.
echo  After deployment, do these two things:
echo.
echo  1. WhatsApp Webhook:
echo     Meta Dashboard → WhatsApp → Config → Webhook URL:
echo     https://%RAILWAY_URL%/api/whatsapp/webhook
echo     Verify Token: ojaoba_verify_2024
echo.
echo  2. Paystack Webhook:
echo     dashboard.paystack.com → Settings → Webhooks:
echo     https://%RAILWAY_URL%/api/whatsapp/payment-callback
echo.
echo  3. Sync Products:
echo     Go to your Vercel URL → /admin → Products → Sync from Shopify
echo.
pause
