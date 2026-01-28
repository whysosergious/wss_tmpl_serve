// IMMEDIATELY override console before ANY other code runs
(function () {
  const methods = ["log", "error", "warn", "info"];
  methods.forEach((method) => {
    const original = console[method];
    console[method] = function (...args) {
      original.apply(console, args);

      // Capture stack trace for source location
      const stackLine = new Error().stack?.split("\n")[2]?.trim() || "";

      // Send to parent console
      window.parent.postMessage(
        {
          source: "iframe-console",
          type: method,
          args: args,
          stack: stackLine,
        },
        "*",
      );
    };
  });
})();
