# Test AI Connection - Step by Step

## Step 1: Redeploy Vercel (Important!)

The environment variable won't work until you redeploy:

1. Go to **Vercel Dashboard**
2. Click on your project
3. Go to **Deployments** tab
4. Find the latest deployment
5. Click the **three dots (⋯)** on the right
6. Click **Redeploy**
7. Wait for deployment to complete (2-3 minutes)

**OR** just push a new commit to trigger auto-deploy.

## Step 2: Verify Environment Variable is Set

1. In Vercel, go to **Settings** → **Environment Variables**
2. Make sure you see:
   - `NEXT_PUBLIC_RAILWAY_API_URL` 
   - Value should be your Railway URL (e.g., `https://your-app.up.railway.app`)
   - Should be enabled for Production, Preview, and Development

## Step 3: Test Railway Backend

Before testing the frontend, make sure Railway is working:

1. Go to your Railway dashboard
2. Check your service is **online** (green status)
3. Click on your service → **Settings** → **Networking**
4. Copy your public URL
5. Test in browser: `https://your-railway-url.up.railway.app/health`
   - Should return: `{"status":"ok","service":"mogifi-ai-backend"}`
6. Test AI endpoint (optional):
   ```bash
   curl -X POST https://your-railway-url.up.railway.app/api/ai \
     -H "Content-Type: application/json" \
     -d '{"prompt":"Hello, test"}'
   ```

## Step 4: Test Frontend AI Features

After Vercel redeploys:

1. **Visit your Vercel site** (e.g., `https://your-app.vercel.app`)

2. **Test Consultation Page:**
   - Go to **Consultation** page
   - Type a message like "What's a good workout plan?"
   - Click Send
   - Should get an AI response from Railway

3. **Test Nutrition AI Coach:**
   - Go to **Nutrition** page
   - Click **AI Coach** button
   - Type a question like "How much protein should I eat?"
   - Click Send
   - Should get an AI response

## Step 5: Check Browser Console

If it's not working:

1. Open browser **Developer Tools** (F12 or Right-click → Inspect)
2. Go to **Console** tab
3. Try using AI features
4. Look for errors:
   - CORS errors? → Railway CORS should be enabled
   - 404 errors? → Check Railway URL is correct
   - Network errors? → Check Railway is online

## Troubleshooting

**AI still not working?**

1. **Check Railway is online:**
   - Railway dashboard → Service should be green
   - Test `/health` endpoint directly

2. **Check Railway has OpenAI key:**
   - Railway → Settings → Variables
   - Should have `OPENAI_API_KEY` set

3. **Check Vercel env var:**
   - Vercel → Settings → Environment Variables
   - Name: `NEXT_PUBLIC_RAILWAY_API_URL` (exact match, case-sensitive)
   - Value: Your Railway URL (with https://)

4. **Check you redeployed:**
   - Environment variables only work after redeploy
   - Check Vercel deployment logs

5. **Check browser console:**
   - Open DevTools → Console
   - Look for error messages
   - Check Network tab for failed requests

## Quick Test Commands

**Test Railway directly:**
```bash
# Health check
curl https://your-railway-url.up.railway.app/health

# Test AI endpoint
curl -X POST https://your-railway-url.up.railway.app/api/ai \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello"}'
```

**Check what URL frontend is using:**
- Open browser console
- Type: `console.log(process.env.NEXT_PUBLIC_RAILWAY_API_URL)`
- Should show your Railway URL (only works in browser, not in code)
