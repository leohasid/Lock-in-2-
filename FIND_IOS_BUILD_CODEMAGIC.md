# How to Find iOS Build in Codemagic

## Step-by-Step Guide

### Step 1: Go to Your App
1. Log into Codemagic
2. Click on your app (should be "Lock-in-2-" or "locked-in-app")
3. You should see a dashboard

### Step 2: Start a New Build
1. Look for a button that says:
   - **"Start new build"** OR
   - **"Build"** button OR
   - **"Start build"**
2. Click it

### Step 3: Select Platform
After clicking "Start new build", you'll see:
- **iOS** checkbox
- **Android** checkbox
- **Web** checkbox

**Check the "iOS" box** ✅

### Step 4: Configure (If Asked)
Codemagic might ask:
- **Workflow**: Select "iOS" or "Default"
- **Branch**: Select "main" (or your main branch)
- **Configuration**: Use default or select iOS

### Step 5: Start Build
Click **"Start new build"** or **"Build"** button

## If You Don't See iOS Option

### Option A: Add iOS Workflow
1. Go to **"Workflows"** tab
2. Click **"Add workflow"** or **"Edit workflow"**
3. Select **"iOS"** platform
4. Save

### Option B: Check App Settings
1. Go to **"Settings"** or **"Configuration"**
2. Make sure **iOS** is enabled
3. Check that your app is connected to GitHub

### Option C: Create New App
If you can't find it:
1. Click **"Add application"** (top right)
2. Select your GitHub repo: `leohasid/Lock-in-2-`
3. Codemagic will auto-detect it's a Capacitor project
4. Select **"iOS"** when asked
5. Click **"Add application"**

## What to Look For

**In Codemagic Dashboard:**
- Look for tabs: **"Builds"**, **"Workflows"**, **"Settings"**
- Look for buttons: **"Start new build"**, **"Build"**, **"Add workflow"**
- Look for platform icons: 📱 (iOS), 🤖 (Android)

## Screenshot Guide

**What you should see:**
```
┌─────────────────────────────────┐
│  Your App Name                  │
├─────────────────────────────────┤
│  [Start new build]  [Settings] │
├─────────────────────────────────┤
│  Recent builds:                 │
│  (empty or previous builds)     │
└─────────────────────────────────┘
```

**After clicking "Start new build":**
```
┌─────────────────────────────────┐
│  Select platform:              │
│  ☐ iOS                         │
│  ☐ Android                     │
│  ☐ Web                         │
│                                │
│  [Cancel]  [Start build]      │
└─────────────────────────────────┘
```

## Still Can't Find It?

**Try this:**
1. Go to Codemagic homepage
2. Click **"Add application"** (big button)
3. Connect your GitHub repo
4. When it asks "What type of app?", select **"Flutter"** or **"React Native"** (Codemagic might not have Capacitor option, but these work)
5. Then manually configure for Capacitor

**OR**

1. Go to **"Workflows"** tab
2. Click **"Add workflow"**
3. Select **"iOS"**
4. Configure manually

## Quick Checklist

- [ ] Logged into Codemagic?
- [ ] App is added/connected?
- [ ] Looking at the right app?
- [ ] Clicked "Start new build"?
- [ ] Selected iOS checkbox?
- [ ] Clicked "Start build" button?

## Need Help?

**Tell me:**
1. What do you see when you log into Codemagic?
2. Do you see your app listed?
3. What buttons/tabs do you see?
4. Are you on the dashboard or settings page?

I can help you find it! 🚀

