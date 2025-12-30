# Quick Start - EAS Build

## Step 1: Navigate to Your Project

**Copy and paste this into Terminal:**
```bash
cd /Users/leohasid/locked-in-app
```

Press Enter. You should see:
```
leohasid@Leos-MacBook-Pro locked-in-app %
```

Notice it now says `locked-in-app` at the end - that means you're in the right directory!

## Step 2: Configure EAS

**Copy and paste this:**
```bash
eas build:configure
```

Press Enter. It will update your `eas.json` file.

## Step 3: Build iOS App

**Copy and paste this:**
```bash
eas build --platform ios
```

Press Enter. This will:
- Upload your code
- Build in the cloud
- Take 10-20 minutes
- Give you a download link when done

## All Commands in Order

Copy and paste these one by one:

```bash
cd /Users/leohasid/locked-in-app
```

```bash
eas build:configure
```

```bash
eas build --platform ios
```

That's it! Make sure you're in the `locked-in-app` directory first!

