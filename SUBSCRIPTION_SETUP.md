# Subscription Setup Guide for iOS and Android

## Overview
The app currently has a subscription paywall in place, but you need to integrate with actual subscription services to process payments. Here are your options:

## Option 1: RevenueCat (Recommended - Easiest)
RevenueCat handles both iOS and Android subscriptions in one unified API.

### Setup Steps:
1. **Create RevenueCat Account**
   - Go to https://www.revenuecat.com
   - Sign up and create a new project
   - Add your iOS and Android apps

2. **Install RevenueCat SDK**
   ```bash
   npm install react-native-purchases
   ```

3. **Configure iOS**
   - In App Store Connect, create your subscription products
   - Add your App Store Connect Shared Secret to RevenueCat
   - Configure RevenueCat with your bundle ID

4. **Configure Android**
   - In Google Play Console, create subscription products
   - Add your Google Play service account JSON to RevenueCat
   - Configure RevenueCat with your package name

5. **Update `/app/subscribe/page.tsx`**
   - Replace the simulated subscription with RevenueCat calls
   - Use `Purchases.purchasePackage()` to handle subscriptions
   - Use `Purchases.getCustomerInfo()` to check subscription status

### Example Code:
```typescript
import Purchases from 'react-native-purchases';

// Initialize (do this in your app entry point)
await Purchases.configure({
  apiKey: 'your-revenuecat-api-key',
});

// In subscribe page
const handleSubscribe = async (plan: "monthly" | "yearly") => {
  try {
    const offerings = await Purchases.getOfferings();
    const package = offerings.current?.availablePackages.find(
      p => p.identifier === plan
    );
    
    if (package) {
      const { customerInfo } = await Purchases.purchasePackage(package);
      if (customerInfo.entitlements.active['premium']) {
        localStorage.setItem("subscriptionStatus", "active");
        router.push("/");
      }
    }
  } catch (error) {
    console.error("Subscription error:", error);
  }
};
```

## Option 2: Native In-App Purchases

### iOS (Apple In-App Purchase)
1. **Set up in App Store Connect**
   - Create subscription products (monthly/yearly)
   - Configure subscription groups
   - Set pricing for each region

2. **Install react-native-iap**
   ```bash
   npm install react-native-iap
   ```

3. **Implement in your app**
   - Use `RNIap.requestSubscription()` for iOS
   - Handle purchase callbacks
   - Verify receipts with your backend

### Android (Google Play Billing)
1. **Set up in Google Play Console**
   - Create subscription products
   - Set up pricing
   - Configure subscription base plans

2. **Use react-native-iap**
   - Use `RNIap.requestSubscription()` for Android
   - Handle purchase callbacks
   - Verify purchases with your backend

## Option 3: Stripe (Web-based, requires backend)
If you want to handle subscriptions through your own backend:

1. **Set up Stripe**
   - Create Stripe account
   - Set up subscription products
   - Create API endpoints to handle checkout

2. **For Mobile Apps**
   - Use Stripe's mobile SDKs
   - Or use Stripe Checkout in a WebView
   - Note: Apple requires IAP for digital subscriptions, so this may not be allowed

## Important Notes

### Apple App Store Requirements:
- **You MUST use Apple In-App Purchase (IAP) for subscriptions**
- Apple takes 15-30% commission
- Cannot use third-party payment processors for digital subscriptions
- RevenueCat uses IAP under the hood, so it's compliant

### Google Play Requirements:
- **You MUST use Google Play Billing for subscriptions**
- Google takes 15-30% commission
- Cannot use third-party payment processors
- RevenueCat uses Google Play Billing under the hood

### Testing:
- Use sandbox/test accounts for both platforms
- Test subscription flows thoroughly before release
- Handle edge cases (cancellations, renewals, refunds)

## Current Implementation
The current `/app/subscribe/page.tsx` file simulates a subscription. You need to replace the `handleSubscribe` function with actual subscription logic using one of the options above.

## Next Steps:
1. Choose your subscription service (RevenueCat recommended)
2. Set up accounts and products in App Store Connect / Google Play Console
3. Install and configure the SDK
4. Update the subscription page with real payment logic
5. Test thoroughly with sandbox accounts
6. Submit to app stores

