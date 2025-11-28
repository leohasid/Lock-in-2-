# 🔧 Fix Food Scanning Error

## ❌ Problem

When you take a photo of food, you get:
"Server returned an invalid response. Please check your API configuration."

## ✅ Solution: Add OpenAI API Key to Vercel

The error happens because your `OPENAI_API_KEY` is not set in Vercel's environment variables.

### Step 1: Get Your OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Sign in to your OpenAI account
3. Click "Create new secret key"
4. Copy the key (you won't see it again!)

### Step 2: Add to Vercel

1. **Go to Vercel Dashboard:**
   https://vercel.com/dashboard

2. **Find Your Project:**
   - Click on "Locked In" or "locked-in-app"

3. **Go to Settings:**
   - Click "Settings" tab
   - Click "Environment Variables" in the left sidebar

4. **Add the Key:**
   - **Name:** `OPENAI_API_KEY`
   - **Value:** Paste your OpenAI API key
   - **Environment:** Select all (Production, Preview, Development)
   - Click "Save"

5. **Redeploy:**
   - Go to "Deployments" tab
   - Click the 3 dots (⋯) on the latest deployment
   - Click "Redeploy"
   - Or push a new commit to trigger a redeploy

### Step 3: Test Again

1. Wait for redeploy to complete (1-2 minutes)
2. Refresh your app on your phone
3. Try scanning food again

## 🎯 Quick Steps Summary

1. Get OpenAI API key: https://platform.openai.com/api-keys
2. Add to Vercel: Settings → Environment Variables
3. Name: `OPENAI_API_KEY`
4. Value: Your API key
5. Redeploy your app
6. Test again!

## 💡 Why This Happens

- Your app code is correct
- But Vercel doesn't have the API key
- So the API route returns an error page (HTML) instead of JSON
- The app sees HTML and shows the error message

## ✅ After Adding the Key

Once you add `OPENAI_API_KEY` to Vercel and redeploy:
- Food scanning will work
- AI consultation will work
- All OpenAI features will work

---

**Important:** Make sure to redeploy after adding the environment variable!

