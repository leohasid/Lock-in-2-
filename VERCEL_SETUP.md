# 🔗 Vercel GitHub Connection Setup

## If Vercel is asking you to connect to GitHub:

### Option 1: Connect via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard

2. **Import/Add Project:**
   - Click "Add New..." → "Project"
   - Or click "Import Project" if you see it

3. **Connect GitHub:**
   - You'll see a list of your GitHub repositories
   - Find: `leohasid/Lock-in-2-`
   - Click "Import" next to it

4. **Configure Project:**
   - Framework Preset: **Next.js** (should auto-detect)
   - Root Directory: `./` (leave as default)
   - Build Command: `npm run build` (should be default)
   - Output Directory: `.next` (should be default)
   - Install Command: `npm install` (should be default)

5. **Environment Variables (if needed):**
   - If you have `OPENAI_API_KEY`, add it here:
     - Key: `OPENAI_API_KEY`
     - Value: (your API key)

6. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete

### Option 2: Use Vercel CLI (Alternative)

If you prefer command line:

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
cd /Users/leohasid/locked-in-app
vercel link

# Deploy
vercel --prod
```

### After Connecting:

Once connected, Vercel will:
- ✅ Auto-deploy on every push to `main` branch
- ✅ Show deployment status in dashboard
- ✅ Give you a URL like: `https://lock-in-2-please.vercel.app`

### Verify Connection:

1. Go to Vercel Dashboard → Your Project
2. Click "Settings" → "Git"
3. Should show:
   - **Git Repository:** `leohasid/Lock-in-2-`
   - **Production Branch:** `main`
   - **Auto-deploy:** Enabled

### If Already Connected but Not Deploying:

1. Go to Settings → Git
2. Click "Disconnect" then "Connect Git Repository" again
3. Select `leohasid/Lock-in-2-`
4. Confirm branch is `main`

---

**Your Repository Info:**
- GitHub: `git@github.com:leohasid/Lock-in-2-.git`
- Branch: `main`
- Latest commit: `60f6ec8`

