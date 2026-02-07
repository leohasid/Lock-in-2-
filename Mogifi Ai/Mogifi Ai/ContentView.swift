//
//  ContentView.swift
//  Mogifi Ai
//
//  Full-screen WebView showing your Vercel app in phone view.
//

import SwiftUI

struct ContentView: View {
    // UPDATE THIS to your actual Vercel URL (check Vercel dashboard)
    private static let appURL = URL(string: "https://lock-in-2-please.vercel.app")!
    
    @State private var isLoading = true
    @State private var loadError: String?
    
    var body: some View {
        ZStack {
            WebView(url: Self.appURL, isLoading: $isLoading, loadError: $loadError)
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
                    Text("Check your Vercel URL in ContentView.swift")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
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
