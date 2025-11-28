# 🚀 Next Steps to Get Your App on App Stores

## Step 1: Login to EAS (Do this in your terminal)

Open your terminal and run:

```bash
cd /Users/leohasid/locked-in-app
npx eas login
```

This will:
- Ask for your email/username
- If you don't have an Expo account, it will help you create one (it's free!)
- Login to EAS Build service

## Step 2: Configure EAS Build

After logging in, run:

```bash
npx eas build:configure
```

This will create/update the `eas.json` file (already created for you).

## Step 3: Build Android App (Start Here!)

Build your Android app first (it's easier - no Apple account needed):

```bash
npx eas build --platform android
```

This will:
1. Ask you some questions about your build
2. Upload your code to Expo's servers
3. Build your app in the cloud (takes 10-20 minutes)
4. Give you a download link for the APK file

**Choose these options when prompted:**
- Build profile: `production`
- Build type: `apk` (for testing) or `aab` (for Google Play Store)

## Step 4: Test Your Android App

1. Download the APK from the EAS Build link
2. Transfer it to your Android phone
3. Install it (you may need to enable "Install from unknown sources")
4. Test all features!

## Step 5: Build iOS App (After Android Works)

For iOS, you'll need:
- **Apple Developer Account** ($99/year) - Sign up at https://developer.apple.com

Then run:

```bash
npx eas build --platform ios
```

**Choose these options:**
- Build profile: `production`
- Build type: `archive` (for App Store)

## Step 6: Submit to App Stores

### Google Play Store (Android):
1. Go to https://play.google.com/console
2. Create a new app
3. Upload the AAB file (build with `aab` type)
4. Fill in:
   - App name, description
   - Screenshots (required!)
   - App icon
   - Privacy policy URL
5. Submit for review

### Apple App Store (iOS):
1. Go to https://appstoreconnect.apple.com
2. Create a new app
3. Upload the IPA file (or use Transporter app)
4. Fill in:
   - App name, description
   - Screenshots (required!)
   - App icon
   - Privacy policy URL
5. Submit for review

## 📝 Important Notes

- **Android is easier** - Start with Android first!
- **iOS requires Apple Developer Account** - $99/year
- **Screenshots are required** - Take screenshots of your app on a real device
- **App icons needed** - 512x512 for Android, 1024x1024 for iOS
- **Privacy policy** - You'll need a URL for your privacy policy

## 🔄 Updating Your App Later

After making changes to your code:

1. **Build Next.js:**
   ```bash
   npm run build
   ```

2. **Sync Capacitor:**
   ```bash
   npx cap sync
   ```

3. **Commit and push to GitHub:**
   ```bash
   git add -A
   git commit -m "Update app"
   git push origin main
   ```

4. **Rebuild with EAS:**
   ```bash
   npx eas build --platform android
   npx eas build --platform ios
   ```

## ❓ Need Help?

- EAS Build Docs: https://docs.expo.dev/build/introduction/
- EAS Support: https://expo.dev/support

---

## ✅ Quick Checklist

- [ ] Run `npx eas login` (create Expo account if needed)
- [ ] Run `npx eas build:configure`
- [ ] Run `npx eas build --platform android`
- [ ] Test the Android APK on your phone
- [ ] Get Apple Developer Account (for iOS)
- [ ] Run `npx eas build --platform ios`
- [ ] Submit to Google Play Store
- [ ] Submit to Apple App Store

Good luck! 🎉

