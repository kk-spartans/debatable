# debatable

[![CI](https://github.com/kk-spartans/debatable/actions/workflows/ci.yml/badge.svg)](https://github.com/kk-spartans/debatable/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/debatable)](https://www.npmjs.com/package/debatable)
[![License: Unlicense](https://img.shields.io/badge/license-Unlicense-blue.svg)](https://unlicense.org/)

AI debate simulator - two LLM instances argue PRO and NEG on a given topic, with web search, streaming TUI, and markdown report generation.

## Install

```bash
npm install -g debatable
```

Or run directly:

```bash
npx debatable
bunx debatable
```

## Usage

```
debatable [options] <topic>

Arguments:
  topic                    Debate topic

Options:
  -r, --rounds <n>         Number of debate rounds (default: 3)
  -m, --min-searches <n>   Minimum searches per round (default: 2)
  -k, --api-key <key>      API key (passed directly)
  --api-key-env <var>      Environment variable name containing the API key (default: OPENROUTER_API_KEY)
  --model <model>          LLM model to use (default: openai/gpt-4o)
  --pro-model <model>      Override model for PRO
  --con-model <model>      Override model for NEG
  --judge-model <model>    Override model for judge
  -o, --output <path>      Output path for markdown report
  --headless               Run in headless mode (no TUI)
  --completions <shell>    Generate shell completions (bash, zsh, fish, powershell, elvish, nushell)
  -h, --help               Show help

Shell completions are generated via [usage](https://usage.jdx.dev) (available in the dev shell).
Supported shells: bash, zsh, fish, powershell, nushell.
```

### Examples

```bash
debatable "Is AI a threat to humanity?"
debatable -r 5 "Should we colonize Mars?"
debatable --headless -o report.md "Is pineapple on pizza acceptable?"
debatable --api-key-env ANTHROPIC_API_KEY "Will AI replace all jobs?" --headless
debatable --completions bash > /etc/bash_completion.d/debatable
```

## Requirements

- [Bun](https://bun.sh/) runtime
- [usage](https://usage.jdx.dev) CLI for shell completion generation (or use `devenv shell`)
- An API key for a supported AI provider — set via `OPENROUTER_API_KEY` (default), `--api-key-env`, or `--api-key`

## Development

```bash
devenv.sh
bun install
bun dev
```

## License

[The Unlicense](https://unlicense.org/)
