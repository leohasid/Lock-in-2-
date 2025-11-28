# Getting Your App to iOS & Android App Stores

Since you can't use Xcode on your MacBook Pro 2020, we'll use **cloud build services** to create the app files.

## ✅ What's Already Done

- ✅ Next.js app configured for static export
- ✅ Capacitor configured (`capacitor.config.ts`)
- ✅ Android platform added
- ✅ App built and synced with Capacitor

## 📱 Option 1: EAS Build (Recommended - Easiest)

**EAS Build** is Expo's cloud build service that works with Capacitor. It can build both iOS and Android apps in the cloud.

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

Create a free Expo account if you don't have one.

### Step 3: Configure EAS Build

Create an `eas.json` file in your project root:

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "buildType": "archive"
      }
    }
  }
}
```

### Step 4: Build for Android

```bash
eas build --platform android
```

This will:
1. Upload your code to Expo's servers
2. Build the Android APK/AAB in the cloud
3. Give you a download link

### Step 5: Build for iOS

```bash
eas build --platform ios
```

**Note:** For iOS, you'll need:
- An **Apple Developer Account** ($99/year)
- To configure your app's bundle identifier

### Step 6: Submit to Stores

**Android (Google Play):**
1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app
3. Upload the AAB file from EAS Build
4. Fill in store listing, screenshots, etc.
5. Submit for review

**iOS (App Store):**
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app
3. Upload the IPA file from EAS Build (or use Transporter app)
4. Fill in store listing, screenshots, etc.
5. Submit for review

---

## 📱 Option 2: GitHub Actions + Fastlane (Free Alternative)

This uses GitHub Actions to build your app automatically.

### Step 1: Set up GitHub Actions

Create `.github/workflows/build-android.yml`:

```yaml
name: Build Android
on:
  push:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '17'
      - name: Build Next.js
        run: npm install && npm run build
      - name: Sync Capacitor
        run: npx cap sync android
      - name: Build APK
        run: |
          cd android
          ./gradlew assembleRelease
      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app-release
          path: android/app/build/outputs/apk/release/app-release.apk
```

### Step 2: For iOS (requires macOS runner)

You'd need a paid GitHub Actions macOS runner or use EAS Build.

---

## 📱 Option 3: Use a Mac in the Cloud (Alternative)

Services like:
- **MacStadium** - Rent a Mac in the cloud
- **MacinCloud** - Virtual Mac access
- **AWS EC2 Mac instances**

Then you can use Xcode directly.

---

## 🚀 Quick Start (EAS Build - Recommended)

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login:**
   ```bash
   eas login
   ```

3. **Initialize EAS:**
   ```bash
   eas build:configure
   ```

4. **Build Android first (easier, no Apple account needed):**
   ```bash
   eas build --platform android
   ```

5. **Once Android is working, build iOS:**
   ```bash
   eas build --platform ios
   ```

## 📋 Before Building - Important Checklist

### For Android:
- [ ] Update `appId` in `capacitor.config.ts` if needed (currently: `com.lockedin.app`)
- [ ] Update app name if needed (currently: "Locked In")
- [ ] Prepare app icon (512x512 PNG)
- [ ] Prepare screenshots for Google Play Store

### For iOS:
- [ ] Get Apple Developer Account ($99/year)
- [ ] Update bundle identifier in `capacitor.config.ts` if needed
- [ ] Prepare app icon (1024x1024 PNG)
- [ ] Prepare screenshots for App Store (various sizes)

## 🔧 Updating Your App

After making changes:

1. **Build the Next.js app:**
   ```bash
   npm run build
   ```

2. **Sync with Capacitor:**
   ```bash
   npx cap sync
   ```

3. **Rebuild with EAS:**
   ```bash
   eas build --platform android
   eas build --platform ios
   ```

## 📞 Need Help?

- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **Capacitor Docs:** https://capacitorjs.com/docs
- **Google Play Console:** https://play.google.com/console
- **App Store Connect:** https://appstoreconnect.apple.com

---

## 🎯 Recommended Next Steps

1. **Start with Android** (easier, no Apple account needed)
2. **Test the APK** on your Android device
3. **Submit to Google Play** once tested
4. **Get Apple Developer Account** for iOS
5. **Build and submit iOS** version

Good luck! 🚀

