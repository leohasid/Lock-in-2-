# EAS Build Setup Guide - Step by Step

## Step 1: Open Terminal

On your Mac:
1. Press `Cmd + Space` to open Spotlight
2. Type "Terminal" and press Enter
3. Terminal window will open

## Step 2: Navigate to Your Project

In Terminal, type:
```bash
cd /Users/leohasid/locked-in-app
```

Press Enter. You should see your project path.

## Step 3: Install EAS CLI

Copy and paste this command into Terminal:
```bash
npm install -g eas-cli
```

Press Enter. It will install EAS CLI globally.

**Wait for it to finish** - you'll see something like:
```
+ eas-cli@x.x.x
added 1 package in 5s
```

## Step 4: Login to Expo

After installation, login:
```bash
eas login
```

Press Enter. It will:
- Ask for your email (or you can create an account)
- Send you a verification code
- Enter the code when prompted

## Step 5: Configure EAS Build

Configure EAS for your project:
```bash
eas build:configure
```

Press Enter. This will:
- Update your `eas.json` file
- Set up build profiles

## Step 6: Build iOS App

Build your iOS app in the cloud:
```bash
eas build --platform ios
```

Press Enter. This will:
- Upload your code to Expo's servers
- Build your iOS app in the cloud
- Give you a download link when done

**Note:** First build takes 10-20 minutes. You'll get a link to download the `.ipa` file.

## Troubleshooting

**If npm command not found:**
- Install Node.js first: https://nodejs.org/
- Then try again

**If permission errors:**
- Use `sudo` (not recommended) OR
- Fix npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally

**If EAS login fails:**
- Make sure you have internet connection
- Check your email for verification code

## What Happens Next?

After the build completes:
1. You'll get a download link
2. Download the `.ipa` file
3. Install on your iPhone using:
   - TestFlight (if you have Apple Developer account)
   - Or direct install via Xcode (if you get access later)

## Quick Copy-Paste Commands

Copy these one by one into Terminal:

```bash
cd /Users/leohasid/locked-in-app
```

```bash
npm install -g eas-cli
```

```bash
eas login
```

```bash
eas build:configure
```

```bash
eas build --platform ios
```

That's it! The build will happen in the cloud.

