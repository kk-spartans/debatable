import { $ } from "bun";

const gitleaks = async () => {
  const available = await $`command -v gitleaks`.quiet().nothrow();

  if (available.exitCode === 0) {
    await $`gitleaks protect --staged --redact --verbose`.nothrow();
    return;
  }

  await $`devenv shell gitleaks protect --staged --redact --verbose`.nothrow();
};

const buildSteps = [
  async () => {
    await $`bun build --compile --outfile dist/debatable src/index.tsx`;
  },
];

const checkSteps = [
  gitleaks,
  async () => {
    await $`oxlint --type-aware --type-check`;
  },
  async () => {
    await $`oxfmt --check`;
  },
  async () => {
    await $`knip`;
  },
  async () => {
    await $`e18e-cli analyze --log-level error`.nothrow();
  },
];

let buildFailed = false;

for (const step of buildSteps) {
  try {
    await step();
  } catch {
    buildFailed = true;
  }
}

let checkFailed = false;

for (const step of checkSteps) {
  try {
    await step();
  } catch {
    checkFailed = true;
  }
}

try {
  await $`react-doctor --score`;
} catch {
  // always allow this to fail
}

if (buildFailed || checkFailed) {
  process.exit(1);
}
