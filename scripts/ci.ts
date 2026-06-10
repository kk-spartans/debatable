import { $ } from "bun";

const buildSteps = [
  async () => {
    await $`bun build --compile --outfile dist/debatable src/index.tsx`;
  },
];

const checkSteps = [
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
    await $`e18e-cli analyze --log-level error`;
  },
];

let buildFailed = false;

for (const step of buildSteps) {
  try {
    await step();
  } catch (e) {
    buildFailed = true;
  }
}

let checkFailed = false;

for (const step of checkSteps) {
  try {
    await step();
  } catch (e) {
    checkFailed = true;
  }
}

try {
  await $`react-doctor --score`;
} catch (e) {
  // always allow this to fail
}

if (buildFailed || checkFailed) {
  process.exit(1);
}
