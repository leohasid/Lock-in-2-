//
//  Mogifi_AiApp.swift
//  Mogifi Ai
//
//  SwiftUI app that loads your Vercel web app in a full-screen WebView.
//  Keep Vercel (frontend) and Railway (backend) — this is just the native iOS wrapper.
//

import SwiftUI

@main
struct MogifiAiApp: App {
    init() {
        SubscriptionManager.startObservingTransactions()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
