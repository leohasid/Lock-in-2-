// Bridge between web and native iOS app blocking
// Note: In Capacitor 7.x, plugins are accessed differently
// This file provides a web bridge for app blocking functionality

// Define the plugin interface
interface AppBlockingPlugin {
  blockApp(options: { appName: string; block: boolean }): Promise<void>;
  getBlockedApps(): Promise<{ blockedApps: string[] }>;
  checkAppStatus(options: { appName: string }): Promise<{ blocked: boolean }>;
}

// Fallback bridge for web/testing
const createWebBridge = () => {
  return {
    blockApp: async (appName: string, block: boolean) => {
      if (typeof window !== 'undefined' && window.lockedInUsageBridge?.blockApp) {
        await window.lockedInUsageBridge.blockApp(appName, block);
      } else {
        console.log(`[Web] Would ${block ? 'block' : 'unblock'} app: ${appName}`);
      }
    },
    getBlockedApps: async (): Promise<string[]> => {
      return [];
    },
    checkAppStatus: async (appName: string): Promise<boolean> => {
      return false;
    },
  };
};

export const appBlockingBridge = createWebBridge();

