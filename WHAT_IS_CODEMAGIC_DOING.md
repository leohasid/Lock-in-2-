# What Is Codemagic Doing?

## What Codemagic Is

**Codemagic is a cloud build service** - it builds your iOS app in the cloud so you don't need Xcode on your Mac.

Think of it like:
- **Your Mac**: Can't build iOS apps (no Xcode)
- **Codemagic's servers**: Have Xcode and can build for you
- **Result**: You get a finished iOS app file (`.ipa`) to install on your iPhone

## What Happens During a Build

### Step 1: Setup (1-2 minutes)
- Codemagic downloads your code from GitHub
- Installs dependencies (npm packages)
- Sets up the build environment

### Step 2: Build Web App (2-5 minutes)
- Runs `npm run build` to create your Next.js app
- Creates the static files in the `out` folder
- This is what Capacitor uses

### Step 3: Sync with Capacitor (1-2 minutes)
- Runs `npx cap sync` to copy web files to iOS project
- Updates iOS project with your latest code

### Step 4: Build iOS App (5-15 minutes)
- Compiles your Swift code
- Builds the iOS app (`.ipa` file)
- Signs it with your Apple Developer certificate

### Step 5: Done! (Total: 10-20 minutes)
- You get a download link
- Or a QR code to scan with your iPhone
- Install and test!

## What You'll See

During the build, you'll see:
- ✅ Green checkmarks = Step completed
- ⏳ Spinning = Currently building
- ❌ Red X = Error (rare, but can happen)

## Timeline

```
0:00 - Setup starts
1:00 - Installing dependencies
3:00 - Building web app
5:00 - Syncing Capacitor
7:00 - Building iOS app
15:00 - Signing app
18:00 - ✅ Build complete!
```

## What You Get

After the build finishes:
1. **Download link** - Click to download `.ipa` file
2. **QR code** - Scan with iPhone to install
3. **Install instructions** - How to put it on your phone

## Common Questions

**Q: How long does it take?**
A: Usually 10-20 minutes for first build

**Q: Is it free?**
A: Free tier has 500 build minutes/month (plenty for testing)

**Q: Do I need Apple Developer account?**
A: Yes, for App Store/TestFlight ($99/year). Or use ad-hoc signing (free but limited)

**Q: Can I cancel a build?**
A: Yes, click "Cancel" button

**Q: What if build fails?**
A: Check the logs - usually a simple fix (missing file, wrong config, etc.)

## What's Happening Right Now?

If you started a build:
- Check the Codemagic dashboard
- You'll see progress updates
- Wait for it to finish (10-20 minutes)
- Then download your app!

## Summary

**Codemagic = Cloud Xcode**
- Builds your iOS app without needing Xcode
- Takes 10-20 minutes
- Gives you a file to install on iPhone
- That's it!

Just wait for the build to finish, then download and install! 🚀

