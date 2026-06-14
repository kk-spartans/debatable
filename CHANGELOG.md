## [1.2.8](https://github.com/kk-spartans/debatable/compare/v1.2.7...v1.2.8) (2026-06-14)


### Bug Fixes

* use bunx oxfmt in release prepare step ([16cdd98](https://github.com/kk-spartans/debatable/commit/16cdd98bcaa63ffc32f55ec5d509e20cd5f807de))

## [1.2.7](https://github.com/kk-spartans/debatable/compare/v1.2.6...v1.2.7) (2026-06-14)


### Bug Fixes

* fmt CHANGELOG.md for CI format check ([9d3b645](https://github.com/kk-spartans/debatable/commit/9d3b6454e564e7af75f91e79fa57ef1d9fbb99c1))

## [1.2.6](https://github.com/kk-spartans/debatable/compare/v1.2.5...v1.2.6) (2026-06-14)

### Bug Fixes

- nix-built binary shows bun help instead of debatable ([1508637](https://github.com/kk-spartans/debatable/commit/1508637d934e5eca68d3af900b0a1cb0632269bd))

## [1.2.5](https://github.com/kk-spartans/debatable/compare/v1.2.4...v1.2.5) (2026-06-14)

### Bug Fixes

- nix build by prefetching bun deps as fixed-output derivation ([dccf560](https://github.com/kk-spartans/debatable/commit/dccf5606dab3c1754d90d42715fee05c3a2e993b))

## [1.2.4](https://github.com/kk-spartans/debatable/compare/v1.2.3...v1.2.4) (2026-06-14)

### Bug Fixes

- replace unused catch params with bare catch blocks ([e8e2b4e](https://github.com/kk-spartans/debatable/commit/e8e2b4e9e0f5771e98705549ab7dc396b9c2d531))

## [1.2.3](https://github.com/kk-spartans/debatable/compare/v1.2.2...v1.2.3) (2026-06-14)

### Bug Fixes

- **release:** zip artifacts as debatable-{platform}-{arch}.zip with single binary inside ([0116781](https://github.com/kk-spartans/debatable/commit/011678144238fbefac9dbf28906dfc8e5376831c))

## [1.2.2](https://github.com/kk-spartans/debatable/compare/v1.2.1...v1.2.2) (2026-06-14)

### Bug Fixes

- **release:** install platform-specific native deps per target before cross-compilation ([161648f](https://github.com/kk-spartans/debatable/commit/161648f2d856f45f17a20afd5598d6b404b40429))

## [1.2.1](https://github.com/kk-spartans/debatable/compare/v1.2.0...v1.2.1) (2026-06-14)

### Bug Fixes

- **release:** bun doesn't support `unknown-linux` ([3fd26cd](https://github.com/kk-spartans/debatable/commit/3fd26cd4dce887bfbaac3744cdb18c9c5a884598))

# [1.2.0](https://github.com/kk-spartans/debatable/compare/v1.1.7...v1.2.0) (2026-06-14)

### Bug Fixes

- format CHANGELOG.md with oxfmt ([c8eb15d](https://github.com/kk-spartans/debatable/commit/c8eb15deda8a9895c4b90cdcd952e1b0ef33a166))
- **nix:** dream2nix not pulling deps due to timeout ([c2207c3](https://github.com/kk-spartans/debatable/commit/c2207c3ad873ad072e525dca024b0fc44ff4c7dc))

### Features

- add aarch64-pc-windows-msvc to release artifacts matrix ([012854e](https://github.com/kk-spartans/debatable/commit/012854e81c1ae059cbcdb2d441d606c1a9f48625))

## [1.1.7](https://github.com/kk-spartans/debatable/compare/v1.1.6...v1.1.7) (2026-06-10)

### Bug Fixes

- **ci:** format CHANGELOG.md with oxfmt ([0342457](https://github.com/kk-spartans/debatable/commit/0342457ccaf1a6b66fb26f99cfe04990ad3f9a86))

## [1.1.6](https://github.com/kk-spartans/debatable/compare/v1.1.5...v1.1.6) (2026-06-10)

### Bug Fixes

- **ci:** auto-format CHANGELOG.md with oxfmt ([1902c0c](https://github.com/kk-spartans/debatable/commit/1902c0cb27781d3db20bac48d08398ae81f1a4bc))

## [1.1.5](https://github.com/kk-spartans/debatable/compare/v1.1.4...v1.1.5) (2026-06-10)

### Bug Fixes

- **release:** run oxfmt --write on CHANGELOG.md before git commit via @semantic-release/exec ([c8586d8](https://github.com/kk-spartans/debatable/commit/c8586d8c2baee89b74f1de08bcfb1bef09a0d110))

## [1.1.4](https://github.com/kk-spartans/debatable/compare/v1.1.3...v1.1.4) (2026-06-10)

### Bug Fixes

- **ci:** use oxfmt --write instead of --check to auto-fix formatting ([5f9a93a](https://github.com/kk-spartans/debatable/commit/5f9a93a3cbde258e8253d9eb6259f1a57162f5b3))

## [1.1.3](https://github.com/kk-spartans/debatable/compare/v1.1.2...v1.1.3) (2026-06-10)

### Bug Fixes

- **ci:** actually format CHANGELOG.md this time ([b98d497](https://github.com/kk-spartans/debatable/commit/b98d4976ca624fb469f31e591614b2979af998fc))

## [1.1.2](https://github.com/kk-spartans/debatable/compare/v1.1.1...v1.1.2) (2026-06-10)

### Bug Fixes

- **ci:** format CHANGELOG.md ([2f717cd](https://github.com/kk-spartans/debatable/commit/2f717cdb7ea5b9a56c47d755d9b51142da920e59))

## [1.1.1](https://github.com/kk-spartans/debatable/compare/v1.1.0...v1.1.1) (2026-06-10)

### Bug Fixes

- **ci:** run oxfmt on CHANGELOG.md && swallow react-doctor --score exit code ([6ac671f](https://github.com/kk-spartans/debatable/commit/6ac671fe1bb1b1caa2d085dbcda920e3fe8b7a89))

# [1.1.0](https://github.com/kk-spartans/debatable/compare/v1.0.2...v1.1.0) (2026-06-10)

### Features

- nix flake, home-manager module, JSON theme config ([613b14d](https://github.com/kk-spartans/debatable/commit/613b14d1b84add6b1268dfccba80d2cc5905ccf9))

## [1.0.2](https://github.com/kk-spartans/debatable/compare/v1.0.1...v1.0.2) (2026-06-09)

### Bug Fixes

- **package:** add repository.url for sigstore provenance validation ([82acd66](https://github.com/kk-spartans/debatable/commit/82acd66b69bea907cb3bef5ed47cf8f87a667ff2))

## [1.0.1](https://github.com/kk-spartans/debatable/compare/v1.0.0...v1.0.1) (2026-06-09)

### Bug Fixes

- **release:** run semantic-release directly via devenv shell for OIDC token passthrough ([6f6d86b](https://github.com/kk-spartans/debatable/commit/6f6d86bb84264034a3c8d82e06af2a93afc78ae3))

# 1.0.0 (2026-06-09)

### Bug Fixes

- **release:** disable npm publish (binary CLI, distributed via GitHub Releases) ([c36e444](https://github.com/kk-spartans/debatable/commit/c36e444e0d51893b97607d0323a956425f352e15))
- **release:** use npm trusted publishing ([cbff42e](https://github.com/kk-spartans/debatable/commit/cbff42e0d73a503a861cbe02ad6496fdaeebf905))
- remove redundant bottom bar and speed improvements ([c2c8a43](https://github.com/kk-spartans/debatable/commit/c2c8a43402a4756bfe5eebd52426b5c74358de2d))

### Features

- create a production-ready usable stack ([91f4587](https://github.com/kk-spartans/debatable/commit/91f45871d3f85807b338eec471a6256637a7e331))
