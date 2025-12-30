# iOS App Blocking Setup Guide

## ✅ What's Been Created

1. **AppBlockingPlugin.swift** - Native iOS plugin for blocking apps
2. **Updated AppDelegate.swift** - App state monitoring
3. **Web bridge** - Connection between web and native code

## 📋 Next Steps to Complete Setup

### 1. Register the Plugin in Xcode

1. Open your iOS project in Xcode:
   ```bash
   cd ios/App
   open App.xcworkspace
   ```

2. Add `AppBlockingPlugin.swift` to your Xcode project:
   - Right-click on the `App` folder in Xcode
   - Select "Add Files to App..."
   - Select `AppBlockingPlugin.swift`
   - Make sure "Copy items if needed" is checked
   - Click "Add"

3. Register the plugin in `AppDelegate.swift`:
   - The plugin needs to be registered with Capacitor
   - Add this import at the top:
     ```swift
     import Capacitor
     ```

### 2. Update Capacitor Bridge

The plugin needs to be registered with Capacitor. Update your bridge configuration:

1. In Xcode, find where Capacitor plugins are registered
2. Add the AppBlocking plugin to the plugin registry

### 3. Add URL Scheme (for opening Locked In app)

1. In Xcode, select your project
2. Go to "Info" tab
3. Under "URL Types", add:
   - **Identifier**: `com.lockedin.app`
   - **URL Schemes**: `lockedin`

### 4. Test the Implementation

1. Build and run on a real iOS device (simulator won't work for app blocking)
2. Test blocking an app:
   - Set a low limit (e.g., 1 minute)
   - Use the app for 1 minute
   - Try to open it again - should show blocking screen

## 🔧 How It Works

1. **Web detects limit reached** → Calls `blockAppNative()`
2. **Native plugin receives call** → Adds app to `blockedApps` set
3. **Blocking window appears** → Full-screen overlay prevents app usage
4. **User clicks "Open Locked In"** → Opens your app via URL scheme

## ⚠️ Important Notes

### iOS Limitations

- **True app blocking is not possible** without MDM (Mobile Device Management)
- This implementation shows a **blocking overlay** when the app is opened
- The overlay can be dismissed by force-quitting, but it will reappear
- This is the best approach for consumer apps

### App Store Considerations

- Apple may ask about blocking functionality during review
- Explain it's for self-control and productivity
- Mention it requires user consent and is opt-in

## 🚀 Testing Checklist

- [ ] Plugin compiles without errors
- [ ] App builds successfully
- [ ] Blocking screen appears when limit reached
- [ ] "Open Locked In" button works
- [ ] Multiple apps can be blocked simultaneously
- [ ] Unblocking works correctly

## 📝 Code Structure

```
ios/App/App/
├── AppDelegate.swift          # App lifecycle management
├── AppBlockingPlugin.swift   # Native blocking plugin
└── Info.plist                # URL scheme configuration
```

## 🐛 Troubleshooting

**Plugin not found:**
- Make sure `AppBlockingPlugin.swift` is added to Xcode project
- Check that it's included in the build target

**Blocking screen doesn't appear:**
- Check console logs for errors
- Verify plugin is being called from web
- Test on real device (not simulator)

**URL scheme doesn't work:**
- Verify URL scheme is added to Info.plist
- Check that scheme matches: `lockedin://`

## 📚 Additional Resources

- [Capacitor Plugin Development](https://capacitorjs.com/docs/plugins)
- [iOS App Lifecycle](https://developer.apple.com/documentation/uikit/app_and_environment/managing_your_app_s_life_cycle)
- [URL Schemes](https://developer.apple.com/documentation/xcode/defining-a-custom-url-scheme-for-your-app)

