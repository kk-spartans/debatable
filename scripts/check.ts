import { $ } from "bun";

const steps = [
  async () => {
    await $`bun build --compile --outfile dist/debatable src/index.tsx`;
  },
  async () => {
    await $`oxlint --type-aware --type-check --fix`;
  },
  async () => {
    await $`oxfmt --write`;
  },
  async () => {
    await $`knip`;
  },
  async () => {
    await $`e18e-cli analyze --log-level error`;
  },
  async () => {
    await $`bunx react-doctor --score`;
  },
];

let failed = false;

for (const step of steps) {
  try {
    await step();
  } catch {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
