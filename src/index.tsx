#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import OpenAI from "openai";
import { runDebate } from "./lib/run-debate.ts";
import { writeMarkdown } from "./lib/write-markdown.ts";

const args = process.argv.slice(2);

function printHelp(): void {
  console.log(`Usage: debate [options] [topic]

An AI debate between PRO and NEG on a given topic.

Options:
  topic                    Debate topic (required in headless mode)
  -r, --rounds <n>         Number of debate rounds (default: 3)
  -m, --min-searches <n>   Minimum searches per turn (default: 1)
  -k, --api-key <key>      Set OpenRouter API key (overrides OPENROUTER_API_KEY)
  -o, --output <path>      Output markdown file path
  --headless               Run in headless mode (no TUI)
  -h, --help               Show this help message and exit

Headless mode requires both a topic and an API key (--api-key or OPENROUTER_API_KEY).

Examples:
  debate "Migration increases unemployment"
  debate -r 2 "AI will replace most jobs" --headless
  debate -k sk-or-v1-xxx "Universal Basic Income" -o debate.md --headless`);
}

const helpFlag = args.includes("--help") || args.includes("-h");
if (helpFlag) {
  printHelp();
  process.exit(0);
}

function parseArgs(argv: string[]) {
  let topic = "";
  let rounds = 3;
  let minSearches = 1;
  let outputPath: string | undefined;
  let headless = false;
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
    } else if (arg === "-o" || arg === "--output") {
      outputPath = argv[++i];
    } else if (arg.startsWith("-")) {
      // skip unknown flags
    } else {
      positional.push(arg);
    }
  }

  topic = positional.join(" ");
  return { topic, rounds, minSearches, outputPath, headless };
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
    console.error("Error: OPENROUTER_API_KEY is required in headless mode. Use --api-key or set the OPENROUTER_API_KEY environment variable.");
    console.error();
    printHelp();
    process.exit(1);
  }

  console.log(`Starting debate: "${config.topic}"`);
  console.log(`Rounds: ${config.rounds}, Min searches per turn: ${config.minSearches}`);

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });

  const result = await runDebate(config.topic, config.rounds, config.minSearches, openai);

  const path = writeMarkdown(result, config.outputPath);
  console.log(`Report written to: ${path}`);
  console.log(`Winner: ${result.judgeResult.winner}`);
  process.exit(0);
} else {
  // Interactive TUI mode
  const renderer = await createCliRenderer();
  const { App } = await import("./App.tsx");
  createRoot(renderer).render(
    <App
      initialTopic={config.topic || undefined}
      initialRounds={config.rounds}
      initialMinSearches={config.minSearches}
    />,
  );
}
