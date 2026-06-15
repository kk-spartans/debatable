import { $ } from "bun";

const steps = [
  async () => {
    await $`gitleaks protect --staged --redact --verbose`;
  },
  async () => {
    await $`bun build --compile --outfile dist/debatable src/index.tsx`;
  },
  async () => {
    await $`oxlint --type-aware --fix --config devops/oxlintrc.json --tsconfig devops/tsconfig.json`;
  },
  async () => {
    await $`oxfmt --write`;
  },
  async () => {
    await $`knip --config devops/knip.json`;
  },
  async () => {
    await $`e18e-cli analyze --log-level error`.nothrow();
  },
  async () => {
    await $`bunx react-doctor --score`;
  },
  async () => {
    await $`tsc --noEmit -p devops/tsconfig.json`;
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
