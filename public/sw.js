/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app and you should
 * disable HTTP caching for this file too.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */

importScripts("https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js");

importScripts(
  "/_next/precache.7X9rR8dTWd4y1v5iMSW0D.09c1f24cbcf2d1348c1645ba7cf1df4c.js"
);

workbox.core.skipWaiting();

workbox.core.clientsClaim();

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
self.__precacheManifest = [
  {
    "url": "/assets/character_female.png",
    "revision": "b50f1ea214aeec93ebda4bd48e445c18"
  },
  {
    "url": "/assets/character_male.png",
    "revision": "f2c7348a2367b4b6a32bdada26d527d3"
  },
  {
    "url": "/assets/colina.png",
    "revision": "78c8328174efb2710cffbff46dd16530"
  },
  {
    "url": "/assets/flower_blue.png",
    "revision": "44e69521a37982470b80ea7c53934b2e"
  },
  {
    "url": "/assets/flower_brown.png",
    "revision": "9aed649060712bbfa61a27c0204c8045"
  },
  {
    "url": "/assets/flower_red.png",
    "revision": "7d5612f31e3f010e926871f816ad66f6"
  },
  {
    "url": "/assets/hill_layer.png",
    "revision": "43ad0ec24ee35bd21e9e2394a984cf7b"
  },
  {
    "url": "/assets/hill_winter.png",
    "revision": "d84d4d93dcd462d5e1caa8d9d47d18f5"
  },
  {
    "url": "/avatars/avatar_carmen.svg",
    "revision": "343260532930f90446b2acf6088c8e54"
  },
  {
    "url": "/avatars/avatar_member_a.svg",
    "revision": "b271f95a9625f3c0974a0428f2c3fe70"
  },
  {
    "url": "/avatars/avatar_member_b.svg",
    "revision": "7893a8047efc93595f8be4f0a6fde9d1"
  },
  {
    "url": "/avatars/avatar_sergio.svg",
    "revision": "f13f7f0940026cadf1aaeb88f3744306"
  },
  {
    "url": "/file.svg",
    "revision": "d09f95206c3fa0bb9bd9fefabfd0ea71"
  },
  {
    "url": "/fonts/Lato-Bold.ttf",
    "revision": "79203a1947440ede448a384841980e3c"
  },
  {
    "url": "/fonts/Lato-Regular.ttf",
    "revision": "8d72101cad1547bed5ba3105041eeeae"
  },
  {
    "url": "/globe.svg",
    "revision": "2aaafa6a49b6563925fe440891e32717"
  },
  {
    "url": "/icons/apple-touch-icon.png",
    "revision": "85fcffbbbe7ce7e42ed39fd861aca93a"
  },
  {
    "url": "/icons/icon-192-maskable.png",
    "revision": "7db74c1193420713c22f1f24da55df09"
  },
  {
    "url": "/icons/icon-192.png",
    "revision": "7db74c1193420713c22f1f24da55df09"
  },
  {
    "url": "/icons/icon-512-maskable.png",
    "revision": "af68583b0398f9a0892a39044a8f5024"
  },
  {
    "url": "/icons/icon-512.png",
    "revision": "af68583b0398f9a0892a39044a8f5024"
  },
  {
    "url": "/illustrations/flowers/daisy.svg",
    "revision": "de99e373d715de5ddb42a0fb617b3aed"
  },
  {
    "url": "/illustrations/flowers/rose.svg",
    "revision": "974eea726db9be068024bd99eeff579a"
  },
  {
    "url": "/illustrations/flowers/sunflower.svg",
    "revision": "53abb9996e497c66f0a5ce641e8d719a"
  },
  {
    "url": "/illustrations/flowers/tulip.svg",
    "revision": "f445670eb291b4947ba82265dd00f48a"
  },
  {
    "url": "/illustrations/forest-topdown/CREDITS.md",
    "revision": "6d37e4ffc910b2bec4e38a86fdf0b0b5"
  },
  {
    "url": "/illustrations/forest-topdown/trees-opengameart/RE_00.png",
    "revision": "e9254d2d38fe422af3bd399bbf72d825"
  },
  {
    "url": "/illustrations/forest-topdown/trees-opengameart/RE_01.png",
    "revision": "75d58aa92f88caddfe7909be7da788c5"
  },
  {
    "url": "/illustrations/forest-topdown/trees-opengameart/RE_02.png",
    "revision": "8072df1e01f1ee3f811bce65617c4792"
  },
  {
    "url": "/illustrations/forest-topdown/trees-opengameart/RE_03.png",
    "revision": "1ef913abebd7adb7f49e1ed95d42b109"
  },
  {
    "url": "/illustrations/forest-topdown/trees-opengameart/RE_04.png",
    "revision": "9bb3b0f5abf09b0403a050cd93c4f5d9"
  },
  {
    "url": "/illustrations/forest-topdown/trees-opengameart/RE_05.png",
    "revision": "28c8b072905cbc418597aba3ab7f946e"
  },
  {
    "url": "/illustrations/forest-topdown/trees-opengameart/RE_06.png",
    "revision": "b04ea99ed7c6a8a0d21ca69c56003186"
  },
  {
    "url": "/illustrations/forest-topdown/trees-opengameart/RE_07.png",
    "revision": "c8ced49b137dd1750a63a95e16cc6802"
  },
  {
    "url": "/illustrations/forest-topdown/trees-opengameart/RE_08.png",
    "revision": "f823297d08b5eecce092a6e4df10c209"
  },
  {
    "url": "/illustrations/forest-topdown/trees-opengameart/RE_09.png",
    "revision": "64a3212a91aa6e2d24eff74fff1dd218"
  },
  {
    "url": "/illustrations/forest-topdown/trees-opengameart/RE_10.png",
    "revision": "448483abfb238b7681af7b733e33a2b4"
  },
  {
    "url": "/illustrations/forest-topdown/trees-opengameart/RE_11.png",
    "revision": "defdb90e376d3e2fe00e3ab0342deb76"
  },
  {
    "url": "/illustrations/forest-topdown/trees-opengameart/RE_12.png",
    "revision": "08749d7ce1cbfce2fbaff26243f5218d"
  },
  {
    "url": "/illustrations/packs/candy-garden/cloud.svg",
    "revision": "574af9cc8b2a2f02962f81be0d879719"
  },
  {
    "url": "/illustrations/packs/candy-garden/flower_daisy.svg",
    "revision": "63939d65f13e306e42937b53d634cfcd"
  },
  {
    "url": "/illustrations/packs/candy-garden/flower_rose.svg",
    "revision": "004af730fcf13cdc50ef5d866f2a870f"
  },
  {
    "url": "/illustrations/packs/candy-garden/flower_sunflower.svg",
    "revision": "910991efe9e23a0152fd54c3b7d9e2e6"
  },
  {
    "url": "/illustrations/packs/candy-garden/flower_tulip.svg",
    "revision": "f0f849f13ca0a51591f58d7061e60208"
  },
  {
    "url": "/illustrations/packs/candy-garden/landscape.svg",
    "revision": "899e3d48db75477275fb30625f71d0ce"
  },
  {
    "url": "/illustrations/packs/candy-garden/preview.svg",
    "revision": "4adffa380783911feb3770fdd6741613"
  },
  {
    "url": "/illustrations/packs/candy-garden/seed.svg",
    "revision": "4c57fc5e5899b83239feb74205607d7e"
  },
  {
    "url": "/illustrations/packs/candy-garden/tree_bronze.svg",
    "revision": "e0cb495319bef3380a2fe09beee1aa7c"
  },
  {
    "url": "/illustrations/packs/candy-garden/tree_diamond.svg",
    "revision": "0f4058526ae5d4f66f4669e4b9816faa"
  },
  {
    "url": "/illustrations/packs/candy-garden/tree_gold.svg",
    "revision": "99f6f9aee7433e7281f395128c570218"
  },
  {
    "url": "/illustrations/packs/candy-garden/tree_silver.svg",
    "revision": "60901ee5968c9929d06fe378a28eb9c5"
  },
  {
    "url": "/illustrations/packs/sunny-kids/cloud.svg",
    "revision": "f7b0e496f1e116a2c47a34fc1fcf8029"
  },
  {
    "url": "/illustrations/packs/sunny-kids/flower_daisy.svg",
    "revision": "82f535af8530bbe3ca5fbb1175b8e330"
  },
  {
    "url": "/illustrations/packs/sunny-kids/flower_rose.svg",
    "revision": "1c2818360ef474da408a2d5ae4d2723f"
  },
  {
    "url": "/illustrations/packs/sunny-kids/flower_sunflower.svg",
    "revision": "80ccf840b75bd64532e38d27ecbc0885"
  },
  {
    "url": "/illustrations/packs/sunny-kids/flower_tulip.svg",
    "revision": "a68f47e86911a9a211e090202afc79a5"
  },
  {
    "url": "/illustrations/packs/sunny-kids/landscape.svg",
    "revision": "91b838d67bce4f2b7bb40cb06e589141"
  },
  {
    "url": "/illustrations/packs/sunny-kids/preview.svg",
    "revision": "fabee8f85388a67661d7d363c251d8a7"
  },
  {
    "url": "/illustrations/packs/sunny-kids/seed.svg",
    "revision": "db94c9d60743984f312f56c7ca2299d3"
  },
  {
    "url": "/illustrations/packs/sunny-kids/tree_bronze.svg",
    "revision": "c0b15c2f4ebdeba7eaf1a643c00e9abf"
  },
  {
    "url": "/illustrations/packs/sunny-kids/tree_diamond.svg",
    "revision": "bbcaf5b53be5e1cc3a8988d70dd200be"
  },
  {
    "url": "/illustrations/packs/sunny-kids/tree_gold.svg",
    "revision": "e9c28c523dc85a35d04ea246d9dbc30f"
  },
  {
    "url": "/illustrations/packs/sunny-kids/tree_silver.svg",
    "revision": "940dbc51cc75e335f3757e8af56e44c3"
  },
  {
    "url": "/illustrations/ui/no-photo-preview.svg",
    "revision": "8308d81408e6debee938fb9c98b005d0"
  },
  {
    "url": "/manifest.json",
    "revision": "0f769d9bf92471b6a028e549d661542e"
  },
  {
    "url": "/next.svg",
    "revision": "8e061864f388b47f33a1c3780831193e"
  },
  {
    "url": "/stickers/sticker_calendar.svg",
    "revision": "c67fc60f3538a0cab83750ebba646daf"
  },
  {
    "url": "/stickers/sticker_cloud.svg",
    "revision": "263e19ca4800c4da7a282d21118c868c"
  },
  {
    "url": "/stickers/sticker_fire.svg",
    "revision": "94a08e145e7ac4b2fd10b8d64576f2a0"
  },
  {
    "url": "/stickers/sticker_heart.svg",
    "revision": "873e8b4ad5e0d36684082acf7f8410e1"
  },
  {
    "url": "/stickers/sticker_leaf.svg",
    "revision": "a04e9e71c285de3cc640b61dad5b18d8"
  },
  {
    "url": "/stickers/sticker_map.svg",
    "revision": "7059e3f0307b847a41f2e8f97ff6d1c6"
  },
  {
    "url": "/stickers/sticker_moon.svg",
    "revision": "57ca86eb405294165abaea8097ae59dc"
  },
  {
    "url": "/stickers/sticker_music.svg",
    "revision": "afe02882e390279bfd31a71bdd860949"
  },
  {
    "url": "/stickers/sticker_qr.svg",
    "revision": "3e1da682c24c9aee749e1b009e8b5497"
  },
  {
    "url": "/stickers/sticker_rainbow.svg",
    "revision": "c48150981f9d2c81af96eeff81b1dca8"
  },
  {
    "url": "/stickers/sticker_seed.svg",
    "revision": "468d183e1ef4ac9f9988f2b034a57831"
  },
  {
    "url": "/stickers/sticker_stamp_done.svg",
    "revision": "7a263a35e4bf04e144000bc6d59b0c75"
  },
  {
    "url": "/stickers/sticker_stamp_love.svg",
    "revision": "c034d24f44d7e9523b985d9a405cc0b9"
  },
  {
    "url": "/stickers/sticker_star.svg",
    "revision": "e3a2286482ec14f3e60640e4a8abf497"
  },
  {
    "url": "/stickers/sticker_sun.svg",
    "revision": "b8168837ebda2ffecb841dd37b444dc7"
  },
  {
    "url": "/stickers/sticker_tree_bronze.svg",
    "revision": "5cc8cd9bb489228b4f3443bdff3754cb"
  },
  {
    "url": "/stickers/sticker_tree_diamond.svg",
    "revision": "99076a562d838cae8a9ebf3ccef6601d"
  },
  {
    "url": "/stickers/sticker_tree_gold.svg",
    "revision": "fdcdbef4c4d4866ce31ab3852b3009b2"
  },
  {
    "url": "/stickers/sticker_tree_silver.svg",
    "revision": "165b1999c19cdd72c044e2f8030e5cb9"
  },
  {
    "url": "/stickers/sticker_washi.svg",
    "revision": "db58bb098b97215202de09f19b5e6b3d"
  },
  {
    "url": "/stickers/sticker_water.svg",
    "revision": "2485b69225ed22c0bbf6349053bafb1e"
  },
  {
    "url": "/vercel.svg",
    "revision": "c0af2f507b369b085b35ef4bbe3bcf1e"
  },
  {
    "url": "/window.svg",
    "revision": "a2760511c65806022ad20adf74370ff3"
  }
].concat(self.__precacheManifest || []);
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});

