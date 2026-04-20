//
//  ContentView.swift
//  Mogifi Ai
//
//  Full-screen WebView showing your Vercel app in phone view.
//

import SwiftUI

struct ContentView: View {
    /// Per-build query helps avoid WKWebView/CDN serving a very old HTML shell (unknown query params are ignored by Next.js).
    private static var appURL: URL {
        let ver = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "0"
        var c = URLComponents(string: "https://lock-in-2-please.vercel.app")!
        c.queryItems = [URLQueryItem(name: "native_build", value: "\(ver)(\(build))")]
        return c.url!
    }
    
    @State private var isLoading = true
    @State private var loadError: String?
    @State private var webViewKey = 0
    
    var body: some View {
        ZStack {
            Color.black
                .ignoresSafeArea()
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
                    Text("If you were scanning food, try Dismiss first—your result may have loaded.")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                    HStack(spacing: 12) {
                        Button("Dismiss") {
                            loadError = nil
                        }
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
