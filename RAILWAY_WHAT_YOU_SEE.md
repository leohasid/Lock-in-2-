# What You See in Railway During Deployment

## When You First Deploy

Railway will show you something like this:

```
📦 Deploying: Lock-in-2
📁 Detected: Node.js project
📄 Root: / (root directory)
🔍 Looking for: package.json
```

## What Railway Detects

Railway automatically scans your repo and shows:

1. **Project Name:** `Lock-in-2` (your repo name)
2. **Detected Framework:** Usually shows "Node.js" or "Nixpacks"
3. **Root Directory:** Shows `/` (root) by default
4. **Build Command:** Auto-detects from `package.json`
5. **Start Command:** Auto-detects from `package.json`

## The Problem

Railway is looking at the **ROOT** of your repo, which has:
- `package.json` (frontend Next.js)
- `app/` folder (Next.js app)
- `backend/` folder (your Express backend)

Railway will try to deploy the **frontend** (Next.js) instead of the backend!

## What You Need to Change

After Railway starts deploying, you need to tell it:

**"Use the `backend/` folder instead of root"**

## Where to Find This Setting

1. **After deployment starts**, click on your **service** (the box that says "Lock-in-2" or similar)

2. **Click the "Settings" tab** (gear icon or "Settings" button)

3. **Scroll down** to find:
   ```
   Root Directory
   [________________]  ← Currently shows "/" or empty
   ```

4. **Change it to:**
   ```
   Root Directory
   [backend________]  ← Type "backend" here
   ```

5. **Click "Save"** or Railway will auto-save

6. **Railway will automatically redeploy** with the new setting

## What Happens After You Set Root Directory

Railway will show:
```
📦 Redeploying: Lock-in-2
📁 Root: backend/
📄 Using: backend/package.json
🔨 Build: npm install (from backend/package.json)
🚀 Start: npm start (from backend/package.json)
```

## Visual Guide

```
Railway Dashboard:
┌─────────────────────────────────┐
│  Lock-in-2                      │ ← Your service name
│  ───────────────────────────── │
│  [Settings] [Variables] [Logs] │
│                                 │
│  Root Directory:                 │
│  [backend________________]      │ ← CHANGE THIS!
│                                 │
│  Build Command:                 │
│  npm install                    │ ← Auto-detected
│                                 │
│  Start Command:                 │
│  npm start                      │ ← Auto-detected
└─────────────────────────────────┘
```

## If You Can't Find Root Directory

**Option 1:** Look in different places:
- Service → Settings → Scroll down
- Service → Configure → Root Directory
- Service → Three dots (⋯) → Settings

**Option 2:** Use Railway CLI (command line):
```bash
railway variables set RAILWAY_ROOT_DIRECTORY=backend
```

**Option 3:** Create separate backend repo (easiest long-term)

## What Files Railway Will Use After Setting Root Directory

With `Root Directory = backend`, Railway will:
- ✅ Use `backend/package.json`
- ✅ Use `backend/server.js`
- ✅ Run `npm install` in `backend/` folder
- ✅ Run `npm start` from `backend/` folder
- ❌ Ignore root `package.json` (frontend)
- ❌ Ignore `app/` folder (frontend)

This is exactly what you want!
