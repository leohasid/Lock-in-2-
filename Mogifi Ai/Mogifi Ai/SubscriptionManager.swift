//
//  SubscriptionManager.swift
//  Mogifi Ai
//
//  StoreKit 2 purchases from the WKWebView “Subscribe” button.
//  Create matching auto-renewable subscription product IDs in App Store Connect.
//

import Foundation
import StoreKit

enum SubscriptionError: LocalizedError {
    case productUnavailable
    case userCancelled
    case pending
    case unknown

    var errorDescription: String? {
        switch self {
        case .productUnavailable:
            return "Subscription products are not available yet. Add them in App Store Connect and ensure the product IDs match SubscriptionManager."
        case .userCancelled:
            return "Purchase cancelled."
        case .pending:
            return "Purchase is pending approval."
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

    @MainActor
    static func purchase(plan: String) async throws -> String {
        let productId: String
        switch plan.lowercased() {
        case "yearly", "annual":
            productId = yearlyProductId
        default:
            productId = monthlyProductId
        }

        let products = try await Product.products(for: [productId])
        guard let product = products.first else {
            throw SubscriptionError.productUnavailable
        }

        let result = try await product.purchase()

        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            let planKey = productId == yearlyProductId ? "yearly" : "monthly"
            writeSubscriptionState(plan: planKey)
            await transaction.finish()
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
}
