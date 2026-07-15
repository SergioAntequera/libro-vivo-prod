(function keepLibroVivoUpdated() {
  if (!("serviceWorker" in navigator)) return;

  var reloadingForNewWorker = false;
  var registrationPromise = null;
  var hadControllerAtLoad = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker.addEventListener("controllerchange", function reloadForNewWorker() {
    if (!hadControllerAtLoad) {
      hadControllerAtLoad = true;
      return;
    }
    if (reloadingForNewWorker) return;
    reloadingForNewWorker = true;
    window.location.reload();
  });

  function updateRegistration() {
    if (!registrationPromise) return;
    registrationPromise
      .then(function requestWorkerUpdate(registration) {
        return registration.update();
      })
      .catch(function ignoreWorkerUpdateError() {});
  }

  window.addEventListener(
    "load",
    function registerLibroVivoServiceWorker() {
      registrationPromise = navigator.serviceWorker.register("/sw.js", { scope: "/" });
      registrationPromise.catch(function ignoreRegistrationError() {});
      updateRegistration();
    },
    { once: true }
  );

  window.addEventListener("pageshow", updateRegistration);
  window.addEventListener("online", updateRegistration);
  document.addEventListener("visibilitychange", function updateWhenVisible() {
    if (document.visibilityState === "visible") updateRegistration();
  });
})();
