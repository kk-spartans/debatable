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

const log = (msg: string) => {
  console.log(msg);
  void Bun.write(Bun.stderr, msg + "\n");
};

let buildFailed = false;

for (const [i, step] of buildSteps.entries()) {
  try {
    log(`[ci] build step ${i} starting`);
    await step();
    log(`[ci] build step ${i} ok`);
  } catch {
    log(`[ci] build step ${i} FAILED`);
    buildFailed = true;
  }
}

let checkFailed = false;

for (const [i, step] of checkSteps.entries()) {
  try {
    log(`[ci] check step ${i} starting`);
    await step();
    log(`[ci] check step ${i} ok`);
  } catch {
    log(`[ci] check step ${i} FAILED`);
    checkFailed = true;
  }
}

log(`[ci] buildFailed=${buildFailed} checkFailed=${checkFailed}`);

try {
  await $`react-doctor --score`;
} catch {
  // always allow this to fail
}

if (buildFailed || checkFailed) {
  process.exit(1);
}
