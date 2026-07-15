if ("serviceWorker" in navigator) {
  window.addEventListener(
    "load",
    function registerLibroVivoServiceWorker() {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function ignoreRegistrationError() {});
    },
    { once: true }
  );
}
