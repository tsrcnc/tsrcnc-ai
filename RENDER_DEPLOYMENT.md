# Render.com Free Deployment Guide

## 🆓 Render Free Tier Benefits:
- ✅ 750 hours/month free (enough for 1 service 24/7)
- ✅ Auto-deploy from GitHub
- ✅ HTTPS included
- ✅ Custom domain support
- ⚠️ Sleeps after 15min inactivity (wakes on request)

## 📋 Step-by-Step Deployment:

### 1️⃣ Create Render Account
1. Go to: https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repos

### 2️⃣ Deploy Backend (API)

1. Click "New +" → "Web Service"
2. Connect Repository: `tsrcnc/tsrcnc-ai`
3. Configure:
   ```
   Name: tsrcnc-ai-backend
   Region: Singapore (closest to you)
   Branch: main
   Root Directory: backend
   Environment: Node
   Build Command: npm install
   Start Command: node server.js
   Plan: Free
   ```

4. **Environment Variables** (click "Advanced"):
   ```
   GEMINI_API_KEY=your_key
   SUPABASE_URL=your_url
   SUPABASE_SERVICE_KEY=your_key
   OPENAI_API_KEY=your_key
   ADMIN_PASSWORD=your_password
   PORT=10000
   ```

5. Click "Create Web Service"

6. **Note the URL**: `https://tsrcnc-ai-backend.onrender.com`

### 3️⃣ Deploy Frontend

1. Click "New +" → "Static Site"
2. Connect Repository: `tsrcnc/tsrcnc-ai`
3. Configure:
   ```
   Name: tsrcnc-ai
   Branch: main
   Root Directory: frontend
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```

4. **IMPORTANT**: Before deploying, update API URL
   - Edit `frontend/src/App.jsx`
   - Edit `frontend/src/Admin.jsx`
   - Edit `frontend/src/Moderation.jsx`
   - Replace `http://localhost:3000` with:
     `https://tsrcnc-ai-backend.onrender.com`

5. Click "Create Static Site"

6. **Your Live URL**: `https://tsrcnc-ai.onrender.com`

### 4️⃣ Auto-Deploy Setup

✅ Already configured! Every GitHub push = auto-deploy

## ⚡ Performance Tips:

### Prevent Sleep (Free Options):
1. **UptimeRobot**: https://uptimerobot.com
   - Ping your site every 5 minutes
   - Keeps it awake during work hours

2. **Cron-job.org**: https://cron-job.org
   - Schedule requests to your API

## 🔄 Alternative: Vercel + Render

**Frontend on Vercel** (Better performance):
1. Go to vercel.com
2. Import `tsrcnc/tsrcnc-ai`
3. Root Directory: `frontend`
4. Framework: Vite
5. Auto-deploy!

**Backend on Render** (API only)

---

## 💰 Cost Comparison:

| Platform | Free Tier | Notes |
|----------|-----------|-------|
| Render | ✅ 750hrs/month | Sleeps after 15min |
| Vercel | ✅ ∞ bandwidth | Frontend only (free) |
| Railway | ⚠️ $5 credit | Limited |
| Hostinger VPS | ❌ $3.99/month | No sleep, full control |

---

## 🚀 Recommended Setup (FREE):

1. **Backend**: Render.com (free)
2. **Frontend**: Vercel.com (free, faster)
3. **Database**: Supabase (already using, free tier)

**Total Cost: $0/month** ✅

---

## 📝 Next Steps:

1. Push current code to GitHub (Done ✅)
2. Create Render account
3. Deploy backend to Render
4. Update API URLs in frontend
5. Deploy frontend to Vercel (or Render)
6. Setup UptimeRobot to prevent sleep

**Setup time: ~15 minutes!**
