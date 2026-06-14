import { $ } from "bun";

const gitleaks = async () => {
  const available = await $`command -v gitleaks`.quiet().nothrow();

  if (available.exitCode === 0) {
    await $`gitleaks protect --staged --redact --verbose`;
    return;
  }

  await $`devenv shell gitleaks protect --staged --redact --verbose`;
};

const steps = [
  async () => {
    await $`bun run scripts/update-bun-deps-hash.ts`;
  },
  gitleaks,
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
    await $`e18e-cli analyze --log-level error`.nothrow();
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
