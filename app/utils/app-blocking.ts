// Bridge between web and native iOS app blocking
import { Capacitor } from '@capacitor/core';
import { Plugins } from '@capacitor/core';

// Define the plugin interface
interface AppBlockingPlugin {
  blockApp(options: { appName: string; block: boolean }): Promise<void>;
  getBlockedApps(): Promise<{ blockedApps: string[] }>;
  checkAppStatus(options: { appName: string }): Promise<{ blocked: boolean }>;
}

// Register the plugin (will be available after native code is built)
let AppBlocking: AppBlockingPlugin | null = null;

if (Capacitor.isNativePlatform()) {
  // Try to get the plugin from Capacitor
  try {
    // @ts-ignore - Plugin will be registered at runtime
    AppBlocking = Plugins.AppBlocking as AppBlockingPlugin;
  } catch (e) {
    console.warn('AppBlocking plugin not available:', e);
  }
}

// Fallback bridge for web/testing
const createWebBridge = () => {
  return {
    blockApp: async (appName: string, block: boolean) => {
      if (AppBlocking) {
        await AppBlocking.blockApp({ appName, block });
      } else if (typeof window !== 'undefined' && window.lockedInUsageBridge?.blockApp) {
        await window.lockedInUsageBridge.blockApp(appName, block);
      } else {
        console.log(`[Web] Would ${block ? 'block' : 'unblock'} app: ${appName}`);
      }
    },
    getBlockedApps: async (): Promise<string[]> => {
      if (AppBlocking) {
        const result = await AppBlocking.getBlockedApps();
        return result.blockedApps;
      }
      return [];
    },
    checkAppStatus: async (appName: string): Promise<boolean> => {
      if (AppBlocking) {
        const result = await AppBlocking.checkAppStatus({ appName });
        return result.blocked;
      }
      return false;
    },
  };
};

export const appBlockingBridge = createWebBridge();

