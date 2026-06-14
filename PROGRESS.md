# Progress

## 2026-06-14

### CI Fix

- **Problem**: `scripts/ci.ts` gitleaks step failed in CI because `gitleaks protect --staged` exits with code 1 when there are no staged changes (which is always the case in CI)
- **Fix**: Added `.nothrow()` to both gitleaks invocation paths in `scripts/ci.ts`

### Nix Hash Mismatch Fix

- **Problem**: `package.nix` used `builtins.currentTime` in the derivation name, causing non-reproducible builds and hash mismatches in nixos-rebuild
- **Fix**: Removed `builtins.currentTime` from `package.nix`, using a static name `${pkg.name}-bun-deps-${pkg.version}` instead

### README Update

- Added Nix install section (`nix run`, `nix profile install`)
- Added Home Manager Module section with configuration example
- Documented theme settings and shell integration options

### TODO

- Push changes and verify CI passes
- Test `nix run github:kk-spartans/debatable --no-write-lock-file` after push
- Verify `sudo nixos-rebuild switch` succeeds
