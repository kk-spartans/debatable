# Progress

## 2026-06-15

### CI Fix - Formatting

- **Problem**: `oxfmt --check` failed on `CHANGELOG.md` — v1.2.14 entry used `*` list marker while all other entries use `-`
- **Fix**: Changed `*` to `-` in the v1.2.14 entry, ran `oxfmt --write` to ensure consistency
- **Result**: CI passes ✓

### Nix Rebuild

- **Status**: `sudo nixos-rebuild switch` succeeded
- **Note**: `nvidia-container-toolkit-cdi-generator.service` fails with "Driver/library version mismatch" — this is a pre-existing NVIDIA driver issue, not related to debatable

### Nix Run Test

- `nix run github:kk-spartans/debatable --no-write-lock-file` — works ✓
- `nix run . -- --headless "test"` — works ✓ (requires `--model` in headless mode, which is expected)

### README

- Already comprehensive: npm install, npx/bunx, nix run (GitHub + local), nix profile install, home manager module, usage, examples, requirements, development

### All TODOs Complete

- CI passes ✓
- nixos-rebuild succeeds ✓
- nix run tested ✓
- README up to date ✓
