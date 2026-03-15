# Vercel & Backend Deployment Checklist

Use this checklist to fix "Load failed" and food scan issues.

## 1. Vercel Environment Variables

In **Vercel** → Project → **Settings** → **Environment Variables**, ensure:

| Variable | Required | Notes |
|----------|----------|-------|
| `OPENAI_API_KEY` | Yes (if not using Railway) | Needed for food scan when using Vercel API routes |
| `ANTHROPIC_API_KEY` | Optional | For Claude fallback |
| `NEXT_PUBLIC_RAILWAY_API_URL` | **Recommended** | e.g. `https://your-app.up.railway.app` – routes food scan to Railway (no 10s limit) |

**Important:** After adding `NEXT_PUBLIC_*` vars, **redeploy** – they are baked in at build time.

## 2. Railway Backend (Recommended for Food Scan)

Vercel serverless has limits. Using Railway for the food API avoids them:

1. Deploy `backend/` to Railway (see `backend/RAILWAY_DEPLOYMENT.md`)
2. Set `OPENAI_API_KEY` in Railway variables
3. Add `NEXT_PUBLIC_RAILWAY_API_URL` in Vercel = your Railway URL
4. Redeploy Vercel

## 3. Vercel Limits (When Using Vercel API Routes)

| Limit | Value | Impact |
|-------|-------|--------|
| Body size | 4.5 MB | Large images may fail with 413 |
| Function timeout | 10s default, 60s with config | AI vision can take 15–30s |
| Hobby plan | 60s max with `maxDuration` | Already set in `food-estimate` route |

The `food-estimate` route has `maxDuration = 60` and `runtime = "nodejs"`.

## 4. Common Causes of "Load failed"

| Cause | Fix |
|-------|-----|
| **WebView memory crash** | Native iOS app now compresses images before passing to WebView. Rebuild the Xcode app. |
| **Vercel 10s timeout** | Set `NEXT_PUBLIC_RAILWAY_API_URL` and use Railway for the API. |
| **Missing API key** | Add `OPENAI_API_KEY` to Vercel (or Railway if using it). |
| **413 Payload too large** | Image too big. App compresses to ~600px; if still failing, check for very high-res uploads. |
| **Network / CORS** | Same-origin requests (Vercel → Vercel) have no CORS. Railway has CORS enabled. |

## 5. Verify Setup

**Vercel only (no Railway):**
- `OPENAI_API_KEY` set in Vercel
- Redeploy after adding

**With Railway:**
- Railway backend deployed and `/health` returns `{"status":"ok"}`
- `NEXT_PUBLIC_RAILWAY_API_URL` set in Vercel
- `OPENAI_API_KEY` set in Railway
- Redeploy Vercel

## 6. Debugging

- **Vercel logs:** Project → Logs (see function errors)
- **Railway logs:** Service → Deployments → View logs
- **iOS:** Rebuild app in Xcode after WebView/ContentView changes
