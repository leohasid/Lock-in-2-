# Connect Vercel Frontend to Railway Backend

## Step 1: Get Your Railway Backend URL

1. Go to your Railway dashboard
2. Click on your service (the one that's online)
3. Go to **Settings** → **Networking**
4. Find your **Public Domain** (e.g., `https://your-app.up.railway.app`)
5. Copy this URL - this is your Railway backend URL

## Step 2: Set Environment Variable in Vercel

1. Go to your **Vercel dashboard**
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add:
   - **Name:** `NEXT_PUBLIC_RAILWAY_API_URL` 
     - 💡 **Quick Copy:** Visit `/copy-env-var.html` on your site for a click-to-copy button
     - Or copy this: `NEXT_PUBLIC_RAILWAY_API_URL`
   - **Value:** Your Railway URL (e.g., `https://your-app.up.railway.app`)
   - **Environment:** Select all (Production, Preview, Development)
6. Click **Save**

### Quick Copy Helper

Visit this URL on your deployed site for an easy copy button:
```
https://your-vercel-site.vercel.app/copy-env-var.html
```

Or copy this variable name directly:
```
NEXT_PUBLIC_RAILWAY_API_URL
```

## Step 3: Redeploy Vercel

After adding the environment variable:

1. Go to **Deployments** tab in Vercel
2. Click the **three dots (⋯)** on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger auto-deploy

## Step 4: Test It

1. Visit your Vercel site
2. Go to **Consultation** page
3. Send a message - it should use Railway backend
4. Go to **Nutrition** page
5. Click **AI Coach** - it should work with Railway

## How It Works

- Frontend checks for `NEXT_PUBLIC_RAILWAY_API_URL` environment variable
- If set, it calls Railway backend: `${RAILWAY_URL}/api/ai`
- If not set, it falls back to local Vercel API routes: `/api/ai`

This way:
- ✅ Production uses Railway backend (better for AI)
- ✅ Local development can still use local API routes
- ✅ Graceful fallback if Railway is down

## Troubleshooting

**AI not working?**
- Check Railway is online (green status)
- Check Railway URL is correct in Vercel env vars
- Check Railway has `OPENAI_API_KEY` set
- Check browser console for errors

**CORS errors?**
- Railway backend already has CORS enabled
- Should work automatically

**Still using local API?**
- Make sure env var name is exactly: `NEXT_PUBLIC_RAILWAY_API_URL`
- Make sure you redeployed Vercel after adding the env var
- Check Vercel deployment logs
