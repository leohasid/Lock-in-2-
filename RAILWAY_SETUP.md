# Railway Setup - Step by Step

## Problem: Railway doesn't show "Root Directory" option immediately

Here's how to fix it:

## Method 1: Configure After Deployment (Easiest)

1. **Deploy the repo normally:**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select "Lock-in-2" repository
   - Let Railway deploy (it will fail or deploy the wrong thing, that's OK)

2. **After deployment, configure Root Directory:**
   - Click on your **service** (the deployed app)
   - Go to **Settings** tab
   - Scroll down to **"Root Directory"** section
   - Enter: `backend`
   - Click **Save**
   - Railway will automatically redeploy with the correct directory

3. **Set Environment Variables:**
   - Still in Settings, go to **Variables** tab
   - Add: `OPENAI_API_KEY` = `your-key-here`
   - Railway auto-sets `PORT` (don't change it)

4. **Redeploy:**
   - Go to **Deployments** tab
   - Click **Redeploy** (or it will auto-redeploy after saving settings)

---

## Method 2: Use Railway CLI (Alternative)

If the UI doesn't work, use Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Set root directory
railway variables set RAILWAY_ROOT_DIRECTORY=backend

# Deploy
railway up
```

---

## Method 3: Create Separate Backend Repo (Most Reliable)

If Railway keeps having issues:

1. **Create a new GitHub repository** called `mogifi-backend`
2. **Copy only backend files:**
   ```bash
   # In a new folder
   mkdir mogifi-backend
   cd mogifi-backend
   
   # Copy backend files
   cp -r ../locked-in-app/backend/* .
   
   # Initialize git
   git init
   git add .
   git commit -m "Initial backend"
   git remote add origin https://github.com/yourusername/mogifi-backend.git
   git push -u origin main
   ```

3. **Deploy this new repo to Railway** (no root directory needed!)

---

## What to Look For in Railway UI

After clicking on your service, look for:
- **Settings** → **Root Directory** (might be at the bottom)
- Or **Configure** → **Root Directory**
- Or in the service **Settings** → scroll down

If you still can't find it, use **Method 3** (separate repo) - it's the most reliable!
