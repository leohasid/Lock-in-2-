# Fix npm Permissions Error

You're getting a permission error. Here are two ways to fix it:

## Option 1: Quick Fix (Use sudo) ⚡

**Copy and paste this into Terminal:**
```bash
sudo npm install -g eas-cli
```

It will ask for your Mac password (you won't see it as you type - that's normal). Press Enter after typing your password.

**Note:** Using `sudo` is quick but not ideal. Option 2 is better long-term.

## Option 2: Fix npm Permissions Properly (Recommended) ✅

This fixes the root cause so you won't have this issue again.

**Step 1: Create a directory for global packages**
```bash
mkdir ~/.npm-global
```

**Step 2: Configure npm to use this directory**
```bash
npm config set prefix '~/.npm-global'
```

**Step 3: Add to your PATH**
```bash
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
```

**Step 4: Reload your shell**
```bash
source ~/.zshrc
```

**Step 5: Now install EAS CLI**
```bash
npm install -g eas-cli
```

This should work without sudo!

## Quick Copy-Paste (Option 1 - Fastest)

If you just want to get it done quickly, paste this:
```bash
sudo npm install -g eas-cli
```

Then enter your Mac password when prompted.

## After Installation

Once EAS CLI is installed, continue with:
```bash
eas login
```

