# Railway CLI Setup - Set Root Directory

After installing Railway CLI, run these commands:

```bash
# Login to Railway
railway login

# Link to your project (select "lock-in-2" when prompted)
railway link

# Set root directory to backend
railway variables set RAILWAY_ROOT_DIRECTORY=backend

# Or use this command to set it directly
railway variables set RAILWAY_ROOT_DIRECTORY backend
```

This will tell Railway to only use the `backend/` folder and ignore the root Next.js app.
