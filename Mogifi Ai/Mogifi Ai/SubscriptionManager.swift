//
//  SubscriptionManager.swift
//  Mogifi Ai
//
//  StoreKit 2 purchases from the WKWebView “Subscribe” button (onboarding + /subscribe).
//
//  ── 3-day free trial, then paid billing ─────────────────────────────────────────
//  You do NOT implement trial dates in Swift. Apple bills after the trial when you
//  configure an Introductory Offer on each subscription in App Store Connect:
//    • Subscription group → add Monthly + Yearly auto-renewable products
//    • Product IDs must match monthlyProductId / yearlyProductId below exactly
//    • Each product → Subscription pricing → Introductory Offer → Free for 3 days
//      (eligibility: new subscribers; Apple shows the exact sheet text per region)
//
//  Local testing: `StoreKit/Products.storekit` in this repo, Scheme → Run → Options →
//  StoreKit Configuration = Products.storekit (only applies when you Run from Xcode, ⌘R).
//
//  Production: products + introductory offers must exist in App Store Connect; the
//  same product.purchase() call applies the trial automatically for eligible users.
//

import Foundation
import StoreKit

enum SubscriptionError: LocalizedError {
    case productUnavailable
    case userCancelled
    case pending
    case noActiveSubscription
    case unknown

    var errorDescription: String? {
        switch self {
        case .productUnavailable:
            return "Subscriptions are not available from Apple for this app build yet. To test: run the app with Xcode (Run) so the local StoreKit file is used, or add these exact product IDs in App Store Connect, finish pricing and localizations, then use a Sandbox Apple ID on the device when not launching from Xcode."
        case .userCancelled:
            return "Purchase cancelled."
        case .pending:
            return "Purchase is pending approval."
        case .noActiveSubscription:
            return "No active subscription found. Try Subscribe, or use Restore if you already purchased."
        case .unknown:
            return "Something went wrong."
        }
    }
}

enum SubscriptionManager {
    private static let userDefaultsPrefix = "mogifi_"

    /// Must match **exactly** the Product ID of each auto-renewable subscription in App Store Connect.
    static let monthlyProductId = "com.mogifiai.Mogifi_Ai.subscription.monthly"
    static let yearlyProductId = "com.mogifiai.Mogifi_Ai.subscription.yearly"

    private static var transactionListenerTask: Task<Void, Never>?

    /// Call once at launch. Handles renewals, upgrades, and restores delivered while the app runs.
    static func startObservingTransactions() {
        guard transactionListenerTask == nil else { return }
        transactionListenerTask = Task { @MainActor in
            for await result in Transaction.updates {
                guard case .verified(let transaction) = result else { continue }
                guard transaction.productID == monthlyProductId || transaction.productID == yearlyProductId else { continue }
                await transaction.finish()
                await syncEntitlementsToUserDefaults()
            }
        }
    }

    /// Reads `mogifi_` keys written for the web layer (MogifiNativeStorage).
    static func subscriptionStatusFromUserDefaults() -> (active: Bool, plan: String) {
        let ud = UserDefaults.standard
        let active = ud.string(forKey: userDefaultsPrefix + "subscriptionStatus") == "active"
        let plan = ud.string(forKey: userDefaultsPrefix + "subscriptionPlan") ?? ""
        return (active, plan)
    }

    /// Reconcile UserDefaults with StoreKit (source of truth). Clears keys if no active entitlement.
    @MainActor
    static func syncEntitlementsToUserDefaults() async {
        var hasYearly = false
        var hasMonthly = false
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else { continue }
            if transaction.revocationDate != nil { continue }
            switch transaction.productID {
            case yearlyProductId:
                hasYearly = true
            case monthlyProductId:
                hasMonthly = true
            default:
                break
            }
        }
        if hasYearly {
            writeSubscriptionState(plan: "yearly")
        } else if hasMonthly {
            writeSubscriptionState(plan: "monthly")
        } else {
            clearSubscriptionState()
        }
    }

    /// Returns localized price info for the paywall UI (web layer fetches this via getProducts bridge).
    static func getProductsInfo() async -> [[String: String]] {
        guard let all = try? await Product.products(for: [monthlyProductId, yearlyProductId]) else {
            print("Mogifi IAP getProducts: Product.products() threw — not using local StoreKit file or ASC products missing.")
            return []
        }
        #if DEBUG
        if all.isEmpty {
            print("Mogifi IAP getProducts: returned [] — check Xcode scheme StoreKit config or App Store Connect products are approved.")
        } else {
            print("Mogifi IAP getProducts: \(all.map { "\($0.id)=\($0.displayPrice)" }.joined(separator: ", "))")
        }
        #endif
        return all.map { ["id": $0.id, "displayPrice": $0.displayPrice, "displayName": $0.displayName] }
    }

    @MainActor
    static func restorePurchases() async throws {
        try await AppStore.sync()
        await syncEntitlementsToUserDefaults()
        let (active, _) = subscriptionStatusFromUserDefaults()
        if !active {
            throw SubscriptionError.noActiveSubscription
        }
    }

    @MainActor
    static func purchase(plan: String) async throws -> String {
        let productId: String
        switch plan.lowercased() {
        case "yearly", "annual":
            productId = yearlyProductId
        default:
            productId = monthlyProductId
        }

        // Load all subscription products at once; single-ID fetches can also return [] if the
        // StoreKit config is not active (e.g. not launched with ⌘R, or device using Sandbox without ASC).
        let all = try await Product.products(for: [monthlyProductId, yearlyProductId])
        #if DEBUG
        if all.isEmpty {
            print("Mogifi IAP: Product.products returned []. If testing on a device without App Store products, use an iOS Simulator (⌘R) with StoreKit file, or complete ASC + Sandbox. Scheme must list StoreKit/Products.storekit for local catalog.")
        } else {
            let ids = all.map(\.id).sorted()
            print("Mogifi IAP: loaded product IDs: \(ids.joined(separator: ", "))")
        }
        #endif
        let product = all.first { $0.id == productId }
        guard let product else {
            print("Mogifi IAP: missing product for \(productId) (fetched: \(all.map(\.id))). Not using local .storekit, or App Store Connect / Sandbox not set for this build.")
            throw SubscriptionError.productUnavailable
        }

        let result = try await product.purchase()

        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            let planKey = productId == yearlyProductId ? "yearly" : "monthly"
            writeSubscriptionState(plan: planKey)
            await transaction.finish()
            await syncEntitlementsToUserDefaults()
            return planKey

        case .userCancelled:
            throw SubscriptionError.userCancelled

        case .pending:
            throw SubscriptionError.pending

        @unknown default:
            throw SubscriptionError.unknown
        }
    }

    private static func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw error
        case .verified(let safe):
            return safe
        }
    }

    private static func writeSubscriptionState(plan: String) {
        let ud = UserDefaults.standard
        ud.set("active", forKey: userDefaultsPrefix + "subscriptionStatus")
        ud.set(plan, forKey: userDefaultsPrefix + "subscriptionPlan")
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        ud.set(iso.string(from: Date()), forKey: userDefaultsPrefix + "subscriptionDate")
    }

    private static func clearSubscriptionState() {
        let ud = UserDefaults.standard
        ud.removeObject(forKey: userDefaultsPrefix + "subscriptionStatus")
        ud.removeObject(forKey: userDefaultsPrefix + "subscriptionPlan")
        ud.removeObject(forKey: userDefaultsPrefix + "subscriptionDate")
    }
}
