// Bridge between web and native iOS app blocking
// Uses window.lockedInUsageBridge when provided by native shell (e.g. iOS)

interface AppBlockingBridge {
  blockApp(appName: string, block: boolean): Promise<void>;
  getBlockedApps(): Promise<string[]>;
  checkAppStatus(appName: string): Promise<boolean>;
}

function createWebBridge(): AppBlockingBridge {
  return {
    blockApp: async (appName: string, block: boolean) => {
      if (typeof window !== "undefined" && window.lockedInUsageBridge?.blockApp) {
        await window.lockedInUsageBridge.blockApp(appName, block);
      } else {
        console.log(`[Web] Would ${block ? "block" : "unblock"} app: ${appName}`);
      }
    },
    getBlockedApps: async (): Promise<string[]> => {
      return [];
    },
    checkAppStatus: async (_appName: string): Promise<boolean> => {
      return false;
    },
  };
}

export const appBlockingBridge = createWebBridge();
