# Onboarding & Subscription Implementation

## What Was Built

### 1. Onboarding Flow (`/app/onboarding/page.tsx`)
A 6-step questionnaire that collects:
- **Step 1**: Fitness goal (Lose Weight, Gain Weight, Build Muscle)
- **Step 2**: Equipment access (Full Gym, Home Gym, Minimal Equipment, Bodyweight Only)
- **Step 3**: Height (in cm)
- **Step 4**: Age
- **Step 5**: Weight (in kg)
- **Step 6**: Aggressiveness level (Moderate, Aggressive, Very Aggressive)

After completing all steps, the app:
1. Sends the data to `/api/generate-plan`
2. OpenAI generates a custom gym plan and nutrition plan
3. Stores the plans in localStorage
4. Redirects to the subscription page

### 2. Plan Generation API (`/app/api/generate-plan/route.ts`)
- Uses OpenAI's `gpt-4o-mini` model
- Calculates BMI and BMR from user data
- Generates:
  - **Custom Gym Plan**: Weekly workout schedule with exercises, sets, reps, rest times
  - **Nutrition Plan**: Daily calories, macros (protein/carbs/fats), meal timing, hydration

### 3. Subscription Paywall (`/app/subscribe/page.tsx`)
- Displays monthly ($9.99) and yearly ($79.99) plans
- Shows features included
- **Currently simulates subscription** - needs real payment integration
- See `SUBSCRIPTION_SETUP.md` for implementation details

### 4. Access Control (`/app/onboarding-check.tsx`)
- Wraps the entire app
- Checks if onboarding is completed
- Checks if user is subscribed
- Redirects to appropriate page if requirements not met

## How It Works

### User Flow:
1. User opens app for first time
2. Redirected to `/onboarding`
3. Completes 6-step questionnaire
4. AI generates personalized plan
5. Redirected to `/subscribe`
6. User subscribes (currently simulated)
7. Access granted to main app

### Data Storage:
All data is stored in `localStorage`:
- `onboardingData`: User's answers
- `customGymPlan`: Generated workout plan
- `customNutritionPlan`: Generated nutrition plan
- `onboardingCompleted`: "true" when done
- `subscriptionStatus`: "active" when subscribed
- `subscriptionPlan`: "monthly" or "yearly"
- `subscriptionDate`: ISO timestamp

## Next Steps for Production

### 1. Integrate Real Subscriptions
- See `SUBSCRIPTION_SETUP.md` for detailed instructions
- Recommended: Use RevenueCat for iOS + Android
- Update `handleSubscribe` in `/app/subscribe/page.tsx`

### 2. Backend Database (Optional)
Currently using localStorage. For production, consider:
- User accounts and authentication
- Store plans and subscription status in database
- Sync across devices

### 3. Use Generated Plans
The gym and nutrition plans are generated and stored, but you may want to:
- Display the custom gym plan in `/app/gym/page.tsx`
- Use the nutrition plan calories/macros in `/app/nutrition/page.tsx`
- Allow users to regenerate plans via consultation bot

### 4. Testing
- Test onboarding flow end-to-end
- Test subscription flow (with sandbox accounts)
- Test plan generation with various inputs
- Verify access control works correctly

## Environment Variables Required

Make sure `.env.local` has:
```
OPENAI_API_KEY=sk-proj-...
```

## Files Created/Modified

**New Files:**
- `/app/onboarding/page.tsx` - Onboarding questionnaire
- `/app/subscribe/page.tsx` - Subscription paywall
- `/app/api/generate-plan/route.ts` - Plan generation API
- `/app/onboarding-check.tsx` - Access control wrapper

**Modified Files:**
- `/app/layout.tsx` - Added OnboardingCheck wrapper

## Notes

- The subscription is currently simulated for development
- All plans are stored locally (localStorage)
- The onboarding check runs on every page load
- Plans are generated fresh each time (could cache for production)

