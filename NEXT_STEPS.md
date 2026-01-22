# Next Steps: Deploying to Railway & Vercel

## 🎯 Overview

- **Frontend (Next.js)** → Deploy to **Vercel**
- **Backend (Express)** → Deploy to **Railway**
- Connect frontend to Railway backend

---

## 📋 Step-by-Step Guide

### Step 1: Deploy Backend to Railway

1. **Go to [Railway.app](https://railway.app)** and sign in with GitHub

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository (`Lock-in-2-`)

3. **Configure Service:**
   - In the service settings, find **"Root Directory"**
   - Set it to: `backend`
   - This tells Railway to only use the `backend/` folder

4. **Set Environment Variables:**
   - Go to **Variables** tab
   - Add: `OPENAI_API_KEY` = `your-actual-openai-key`
   - Railway automatically sets `PORT` (don't override it)

5. **Deploy:**
   - Railway will automatically detect `package.json` and run `npm install` then `npm start`
   - Wait for deployment to complete

6. **Get Your Backend URL:**
   - Go to **Settings** → **Networking**
   - Click **Generate Domain** (or use provided domain)
   - Copy the URL (e.g., `https://your-app.up.railway.app`)

7. **Test Your Backend:**
   - Visit: `https://your-app.up.railway.app/health`
   - Should return: `{"status":"ok","service":"mogifi-ai-backend"}`

---

### Step 2: Update Frontend to Use Railway Backend

1. **Create `.env.local` in project root:**
   ```bash
   NEXT_PUBLIC_RAILWAY_API_URL=https://your-app.up.railway.app
   ```

2. **Update frontend API calls** to use Railway URL instead of `/api/ai`

   The frontend currently calls:
   - `/api/ai` (consultation page)
   - `/api/meal-analysis` (nutrition page)
   - `/api/generate-plan` (onboarding)
   - etc.

   These need to be updated to call your Railway backend.

---

### Step 3: Deploy Frontend to Vercel

1. **Push all changes to GitHub:**
   ```bash
   git add .
   git commit -m "Add Railway backend and update frontend"
   git push
   ```

2. **Go to [Vercel.com](https://vercel.com)** and sign in

3. **Import your GitHub repository**

4. **Configure:**
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `.` (root)
   - Build Command: `npm run build`
   - Output Directory: `.next`

5. **Add Environment Variables:**
   - `NEXT_PUBLIC_RAILWAY_API_URL` = `https://your-app.up.railway.app`

6. **Deploy!**

---

## 🔧 What Needs to Be Updated

### Backend (`backend/server.js`)
✅ Already has OpenAI integration
✅ Already has `/api/ai` endpoint
✅ Already configured for Railway (listens on PORT, 0.0.0.0)

### Frontend Updates Needed:

1. **Create API utility** (`lib/api.ts`):
   ```typescript
   const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_API_URL || '';
   
   export async function callAI(prompt: string) {
     const res = await fetch(`${RAILWAY_URL}/api/ai`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ prompt })
     });
     const data = await res.json();
     return data.response;
   }
   ```

2. **Update `app/consultation/page.tsx`:**
   - Change `fetch("/api/ai", ...)` to use Railway URL

3. **Update `app/nutrition/page.tsx`:**
   - Change `fetch("/api/ai", ...)` to use Railway URL

4. **Remove or keep Next.js API routes:**
   - You can keep them as fallback, or remove them
   - If keeping, they'll still work but will use Vercel's serverless functions

---

## 🚀 Quick Start Commands

```bash
# Install backend dependencies
cd backend
npm install

# Test backend locally
npm start

# Install frontend dependencies (if needed)
cd ..
npm install

# Test frontend locally
npm run dev
```

---

## 📝 Checklist

- [ ] Deploy backend to Railway
- [ ] Set `OPENAI_API_KEY` in Railway
- [ ] Get Railway backend URL
- [ ] Test Railway backend (`/health` endpoint)
- [ ] Create `.env.local` with Railway URL
- [ ] Update frontend to use Railway URL
- [ ] Deploy frontend to Vercel
- [ ] Set `NEXT_PUBLIC_RAILWAY_API_URL` in Vercel
- [ ] Test full integration

---

## 🐛 Troubleshooting

**Backend won't start on Railway:**
- Check Root Directory is set to `backend`
- Check environment variables are set
- Check Railway logs for errors

**Frontend can't reach backend:**
- Check CORS is enabled (already done in backend)
- Check Railway URL is correct
- Check environment variable is set in Vercel

**OpenAI errors:**
- Verify `OPENAI_API_KEY` is set in Railway
- Check API key is valid
- Check Railway logs for specific errors

---

## 📚 Files Created

- `backend/server.js` - Express backend with OpenAI
- `backend/package.json` - Backend dependencies
- `backend/RAILWAY_DEPLOYMENT.md` - Railway deployment guide
- `NEXT_STEPS.md` - This file
