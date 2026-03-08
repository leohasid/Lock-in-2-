# Railway Deployment Guide

## Step 1: Deploy Backend to Railway

1. **Go to Railway.app** and sign in
2. **Click "New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Choose your repository** (`Lock-in-2-` or your repo name)
5. **Configure the service:**
   - **Root Directory:** Set to `backend` (this tells Railway to only use the backend folder)
   - **Start Command:** `npm start` (already set in package.json)
   - **Port:** Railway will automatically set the PORT environment variable

## Step 2: Set Environment Variables in Railway

In your Railway project dashboard:

1. Go to **Variables** tab
2. Add these environment variables:
   - `OPENAI_API_KEY` = `your-openai-api-key-here`
   - `ANTHROPIC_API_KEY` = `your-claude-api-key-here` (optional - for Claude AI tasks)
   - `PORT` = (Railway sets this automatically, but you can override if needed)

## Step 3: Get Your Railway Backend URL

After deployment:
1. Go to **Settings** → **Networking**
2. Click **Generate Domain** (or use the provided domain)
3. Copy your Railway URL (e.g., `https://your-app-name.up.railway.app`)

## Step 4: Update Frontend to Use Railway Backend

Update your Next.js frontend to call the Railway backend instead of local API routes.

**For local dev – create `.env.local` in your project root:**
```
NEXT_PUBLIC_RAILWAY_API_URL=https://your-app-name.up.railway.app
```

**For Vercel deployment – add the same variable in Vercel:**
1. Project → Settings → Environment Variables
2. Add `NEXT_PUBLIC_RAILWAY_API_URL` = `https://your-app-name.up.railway.app`
3. Redeploy after adding (required for `NEXT_PUBLIC_` vars)

Food photo analysis and AI consultation will use Railway when this URL is set.

## Step 5: Test Your Backend

Visit your Railway URL:
- `https://your-app-name.up.railway.app/health` - Should return `{"status":"ok"}`
- `https://your-app-name.up.railway.app/` - Should show service info and endpoints

**Endpoints:**
- `POST /api/ai` - AI text (consultation, etc.)
- `POST /api/food-estimate` - Food image analysis (requires `OPENAI_API_KEY` for vision)

## Troubleshooting

- **Build fails?** Make sure Root Directory is set to `backend`
- **Port errors?** Railway automatically sets PORT, don't override it
- **CORS issues?** The backend already has CORS enabled for all origins
- **API key not working?** Check Railway environment variables are set correctly
