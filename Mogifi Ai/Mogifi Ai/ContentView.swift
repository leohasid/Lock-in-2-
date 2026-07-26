//
//  ContentView.swift
//  Mogifi Ai
//
//  Launch sequence:
//    1. Check subscription status natively (StoreKit / UserDefaults).
//    2. Not subscribed → NativePaywallView (pure SwiftUI, no web dependency).
//    3. Subscribed → WebView (Vercel app, onboarding + all features).
//
//  This means Apple reviewers always hit a native IAP screen first,
//  independent of App Store Connect product approval timing or the JS bridge.
//

import SwiftUI

struct ContentView: View {
    private static var appURL: URL {
        let ver   = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "0"
        var c = URLComponents(string: "https://lock-in-2-please.vercel.app")!
        c.queryItems = [URLQueryItem(name: "native_build", value: "\(ver)(\(build))")]
        return c.url!
    }

    private enum AppState { case launching, paywall, app }

    @State private var appState: AppState = .launching
    @State private var isLoading   = true
    @State private var loadError: String?
    @State private var webViewKey  = 0

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            switch appState {
            case .launching:
                splashView

            case .paywall:
                NativePaywallView {
                    withAnimation(.easeInOut(duration: 0.35)) {
                        appState = .app
                    }
                }
                .transition(AnyTransition.opacity)

            case .app:
                appView
                    .transition(AnyTransition.opacity)
            }
        }
        .task {
            SubscriptionManager.startObservingTransactions()
            await SubscriptionManager.syncEntitlementsToUserDefaults()
            let (active, _) = SubscriptionManager.subscriptionStatusFromUserDefaults()
            withAnimation(.easeInOut(duration: 0.25)) {
                appState = active ? .app : .paywall
            }
        }
    }

    // MARK: - Splash

    private var splashView: some View {
        VStack(spacing: 14) {
            RoundedRectangle(cornerRadius: 20)
                .fill(
                    LinearGradient(
                        colors: [Color(red: 0.15, green: 0.45, blue: 0.9),
                                 Color(red: 0.1, green: 0.75, blue: 0.85)],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                )
                .frame(width: 72, height: 72)
                .overlay(
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(.white)
                )
            Text("Mogifi AI")
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(.white)
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: Color(white: 0.4)))
                .padding(.top, 4)
        }
    }

    // MARK: - WebView wrapper

    private var appView: some View {
        ZStack {
            WebView(url: Self.appURL, isLoading: $isLoading, loadError: $loadError)
                .id(webViewKey)
                .ignoresSafeArea(.all, edges: .bottom)

            if isLoading {
                VStack(spacing: 12) {
                    ProgressView()
                        .scaleEffect(1.5)
                    Text("Loading…")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(.white)
            }

            if let error = loadError {
                VStack(spacing: 16) {
                    Image(systemName: "wifi.exclamationmark")
                        .font(.system(size: 48))
                        .foregroundStyle(.red)
                    Text("Failed to load")
                        .font(.headline)
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                    Text("If you were scanning food, tap Dismiss — your result may have loaded.")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                    HStack(spacing: 12) {
                        Button("Dismiss") { loadError = nil }
                            .buttonStyle(.bordered)
                        Button("Retry") {
                            loadError = nil
                            isLoading = true
                            webViewKey += 1
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding(.top, 8)
                }
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(.white)
            }
        }
    }
}

#Preview {
    ContentView()
}
