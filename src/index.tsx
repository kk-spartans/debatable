#!/usr/bin/env bun
import { Effect } from "effect";
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { runDebate } from "./lib/run-debate.ts";
import { writeMarkdown } from "./lib/write-markdown.ts";
import { setSearxngUrl } from "./lib/search.ts";
import { readTheme } from "./lib/config.ts";
import type { DebateConfig } from "./lib/debate.ts";

const args = process.argv.slice(2);

function printHelp(): void {
  console.log(`Usage: debatable [options] [topic]

An AI debate between PRO and NEG on a given topic.

Options:
  topic                    Debate topic (required in headless mode)
  -r, --rounds <n>         Number of debate rounds (default: 3)
  -m, --min-searches <n>   Minimum searches per turn (default: 1)
  -k, --api-key <key>      Set API key (overrides OPENROUTER_API_KEY)
  --model <model>          Default model for all sides (e.g. openrouter/anthropic/claude-sonnet-4-20250514)
  --pro-model <model>      Override model for the PRO side
  --con-model <model>      Override model for the NEG side
  --judge-model <model>    Override model for judging and feedback
  --searxng-url <url>      Base URL for SearXNG instance (default: http://localhost:8080)
  -o, --output <path>      Output markdown file path
  --headless               Run in headless mode (no TUI)
  --completions <shell>    Print shell completions (bash, zsh, fish, powershell, nushell)
  -h, --help               Show this help message and exit

Headless mode requires both a topic and an API key (--api-key or OPENROUTER_API_KEY).

Examples:
  debatable "Migration increases unemployment"
  debatable -r 2 "AI will replace most jobs" --headless
  debatable -k sk-or-v1-xxx "Universal Basic Income" -o debate.md --headless
  debatable --model openrouter/anthropic/claude-sonnet-4-20250514 "UBI" --headless
  debatable --model openrouter/google/gemini-2.0-flash-001 --pro-model openrouter/anthropic/claude-sonnet-4-20250514 "AI safety" --headless`);
}

const helpFlag = args.includes("--help") || args.includes("-h");
if (helpFlag) {
  printHelp();
  process.exit(0);
}

const completionsFlag = args.indexOf("--completions");
if (completionsFlag !== -1) {
  const shell = args[completionsFlag + 1];
  if (!shell) {
    console.error(
      "Error: --completions requires a shell argument (bash, zsh, fish, powershell, nushell)",
    );
    process.exit(1);
  }
  const { generateCompletions } = await import("./lib/completions.ts");
  const output = await generateCompletions(shell);
  if (output) {
    console.log(output);
    process.exit(0);
  } else {
    console.error(
      `Error: unsupported shell "${shell}". Supported: bash, zsh, fish, powershell, nushell`,
    );
    process.exit(1);
  }
}

function parseArgs(argv: string[]) {
  let topic = "";
  let rounds = 3;
  let minSearches = 1;
  let outputPath: string | undefined;
  let headless = false;
  let model = "";
  let proModel = "";
  let conModel = "";
  let judgeModel = "";
  let searxngUrl = "";
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--headless") {
      headless = true;
    } else if (arg === "-r" || arg === "--rounds") {
      rounds = parseInt(argv[++i] ?? "3", 10) || 3;
    } else if (arg === "-m" || arg === "--min-searches") {
      minSearches = parseInt(argv[++i] ?? "0", 10) || 0;
    } else if (arg === "-k" || arg === "--api-key") {
      const key = argv[++i];
      if (key) {
        process.env.OPENROUTER_API_KEY = key;
      }
    } else if (arg === "--model") {
      model = argv[++i] ?? "";
    } else if (arg === "--pro-model") {
      proModel = argv[++i] ?? "";
    } else if (arg === "--con-model") {
      conModel = argv[++i] ?? "";
    } else if (arg === "--judge-model") {
      judgeModel = argv[++i] ?? "";
    } else if (arg === "--searxng-url") {
      searxngUrl = argv[++i] ?? "";
    } else if (arg === "-o" || arg === "--output") {
      outputPath = argv[++i];
    } else if (arg.startsWith("-")) {
    } else {
      positional.push(arg);
    }
  }

  topic = positional.join(" ");
  return {
    topic,
    rounds,
    minSearches,
    outputPath,
    headless,
    model,
    proModel,
    conModel,
    judgeModel,
    searxngUrl,
  };
}

const config = parseArgs(args);

if (config.headless) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!config.topic) {
    console.error("Error: Topic is required in headless mode.");
    console.error();
    printHelp();
    process.exit(1);
  }
  if (!apiKey) {
    console.error(
      "Error: OPENROUTER_API_KEY is required in headless mode. Use --api-key or set the OPENROUTER_API_KEY environment variable.",
    );
    console.error();
    printHelp();
    process.exit(1);
  }
  if (!config.model) {
    console.error("Error: --model is required in headless mode.");
    console.error();
    printHelp();
    process.exit(1);
  }

  if (config.searxngUrl) {
    setSearxngUrl(config.searxngUrl);
  }

  console.log(`Starting debate: "${config.topic}"`);
  console.log(`Model: ${config.model}`);
  if (config.proModel) console.log(`PRO model: ${config.proModel}`);
  if (config.conModel) console.log(`NEG model: ${config.conModel}`);
  if (config.judgeModel) console.log(`Judge model: ${config.judgeModel}`);
  console.log(`Rounds: ${config.rounds}, Min searches per turn: ${config.minSearches}`);

  const debateConfig: DebateConfig = {
    topic: config.topic,
    rounds: config.rounds,
    minSearches: config.minSearches,
    apiKey: apiKey!,
    model: config.model,
    proModel: config.proModel || undefined,
    conModel: config.conModel || undefined,
    judgeModel: config.judgeModel || undefined,
    searxngUrl: config.searxngUrl || undefined,
  };

  const result = await Effect.runPromise(runDebate(debateConfig));

  const path = writeMarkdown(result, config.outputPath);
  console.log(`Report written to: ${path}`);
  console.log(`Winner: ${result.judgeResult.winner}`);
  process.exit(0);
} else {
  const renderer = await createCliRenderer();
  const { App } = await import("./App.tsx");
  createRoot(renderer).render(
    <App
      initialTopic={config.topic || undefined}
      initialRounds={config.rounds}
      initialMinSearches={config.minSearches}
      initialModel={config.model || undefined}
      theme={readTheme()}
    />,
  );
}
