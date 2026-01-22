# Railway Setup - When You Only See "Branch" Button

## The Problem
Railway UI shows a "Branch" button but no "Root Directory" option.

## Solution 1: Use Railway CLI (Easiest)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Link to your project:**
   ```bash
   railway link
   ```
   (Select your "Lock-in-2" project)

4. **Set root directory:**
   ```bash
   railway variables set RAILWAY_ROOT_DIRECTORY=backend
   ```

5. **Deploy:**
   ```bash
   railway up
   ```

---

## Solution 2: Modify Start Command (Quick Fix)

If you can see a "Start Command" or "Command" field in Railway:

1. **Find the "Start Command" or "Command" field**
2. **Change it from:**
   ```
   npm start
   ```
   
   **To:**
   ```
   cd backend && npm start
   ```

3. **Also change "Build Command" to:**
   ```
   cd backend && npm install
   ```

This tells Railway to change into the backend folder before running commands.

---

## Solution 3: Create Separate Backend Repo (Most Reliable)

This is the **easiest and most reliable** solution:

1. **Create new GitHub repo:**
   - Go to GitHub
   - Create new repo called `mogifi-backend`
   - Make it private or public (your choice)

2. **Copy backend files to new repo:**
   
   I'll help you do this with commands, or you can:
   - Create a new folder
   - Copy `backend/` folder contents
   - Push to new repo

3. **Deploy the new repo to Railway:**
   - No root directory needed!
   - Just deploy normally
   - Everything works automatically

---

## What to Look For in Railway

After clicking on your service, look for these fields:

- **Branch:** (you see this) - Select `main` or `master`
- **Start Command:** (look for this) - Change to `cd backend && npm start`
- **Build Command:** (look for this) - Change to `cd backend && npm install`
- **Variables:** (tab) - Add `OPENAI_API_KEY`

---

## Which Solution Should You Use?

**If you see "Start Command" field:**
→ Use **Solution 2** (modify commands)

**If you don't see "Start Command":**
→ Use **Solution 1** (Railway CLI) or **Solution 3** (separate repo)

**Easiest long-term:**
→ Use **Solution 3** (separate backend repo)

Let me know which one you want to try!
