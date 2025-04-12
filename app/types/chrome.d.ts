// Chrome extension API type declarations
interface Chrome {
  runtime: {
    sendMessage: {
      (message: any): void;
      (
        extensionId: string,
        message: any,
        responseCallback?: (response: any) => void
      ): void;
    };
  };
  storage?: {
    local: {
      set: (items: { [key: string]: any }) => void;
    };
  };
}

// Add Chrome to the window object
declare global {
  interface Window {
    chrome?: Chrome;
  }
  var chrome: Chrome | undefined;
}

export {};
