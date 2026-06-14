import { $ } from "bun";
import { writeFileSync } from "fs";

const hashFile = "bun-deps-hash.nix";

// First try building with current hash
const proc = await $`nix build . --no-write-lock-file`.nothrow();
if (proc.exitCode === 0) {
  process.exit(0);
}

// Build failed - likely hash mismatch, extract the new hash
const stderr = proc.stderr.toString();
const match = stderr.match(/got:\s+(sha256-[A-Za-z0-9+/=]+)/);
if (match) {
  writeFileSync(hashFile, match[1] + "\n");
  console.log(`Updated bun-deps-hash.nix to ${match[1]}`);
} else {
  console.error("Could not extract hash from nix output.");
  console.error(stderr);
  process.exit(1);
}
