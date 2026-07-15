workbox.routing.setCatchHandler(function handlePwaFailure(options) {
  var request = options && options.event && options.event.request;
  if (!request || request.mode !== "navigate") {
    return Response.error();
  }

  var pathname = new URL(request.url).pathname;
  if (pathname !== "/mobile" && pathname.indexOf("/mobile/") !== 0) {
    return Response.error();
  }

  var cacheKey = workbox.precaching.getCacheKeyForURL("/mobile");
  return caches.match(cacheKey).then(function resolveMobileShell(response) {
    return response || Response.error();
  });
});
