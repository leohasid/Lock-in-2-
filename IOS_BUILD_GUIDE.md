# 📱 iOS Build Guide - After Android is Done

## ⚠️ Important: iOS Requires Apple Developer Account

Before building for iOS, you need:
- **Apple Developer Account** - $99/year
- Sign up at: https://developer.apple.com/programs/

## 🚀 Steps to Build iOS App

### Step 1: Get Apple Developer Account

1. Go to: https://developer.apple.com/programs/
2. Click "Enroll"
3. Sign in with your Apple ID (or create one)
4. Pay $99/year subscription
5. Wait for approval (usually instant, but can take up to 48 hours)

### Step 2: Update eas.json for iOS

Once you have your Apple Developer account, we'll need to update the `eas.json` file to include iOS configuration.

### Step 3: Build iOS App

Run this command in your terminal:

```bash
cd /Users/leohasid/locked-in-app
npx eas build --platform ios
```

**When it asks:**
- "Would you like to automatically create an EAS project?" → Type `y` (if not already created)
- "Which build profile?" → Type `production`
- It will ask about your Apple Developer account credentials

### Step 4: Configure iOS Build

EAS will ask you to:
1. **Select your Apple Developer Team** (from your account)
2. **Choose distribution method:**
   - `app-store` - For App Store submission (recommended)
   - `ad-hoc` - For testing on specific devices
   - `development` - For development builds

3. **Bundle identifier:** Use `com.lockedin.app` (same as Android)

### Step 5: Wait for Build

- iOS builds take 15-30 minutes
- You'll get a download link for the `.ipa` file when done

## 📋 iOS Build Checklist

Before building iOS, make sure:

- [ ] You have Apple Developer Account ($99/year)
- [ ] Your account is approved and active
- [ ] You have your Apple ID credentials ready
- [ ] You know which Apple Developer Team to use

## 🎯 After iOS Build Completes

### Option 1: Submit to App Store (Recommended)

1. **Download the IPA file** from EAS Build
2. **Use Transporter app** (free from Mac App Store) to upload:
   - Open Transporter
   - Drag and drop your `.ipa` file
   - Click "Deliver"
3. **Or use EAS Submit:**
   ```bash
   npx eas submit --platform ios
   ```

### Option 2: Test on Your iPhone

1. Download the IPA
2. Use **TestFlight** (Apple's beta testing service)
3. Or use **ad-hoc** distribution for direct installation

## 🔄 Updating Your App

After making changes:

1. **Build Next.js:**
   ```bash
   npm run build
   ```

2. **Sync Capacitor:**
   ```bash
   npx cap sync
   ```

3. **Rebuild iOS:**
   ```bash
   npx eas build --platform ios
   ```

## 📝 Important Notes

- **iOS builds are more complex** than Android
- **Requires Apple Developer Account** ($99/year)
- **First build takes longer** (certificates need to be set up)
- **Subsequent builds are faster**

## 🆘 Common Issues

### "No Apple Developer Team found"
- Make sure you're logged into the correct Apple ID
- Verify your Apple Developer account is active
- Check that you've accepted the latest agreements

### "Bundle identifier already in use"
- The bundle ID `com.lockedin.app` must be unique
- If it's taken, we'll need to change it in `capacitor.config.ts`

### "Certificate issues"
- EAS handles certificates automatically
- If there are issues, EAS will guide you through fixing them

## ✅ Quick Reference

**Build iOS:**
```bash
npx eas build --platform ios
```

**Submit to App Store:**
```bash
npx eas submit --platform ios
```

**View builds:**
https://expo.dev/accounts/[your-username]/builds

---

## 🎯 Recommended Order

1. ✅ **Finish Android build** (you're doing this now)
2. ✅ **Test Android app** on your phone
3. ✅ **Get Apple Developer Account** ($99/year)
4. ✅ **Build iOS app** with `npx eas build --platform ios`
5. ✅ **Submit both to stores**

Good luck! 🚀

