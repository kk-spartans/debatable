import { $ } from "bun";
import { readFileSync, rmSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf-8"));
const tag = `v${version}`;

const platforms = [
  { target: "bun-linux-arm64", suffix: "linux-arm64", ext: "" },
  { target: "bun-linux-x64", suffix: "linux-x64", ext: "" },
  { target: "bun-darwin-x64", suffix: "darwin-x64", ext: "" },
  { target: "bun-darwin-arm64", suffix: "darwin-arm64", ext: "" },
  { target: "bun-windows-x64", suffix: "windows-x64", ext: ".exe" },
  { target: "bun-windows-arm64", suffix: "windows-arm64", ext: ".exe" },
];

const nativePlats = [
  { cpu: "arm64", os: "linux" },
  { cpu: "x64", os: "darwin" },
  { cpu: "arm64", os: "darwin" },
  { cpu: "x64", os: "win32" },
  { cpu: "arm64", os: "win32" },
];

console.log(`Publishing ${tag}`);

for (const { cpu, os } of nativePlats) {
  await $`bun install --frozen-lockfile --no-verify --cpu ${cpu} --os ${os}`;
}

await $`mkdir -p artifacts`;

for (const { target, suffix, ext } of platforms) {
  await $`bun build --compile --outfile artifacts/debatable${ext} --target ${target} src/index.tsx`;
  await $`zip -j debatable-${suffix}.zip artifacts/debatable${ext}`;
  await $`rm artifacts/debatable${ext}`;
}

await $`gh release upload ${tag} debatable-*.zip --clobber`;

await $`rm debatable-*.zip`;
rmSync("artifacts", { recursive: true });
