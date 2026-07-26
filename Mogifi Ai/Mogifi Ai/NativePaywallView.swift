//
//  NativePaywallView.swift
//  Mogifi Ai
//
//  Native SwiftUI paywall shown before the WebView loads.
//  Uses StoreKit 2 directly — no JS bridge, no web dependency.
//  After a successful purchase or restore, onSubscribed() is called
//  and ContentView transitions to the full WebView.
//

import SwiftUI
import StoreKit

@MainActor
struct NativePaywallView: View {
    let onSubscribed: () -> Void

    @State private var selectedPlan: Plan = .monthly
    @State private var monthlyProduct: Product?
    @State private var yearlyProduct: Product?
    @State private var productsLoading = true
    @State private var isPurchasing = false
    @State private var isRestoring = false
    @State private var errorMessage: String?

    enum Plan { case monthly, yearly }

    private var activeProduct: Product? {
        selectedPlan == .monthly ? monthlyProduct : yearlyProduct
    }

    // MARK: - Body

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 28) {
                    headerSection
                    planToggle
                    if let msg = errorMessage { errorBanner(msg) }
                    pricingCard
                    restoreButton
                    legalText
                }
                .padding(.horizontal, 24)
                .padding(.top, 64)
                .padding(.bottom, 48)
            }
        }
        .task { await loadProducts() }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 14) {
            RoundedRectangle(cornerRadius: 20)
                .fill(
                    LinearGradient(
                        colors: [Color(red: 0.15, green: 0.45, blue: 0.9),
                                 Color(red: 0.1, green: 0.75, blue: 0.85)],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                )
                .frame(width: 88, height: 88)
                .overlay(
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 40, weight: .bold))
                        .foregroundColor(.white)
                )

            Text("Unlock Your Potential")
                .font(.system(size: 30, weight: .bold))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)

            Text("Your personalized plan is ready.\nSubscribe to get started.")
                .font(.system(size: 15))
                .foregroundColor(Color(white: 0.55))
                .multilineTextAlignment(.center)
                .lineSpacing(5)

            if let mp = monthlyProduct {
                Text("3 days free, then \(mp.displayPrice)/month")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Color(red: 0.37, green: 0.87, blue: 0.76))
            }
        }
    }

    // MARK: - Plan toggle

    private var planToggle: some View {
        HStack(spacing: 3) {
            toggleButton(.monthly, title: "Monthly")
            toggleButton(.yearly, title: "Yearly · Save 17%")
        }
        .padding(4)
        .background(Color(white: 0.08))
        .cornerRadius(14)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }

    private func toggleButton(_ plan: Plan, title: String) -> some View {
        Button { selectedPlan = plan } label: {
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(selectedPlan == plan ? .black : Color(white: 0.45))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
                .background(
                    selectedPlan == plan
                        ? Color(red: 0.37, green: 0.87, blue: 0.76)
                        : Color.clear
                )
                .cornerRadius(10)
        }
    }

    // MARK: - Pricing card

    private var pricingCard: some View {
        VStack(spacing: 20) {
            // Price display
            VStack(spacing: 8) {
                Text("3 days free")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Color(red: 0.37, green: 0.87, blue: 0.76))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(Color(red: 0.37, green: 0.87, blue: 0.76).opacity(0.12))
                    .cornerRadius(20)

                if productsLoading {
                    HStack(spacing: 10) {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        Text("Loading prices…")
                            .font(.system(size: 14))
                            .foregroundColor(Color(white: 0.4))
                    }
                    .padding(.vertical, 12)
                } else {
                    HStack(alignment: .firstTextBaseline, spacing: 3) {
                        Text(activeProduct?.displayPrice ?? (selectedPlan == .monthly ? "$3.99" : "$39.99"))
                            .font(.system(size: 46, weight: .bold))
                            .foregroundColor(.white)
                        Text(selectedPlan == .monthly ? "/mo" : "/yr")
                            .font(.system(size: 20))
                            .foregroundColor(Color(white: 0.45))
                    }
                    Text("per \(selectedPlan == .monthly ? "month" : "year") after free trial")
                        .font(.system(size: 13))
                        .foregroundColor(Color(white: 0.45))
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 28)
            .background(
                LinearGradient(
                    colors: [Color(red: 0.05, green: 0.1, blue: 0.18),
                             Color(red: 0.04, green: 0.07, blue: 0.1)],
                    startPoint: .top, endPoint: .bottom
                )
            )
            .cornerRadius(20)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color(red: 0.37, green: 0.87, blue: 0.76).opacity(0.22), lineWidth: 1)
            )

            // Subscribe button
            Button {
                Task { await subscribe() }
            } label: {
                ZStack {
                    if isPurchasing {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .black))
                    } else {
                        Text("Subscribe Now")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.black)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 58)
                .background(
                    LinearGradient(
                        colors: [Color(red: 0.37, green: 0.87, blue: 0.76),
                                 Color(red: 0.3, green: 0.78, blue: 0.96)],
                        startPoint: .leading, endPoint: .trailing
                    )
                )
                .cornerRadius(16)
                .opacity((isPurchasing || isRestoring) ? 0.6 : 1)
            }
            .disabled(isPurchasing || isRestoring || activeProduct == nil)
        }
    }

    // MARK: - Restore

    private var restoreButton: some View {
        Button {
            Task { await restore() }
        } label: {
            Text(isRestoring ? "Restoring…" : "Restore purchases")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color(red: 0.37, green: 0.87, blue: 0.76).opacity(0.75))
        }
        .disabled(isPurchasing || isRestoring)
    }

    // MARK: - Legal

    private var legalText: some View {
        Text(
            "Mogifi AI Pro — auto-renewable subscription. " +
            "Monthly: \(monthlyProduct?.displayPrice ?? "$3.99")/month · " +
            "Yearly: \(yearlyProduct?.displayPrice ?? "$39.99")/year. " +
            "Includes 3-day free trial. Payment charged to your Apple ID at confirmation. " +
            "Renews automatically unless cancelled at least 24 hours before the end of the current period. " +
            "Manage or cancel in App Store account settings."
        )
        .font(.system(size: 11))
        .foregroundColor(Color(white: 0.3))
        .multilineTextAlignment(.center)
        .lineSpacing(3)
    }

    // MARK: - Error banner

    private func errorBanner(_ message: String) -> some View {
        Text(message)
            .font(.system(size: 13))
            .foregroundColor(.white)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.red.opacity(0.18))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.red.opacity(0.35), lineWidth: 1)
            )
    }

    // MARK: - StoreKit actions

    private func loadProducts() async {
        productsLoading = true
        let ids = [SubscriptionManager.monthlyProductId, SubscriptionManager.yearlyProductId]
        if let products = try? await Product.products(for: ids) {
            monthlyProduct = products.first { $0.id == SubscriptionManager.monthlyProductId }
            yearlyProduct = products.first { $0.id == SubscriptionManager.yearlyProductId }
        }
        productsLoading = false
    }

    private func subscribe() async {
        errorMessage = nil
        isPurchasing = true
        defer { isPurchasing = false }

        // Use already-loaded products; avoid a second network fetch that can fail in sandbox.
        var product = selectedPlan == .yearly ? yearlyProduct : monthlyProduct

        // If not loaded yet, do one fetch attempt.
        if product == nil {
            let ids = [SubscriptionManager.monthlyProductId, SubscriptionManager.yearlyProductId]
            let fetched = try? await Product.products(for: ids)
            if selectedPlan == .yearly {
                product = fetched?.first { $0.id == SubscriptionManager.yearlyProductId }
            } else {
                product = fetched?.first { $0.id == SubscriptionManager.monthlyProductId }
            }
        }

        guard let product else {
            errorMessage = "Subscription products could not be loaded. Please check your internet connection and try again."
            return
        }

        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                switch verification {
                case .verified(let transaction):
                    await transaction.finish()
                    await SubscriptionManager.syncEntitlementsToUserDefaults()
                    onSubscribed()
                case .unverified(_, let error):
                    errorMessage = "Purchase could not be verified: \(error.localizedDescription)"
                }
            case .userCancelled:
                break
            case .pending:
                errorMessage = "Purchase is pending — check your Apple ID payment method and try again."
            @unknown default:
                break
            }
        } catch {
            let msg = error.localizedDescription
            if !msg.lowercased().contains("cancel") {
                errorMessage = msg
            }
        }
    }

    private func restore() async {
        errorMessage = nil
        isRestoring = true
        defer { isRestoring = false }
        do {
            try await AppStore.sync()
            await SubscriptionManager.syncEntitlementsToUserDefaults()
            let (active, _) = SubscriptionManager.subscriptionStatusFromUserDefaults()
            if active {
                onSubscribed()
            } else {
                errorMessage = "No active subscription found for this Apple ID."
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
