type TestGlobal = typeof globalThis & {
  WebSocket?: unknown;
  __amamiLineCrmTestOnlyWebSocketShim?: boolean;
};

export function installTestOnlyWebSocketShim(): void {
  const globalObject = globalThis as TestGlobal;

  if (typeof globalObject.WebSocket !== "undefined") {
    return;
  }

  class TestOnlyWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;

    constructor() {
      throw new Error("Test-only WebSocket shim must not open network connections.");
    }
  }

  globalObject.WebSocket = TestOnlyWebSocket;
  globalObject.__amamiLineCrmTestOnlyWebSocketShim = true;
}
