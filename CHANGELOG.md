## [1.10.2](https://github.com/podium-lib/podlet-server/compare/v1.10.1...v1.10.2) (2023-09-14)


### Bug Fixes

* fixed debouce bug casing rare dev server crash ([48752e7](https://github.com/podium-lib/podlet-server/commit/48752e7bb47713fd4499a05eba8554e2245de120))

## [1.10.1](https://github.com/podium-lib/podlet-server/compare/v1.10.0...v1.10.1) (2023-08-13)


### Bug Fixes

* **deps:** update dependency ora to v7 ([#101](https://github.com/podium-lib/podlet-server/issues/101)) ([bea734c](https://github.com/podium-lib/podlet-server/commit/bea734c6df14e06c4d85fc791bb16e574ba26acb))

# [1.10.0](https://github.com/podium-lib/podlet-server/compare/v1.9.7...v1.10.0) (2023-08-11)


### Features

* enabling config override files on the format "config/<host>/<env>.json" ([#107](https://github.com/podium-lib/podlet-server/issues/107)) ([124fd4e](https://github.com/podium-lib/podlet-server/commit/124fd4e3ba353f82f39f52e65e155740eb01f8ac))

## [1.9.7](https://github.com/podium-lib/podlet-server/compare/v1.9.6...v1.9.7) (2023-07-06)


### Bug Fixes

* correct export of DevServer ([#99](https://github.com/podium-lib/podlet-server/issues/99)) ([cd53477](https://github.com/podium-lib/podlet-server/commit/cd53477290531da312936c0a1dcaceade046f7f5))

## [1.9.6](https://github.com/podium-lib/podlet-server/compare/v1.9.5...v1.9.6) (2023-07-05)


### Bug Fixes

* do not use development bundling urls in non development context ([#98](https://github.com/podium-lib/podlet-server/issues/98)) ([10cfde2](https://github.com/podium-lib/podlet-server/commit/10cfde2fe5a10a6f1f6f4a0f567a85a3b36c184d))

## [1.9.5](https://github.com/podium-lib/podlet-server/compare/v1.9.4...v1.9.5) (2023-07-05)


### Bug Fixes

* prevent undefined registry error and further reduce intermittent page reload delay error ([#97](https://github.com/podium-lib/podlet-server/issues/97)) ([dee4df9](https://github.com/podium-lib/podlet-server/commit/dee4df96040c9f4e0ab4e2a19c3af24eafca9fea))

## [1.9.4](https://github.com/podium-lib/podlet-server/compare/v1.9.3...v1.9.4) (2023-07-04)


### Bug Fixes

* small i18n improvements ([#88](https://github.com/podium-lib/podlet-server/issues/88)) ([b16031b](https://github.com/podium-lib/podlet-server/commit/b16031bfdc9754f4d77e8c343707d4cb872fac13))

## [1.9.3](https://github.com/podium-lib/podlet-server/compare/v1.9.2...v1.9.3) (2023-07-04)


### Bug Fixes

* remove files altogether ([b1234f7](https://github.com/podium-lib/podlet-server/commit/b1234f74d0239952bac51f7d8b9fffafcb633298))

## [1.9.2](https://github.com/podium-lib/podlet-server/compare/v1.9.1...v1.9.2) (2023-07-04)


### Bug Fixes

* include plugins ([441fade](https://github.com/podium-lib/podlet-server/commit/441fadedebbd5d8348fc2d78a4114822c0ad7fa0))

## [1.9.1](https://github.com/podium-lib/podlet-server/compare/v1.9.0...v1.9.1) (2023-07-04)


### Bug Fixes

* make sure commands are included on publish as well ([b6a2ff5](https://github.com/podium-lib/podlet-server/commit/b6a2ff502f1b1945e6ee4bc1a9e9ced1bf39a9a7))

# [1.9.0](https://github.com/podium-lib/podlet-server/compare/v1.8.14...v1.9.0) (2023-07-04)


### Bug Fixes

* refactor file watching and ws out of plugins ([80ad3e7](https://github.com/podium-lib/podlet-server/commit/80ad3e7602531fff941a224f704e3f3b254ca9aa))
* set connection close to stop 503s on restarts ([7002057](https://github.com/podium-lib/podlet-server/commit/7002057f2a2f352b6c7c7d7ae1ec2d5063d00bbb))


### Features

* add generated types for the podlet-server ([c9f9ec1](https://github.com/podium-lib/podlet-server/commit/c9f9ec1765b776d32427a27e9df92cf80c320524))

## [1.8.14](https://github.com/podium-lib/podlet-server/compare/v1.8.13...v1.8.14) (2023-07-03)


### Bug Fixes

* **deps:** update all dependencies (non-major) ([696e2b0](https://github.com/podium-lib/podlet-server/commit/696e2b026909f2cbb81090c9d82ccc985596ce86))

## [1.8.13](https://github.com/podium-lib/podlet-server/compare/v1.8.12...v1.8.13) (2023-06-30)


### Bug Fixes

* try to avoid running scripts etc in dev mode when starting the app ([#78](https://github.com/podium-lib/podlet-server/issues/78)) ([fa7a12f](https://github.com/podium-lib/podlet-server/commit/fa7a12fc23a9c40d6bf70155b092e468592cd3a1))

## [1.8.12](https://github.com/podium-lib/podlet-server/compare/v1.8.11...v1.8.12) (2023-06-28)


### Bug Fixes

* update hydrate support ([#90](https://github.com/podium-lib/podlet-server/issues/90)) ([9f5851f](https://github.com/podium-lib/podlet-server/commit/9f5851faef72d760a87460d12dafaad75a74b496))

## [1.8.11](https://github.com/podium-lib/podlet-server/compare/v1.8.10...v1.8.11) (2023-06-27)


### Bug Fixes

* ensure url paths have correct number of slash characters ([#89](https://github.com/podium-lib/podlet-server/issues/89)) ([d8e6b9c](https://github.com/podium-lib/podlet-server/commit/d8e6b9cd0f32e2d24a30336f35f2579e6da68aea))

## [1.8.10](https://github.com/podium-lib/podlet-server/compare/v1.8.9...v1.8.10) (2023-06-26)


### Bug Fixes

* **deps:** update all dependencies (non-major) ([460df25](https://github.com/podium-lib/podlet-server/commit/460df25b60ec1248a1639339d7d45e74df3da81f))

## [1.8.9](https://github.com/podium-lib/podlet-server/compare/v1.8.8...v1.8.9) (2023-06-19)


### Bug Fixes

* **deps:** update all dependencies (non-major) ([d60f4bb](https://github.com/podium-lib/podlet-server/commit/d60f4bb9b4ce2747466223829c74c755f048cfea))

## [1.8.8](https://github.com/podium-lib/podlet-server/compare/v1.8.7...v1.8.8) (2023-06-13)


### Bug Fixes

* replace unsafeHtml with unsafeStatic for tag names ([f917083](https://github.com/podium-lib/podlet-server/commit/f91708354b4846c50c7323fe76aa58156776a34b))

## [1.8.7](https://github.com/podium-lib/podlet-server/compare/v1.8.6...v1.8.7) (2023-06-12)


### Bug Fixes

* Do not load language file on each request ([6c7df36](https://github.com/podium-lib/podlet-server/commit/6c7df36a067892ef3c24dd496ad116211933a096))

## [1.8.6](https://github.com/podium-lib/podlet-server/compare/v1.8.5...v1.8.6) (2023-06-12)


### Bug Fixes

* **deps:** update all dependencies (non-major) ([e832621](https://github.com/podium-lib/podlet-server/commit/e832621b4dd460c4ea7344b8b4cd65613a119d17))

## [1.8.5](https://github.com/podium-lib/podlet-server/compare/v1.8.4...v1.8.5) (2023-06-06)


### Bug Fixes

* **deps:** update all dependencies (non-major) ([aaded08](https://github.com/podium-lib/podlet-server/commit/aaded08d4d8dc937516937a6a58ce6d36846d38b))

## [1.8.4](https://github.com/podium-lib/podlet-server/compare/v1.8.3...v1.8.4) (2023-05-31)


### Bug Fixes

* Disable request logging ([e79677e](https://github.com/podium-lib/podlet-server/commit/e79677eabcc38c243c1191c0649e1684a53de471))

## [1.8.3](https://github.com/podium-lib/podlet-server/compare/v1.8.2...v1.8.3) (2023-05-31)


### Bug Fixes

* **deps:** update dependency @fastify/restartable to v2 ([418f26b](https://github.com/podium-lib/podlet-server/commit/418f26b4213900b0e621eeff9d24c2bd53f36bb5))
* **deps:** update dependency @rollup/plugin-commonjs to v25 ([35f5f49](https://github.com/podium-lib/podlet-server/commit/35f5f4937c3eb11c02c5cc89cf2c0178b13bd676))

## [1.8.2](https://github.com/podium-lib/podlet-server/compare/v1.8.1...v1.8.2) (2023-05-29)


### Bug Fixes

* **deps:** update all dependencies (non-major) ([a098eb7](https://github.com/podium-lib/podlet-server/commit/a098eb7818586e0261724a17c4fa44c3d34d1a72))

## [1.8.1](https://github.com/podium-lib/podlet-server/compare/v1.8.0...v1.8.1) (2023-05-22)


### Bug Fixes

* **deps:** update all dependencies (non-major) ([2ebfa80](https://github.com/podium-lib/podlet-server/commit/2ebfa80821c2c2bedc2d6f3a07005dde4d77d903))

# [1.8.0](https://github.com/podium-lib/podlet-server/compare/v1.7.2...v1.8.0) (2023-05-16)


### Features

* inject convict object into extensions schema function ([#69](https://github.com/podium-lib/podlet-server/issues/69)) ([3cbb3f0](https://github.com/podium-lib/podlet-server/commit/3cbb3f0fcbbd68525017e5eeb6bf9af3c8169ab2))

## [1.7.2](https://github.com/podium-lib/podlet-server/compare/v1.7.1...v1.7.2) (2023-05-15)


### Bug Fixes

* **deps:** update all dependencies (non-major) ([5f250be](https://github.com/podium-lib/podlet-server/commit/5f250be2580f2cc59d5e94e32f765b0f6443d5ea))

## [1.7.1](https://github.com/podium-lib/podlet-server/compare/v1.7.0...v1.7.1) (2023-05-08)


### Bug Fixes

* **deps:** update all dependencies (non-major) ([63c655e](https://github.com/podium-lib/podlet-server/commit/63c655e9667922bae7084f03295e487114b72f6b))

# [1.7.0](https://github.com/podium-lib/podlet-server/compare/v1.6.7...v1.7.0) (2023-05-03)


### Bug Fixes

* resolve issues with tests after merging i18n changes ([#63](https://github.com/podium-lib/podlet-server/issues/63)) ([7aa786d](https://github.com/podium-lib/podlet-server/commit/7aa786d42db462022ff7eb6b95d50cfb19e72efa))


### Features

* **i18n:** add lingui with support for compilation and extraction ([#52](https://github.com/podium-lib/podlet-server/issues/52)) ([780134c](https://github.com/podium-lib/podlet-server/commit/780134c1ed162144206285b94d625d852209bb15))

## [1.6.7](https://github.com/podium-lib/podlet-server/compare/v1.6.6...v1.6.7) (2023-05-01)


### Bug Fixes

* **deps:** update all dependencies (non-major) ([9339c35](https://github.com/podium-lib/podlet-server/commit/9339c35ec2166446637a2a39356e3f7064f5e94f))

## [1.6.6](https://github.com/podium-lib/podlet-server/compare/v1.6.5...v1.6.6) (2023-04-27)


### Bug Fixes

* prevent stripping of all headers ([#60](https://github.com/podium-lib/podlet-server/issues/60)) ([c8afd39](https://github.com/podium-lib/podlet-server/commit/c8afd39bbf7a50dbe245be93574a36595780d99a))

## [1.6.5](https://github.com/podium-lib/podlet-server/compare/v1.6.4...v1.6.5) (2023-04-27)


### Bug Fixes

* ensure metrics are properly streamed. Add additional metrics for import element ([#59](https://github.com/podium-lib/podlet-server/issues/59)) ([356f91b](https://github.com/podium-lib/podlet-server/commit/356f91b9eddd78704cf353bf50b6d16950cf68bd))

## [1.6.4](https://github.com/podium-lib/podlet-server/compare/v1.6.3...v1.6.4) (2023-04-26)


### Bug Fixes

* remove header validation as headers should not be validated by default ([#58](https://github.com/podium-lib/podlet-server/issues/58)) ([cfd83b9](https://github.com/podium-lib/podlet-server/commit/cfd83b9e99027edbbb8fce8d1c9f6ec67081009f))

## [1.6.3](https://github.com/podium-lib/podlet-server/compare/v1.6.2...v1.6.3) (2023-04-26)


### Bug Fixes

* **cli:** remove app header when starting app in production ([#56](https://github.com/podium-lib/podlet-server/issues/56)) ([9b85e0f](https://github.com/podium-lib/podlet-server/commit/9b85e0f8fffd7550a16b3a5074c161d1d58a55ab))

## [1.6.2](https://github.com/podium-lib/podlet-server/compare/v1.6.1...v1.6.2) (2023-04-24)


### Bug Fixes

* **deps:** update all dependencies (non-major) ([9d81bd3](https://github.com/podium-lib/podlet-server/commit/9d81bd3b41d251e328883ea1045779560e15384e))

## [1.6.1](https://github.com/podium-lib/podlet-server/compare/v1.6.0...v1.6.1) (2023-04-24)


### Bug Fixes

* log host and env on info when app starts ([#53](https://github.com/podium-lib/podlet-server/issues/53)) ([9d5c266](https://github.com/podium-lib/podlet-server/commit/9d5c266e1f08e7ea89f5d5d0f5f930a95ef15771))

# [1.6.0](https://github.com/podium-lib/podlet-server/compare/v1.5.4...v1.6.0) (2023-04-21)


### Bug Fixes

* make it possible to disable compression ([ad970e4](https://github.com/podium-lib/podlet-server/commit/ad970e479a21f9e33033b4bc4e7d5beed8f68364))
* update hydrate support to the latest package from lit ([8bd9684](https://github.com/podium-lib/podlet-server/commit/8bd96840d221fd6dcaea71908bf16962d3e5ed76))


### Features

* add auto documentation pages ([a122853](https://github.com/podium-lib/podlet-server/commit/a122853de50d80f319dc5e255bb75a23b0f73178))

## [1.5.4](https://github.com/podium-lib/podlet-server/compare/v1.5.3...v1.5.4) (2023-04-21)


### Bug Fixes

* replace dsd ponyfill with more comprehensive implementation ([#50](https://github.com/podium-lib/podlet-server/issues/50)) ([688d1d3](https://github.com/podium-lib/podlet-server/commit/688d1d35355476db66b3e3269125af9333e04976))

## [1.5.3](https://github.com/podium-lib/podlet-server/compare/v1.5.2...v1.5.3) (2023-04-20)


### Bug Fixes

* make it possible to disable compression ([e51c818](https://github.com/podium-lib/podlet-server/commit/e51c81893e9be471ccb3fb93075de0e6d1c35af9))

## [1.5.2](https://github.com/podium-lib/podlet-server/compare/v1.5.1...v1.5.2) (2023-04-17)


### Bug Fixes

* ensure dependency paths are resolved correctly during a build ([ac27e41](https://github.com/podium-lib/podlet-server/commit/ac27e418d75b7f62074ce06bf5aa38b90c13a8df))

## [1.5.1](https://github.com/podium-lib/podlet-server/compare/v1.5.0...v1.5.1) (2023-04-17)


### Bug Fixes

* **deps:** update all dependencies (non-major) ([8f4a4ec](https://github.com/podium-lib/podlet-server/commit/8f4a4ec765699a73c435aa6b704c76078e7ac327))

# [1.5.0](https://github.com/podium-lib/podlet-server/compare/v1.4.0...v1.5.0) (2023-04-16)


### Features

* add test server for testing applications ([807c753](https://github.com/podium-lib/podlet-server/commit/807c753431e96521bf534a974b7de35b35f979f8))

# [1.4.0](https://github.com/podium-lib/podlet-server/compare/v1.3.1...v1.4.0) (2023-04-13)


### Features

* add support for extensions ([5540230](https://github.com/podium-lib/podlet-server/commit/5540230ea10d9fa73a506ecf9c08cd2c4f9ca585))

## [1.3.1](https://github.com/podium-lib/podlet-server/compare/v1.3.0...v1.3.1) (2023-04-10)


### Bug Fixes

* **deps:** update all dependencies (non-major) ([0fd89dc](https://github.com/podium-lib/podlet-server/commit/0fd89dc14e242b695b012b9c28060dfaecdfcea4))

# [1.3.0](https://github.com/podium-lib/podlet-server/compare/v1.2.1...v1.3.0) (2023-03-29)


### Bug Fixes

* refine file watching in dev ([436d8df](https://github.com/podium-lib/podlet-server/commit/436d8dfc6dd7241ef8dfe2fc2ef1d42b9435ca69))


### Features

* refactor logging in dev mode to improve usablity ([2c40b22](https://github.com/podium-lib/podlet-server/commit/2c40b227f9d117eff35eb9b80f09b17d8d95f57c))

## [1.2.1](https://github.com/podium-lib/podlet-server/compare/v1.2.0...v1.2.1) (2023-03-27)


### Bug Fixes

* Add log statements ([8ae728f](https://github.com/podium-lib/podlet-server/commit/8ae728ff7c75978190c88d228e4511497535d626))

# [1.2.0](https://github.com/podium-lib/podlet-server/compare/v1.1.1...v1.2.0) (2023-03-27)


### Bug Fixes

* Add logging ([a02fc8c](https://github.com/podium-lib/podlet-server/commit/a02fc8c4eaf6f144180750bba297b05247cecb75))


### Features

* add document.js to support Podium document template ([0191c38](https://github.com/podium-lib/podlet-server/commit/0191c38938eac21d23ce1c9a70b204aa118c1719))

## [1.1.1](https://github.com/podium-lib/podlet-server/compare/v1.1.0...v1.1.1) (2023-03-26)


### Bug Fixes

* Use http-errors on internal errors ([eaf7428](https://github.com/podium-lib/podlet-server/commit/eaf742886394277c9c6f7e5553a11a329cfe6a29))

# [1.1.0](https://github.com/podium-lib/podlet-server/compare/v1.0.0...v1.1.0) (2023-03-26)


### Features

* set grace to 0 in dev, default to 5000 and allow override ([e51bc2c](https://github.com/podium-lib/podlet-server/commit/e51bc2c03e6dac0e3297537a8bcc8d7bf215a327))

# 1.0.0 (2023-03-26)


### Bug Fixes

* create dist folder ahead of time ([54e0525](https://github.com/podium-lib/podlet-server/commit/54e05256623498d6ac485b95d634c8c66947b791))
* **deps:** update dependency esbuild to v0.17.13 ([8e8f6a4](https://github.com/podium-lib/podlet-server/commit/8e8f6a4a5fae8b523e56da855e6c3930b11af050))
* **deps:** update dependency ora to v6.3.0 ([2cde542](https://github.com/podium-lib/podlet-server/commit/2cde5421134575e475254075a5e67a4af2639e42))
* **deps:** update dependency pino-pretty to v10 ([e3214f4](https://github.com/podium-lib/podlet-server/commit/e3214f4222b5941e44aa15eac3ac374994b64d19))
* **deps:** update dependency rollup to v3.20.2 ([0e9c382](https://github.com/podium-lib/podlet-server/commit/0e9c382b917f594836f6bab02d2df3d806e6c43c))
* Fix premature close ([69dc315](https://github.com/podium-lib/podlet-server/commit/69dc31539c95f2a01ce30db5ed8965f30fe1e2c6))
* fix watch crash when rebundling and restart server when files are added or deleted ([323f719](https://github.com/podium-lib/podlet-server/commit/323f719d857fbbf3fb29c8fa03dc49e964fa25d2))
* listen on all ipv4 hosts ([9ddee80](https://github.com/podium-lib/podlet-server/commit/9ddee809941bf0b4f9d3591703f5f69de10a80bd))


### Features

* improve prod bundle sizes with rollup ([042479a](https://github.com/podium-lib/podlet-server/commit/042479a0188dbcf83978e125a85f2d0c19f5e5e3))
