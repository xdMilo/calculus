(function () {
  if (window.__aetherBridge) return;
  window.__aetherBridge = true;

  let shell = null;
  try {
    shell = window.parent !== window ? window.parent.aetherGameSaves : null;
  } catch {}
  if (!shell) return;

  try {
    const originalOpen = window.IDBFactory.prototype.open;
    window.IDBFactory.prototype.open = function (name, ...rest) {
      try {
        shell.track(shell.idFor(decodeURIComponent(location.pathname.split("/").pop() || "").replace(/\.html?$/i, "")), String(name));
      } catch {}
      return originalOpen.call(this, name, ...rest);
    };
  } catch {}

  let real;
  try {
    real = window.localStorage;
  } catch {
    return;
  }

  const name = decodeURIComponent(location.pathname.split("/").pop() || "").replace(/\.html?$/i, "");
  const id = shell.idFor(name);

  const saved = shell.get(id);
  Object.keys(saved).forEach((key) => {
    try {
      if (real.getItem(key) !== saved[key]) real.setItem(key, saved[key]);
    } catch {}
  });

  const record = (key, value) => {
    try {
      shell.set(id, key, value);
    } catch {}
  };

  const wrapped = new Proxy(real, {
    get(target, prop) {
      if (prop === "setItem") {
        return (key, value) => {
          target.setItem(key, value);
          record(String(key), String(value));
        };
      }
      if (prop === "removeItem") {
        return (key) => {
          target.removeItem(key);
          record(String(key), null);
        };
      }
      if (prop === "clear") {
        return () => {
          shell.keys(id).forEach((key) => target.removeItem(key));
          shell.clear(id);
        };
      }
      const value = target[prop];
      return typeof value === "function" ? value.bind(target) : value;
    },
    set(target, prop, value) {
      if (typeof prop === "symbol") return false;
      target.setItem(prop, value);
      record(prop, String(value));
      return true;
    },
    deleteProperty(target, prop) {
      if (typeof prop === "symbol") return false;
      target.removeItem(prop);
      record(prop, null);
      return true;
    },
    has: (target, prop) => prop in target,
    ownKeys: (target) => Reflect.ownKeys(target),
    getOwnPropertyDescriptor: (target, prop) => Reflect.getOwnPropertyDescriptor(target, prop),
  });

  try {
    Object.defineProperty(window, "localStorage", { configurable: true, get: () => wrapped });
  } catch {}
})();