workbox.precaching.cleanupOutdatedCaches();
workbox.routing.registerNavigationRoute(workbox.precaching.getCacheKeyForURL("/offline"), {
  
  blacklist: [/^\/api\//],
});

workbox.routing.registerRoute(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i, new workbox.strategies.CacheFirst({ "cacheName":"google-fonts", plugins: [new workbox.expiration.Plugin({ maxEntries: 4, maxAgeSeconds: 31536000, purgeOnQuotaError: false })] }), 'GET');
workbox.routing.registerRoute(/^https:\/\/use\.fontawesome\.com\/releases\/.*/i, new workbox.strategies.CacheFirst({ "cacheName":"font-awesome", plugins: [new workbox.expiration.Plugin({ maxEntries: 1, maxAgeSeconds: 31536000, purgeOnQuotaError: false })] }), 'GET');
workbox.routing.registerRoute(/\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i, new workbox.strategies.StaleWhileRevalidate({ "cacheName":"static-font-assets", plugins: [new workbox.expiration.Plugin({ maxEntries: 4, maxAgeSeconds: 604800, purgeOnQuotaError: false })] }), 'GET');
workbox.routing.registerRoute(/\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i, new workbox.strategies.StaleWhileRevalidate({ "cacheName":"static-image-assets", plugins: [new workbox.expiration.Plugin({ maxEntries: 64, maxAgeSeconds: 86400, purgeOnQuotaError: false })] }), 'GET');
workbox.routing.registerRoute(/\.(?:js)$/i, new workbox.strategies.StaleWhileRevalidate({ "cacheName":"static-js-assets", plugins: [new workbox.expiration.Plugin({ maxEntries: 16, maxAgeSeconds: 86400, purgeOnQuotaError: false })] }), 'GET');
workbox.routing.registerRoute(/\.(?:css|less)$/i, new workbox.strategies.StaleWhileRevalidate({ "cacheName":"static-style-assets", plugins: [new workbox.expiration.Plugin({ maxEntries: 16, maxAgeSeconds: 86400, purgeOnQuotaError: false })] }), 'GET');
workbox.routing.registerRoute(/.*/i, new workbox.strategies.StaleWhileRevalidate({ "cacheName":"others", plugins: [new workbox.expiration.Plugin({ maxEntries: 16, maxAgeSeconds: 86400, purgeOnQuotaError: false })] }), 'GET');
