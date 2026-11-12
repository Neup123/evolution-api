'use strict';

// Regression tests exercise Evolution's state machine without constructing a
// Baileys socket. The native Rust bridge exports ESM-only entrypoints, whereas
// Evolution's tsx test harness runs CommonJS. Replace that *unused* crypto
// bridge solely for tests; a call fails loudly instead of returning fake data.
const Module = require('node:module');
const originalLoad = Module._load;

const bridgeNotAvailable = (name) => () => {
  throw new Error(`whatsapp-rust-bridge.${name} must not be called by a socket-state unit test`);
};
const bridgeStub = new Proxy(Object.create(null), {
  get(_target, property) {
    if (property === '__esModule') return false;
    if (typeof property === 'symbol') return undefined;
    return bridgeNotAvailable(property);
  },
});

Module._load = function loadWithTestBridge(request, parent, isMain) {
  if (request === 'whatsapp-rust-bridge') return bridgeStub;
  return originalLoad.call(this, request, parent, isMain);
};
