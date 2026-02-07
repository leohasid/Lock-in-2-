# Mogifi Ai – iOS app

Native iOS wrapper that loads your **Vercel** web app in a full-screen WebView (phone view).

## Architecture

- **Vercel** – hosts your frontend (this Next.js app)
- **Railway** – hosts your backend API
- **Mogifi Ai (Xcode)** – native iOS shell that displays the Vercel app in a WKWebView

Keep using Vercel and Railway; the iOS app only loads your web app.

## How to open in Xcode

1. Open **Mogifi Ai.xcodeproj** in Xcode (double-click or `File > Open`)
2. Choose an iPhone simulator or a connected device
3. Press **Run** (⌘R)

## Update the URL

If your Vercel deployment uses a different URL, change it in `Mogifi Ai/ContentView.swift`:

```swift
private static let appURL = URL(string: "https://mogifi-ai-app.vercel.app")!
```

## Requirements

- Xcode 15+
- iOS 17.0+
- Vercel deployment live and reachable
