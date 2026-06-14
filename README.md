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

### Nix

Run directly from GitHub:

```bash
nix run github:kk-spartans/debatable --no-write-lock-file
nix run github:kk-spartans/debatable --no-write-lock-file "Is AI a threat to humanity?"
```

Or install from the flake:

```bash
nix profile install github:kk-spartans/debatable
```

Or build from a local clone:

```bash
nix build .#default
# or
nix run . -- "Your debate topic" --headless
```

### Home Manager Module

This flake provides a home-manager module. Add it to your home-manager configuration:

```nix
# flake.nix
{
  inputs.debatable = {
    url = "github:kk-spartans/debatable";
    inputs.nixpkgs.follows = "nixpkgs";
  };
}

# home-manager module
{ inputs, ... }: {
  imports = [ inputs.debatable.homeManagerModules.default ];

  programs.debatable = {
    enable = true;
    enableFishIntegration = true; # or bash, zsh, nushell, powershell

    settings.theme = {
      accent = "#f5c2e7";
      pro = "#89b4fa";
      con = "#f38ba8";
      text = "#cdd6f4";
      subtext = "#a6adc8";
      surface0 = "#313244";
      muted = "#6c7086";
    };
  };
}
```

## Usage

```
Usage: debatable [options] [topic]

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
```

Shell completions are generated via [usage](https://usage.jdx.dev).
Supported shells: bash, zsh, fish, powershell, nushell.

### Examples

```bash
debatable "Migration increases unemployment"
debatable -r 2 "AI will replace most jobs" --headless
debatable -k sk-or-v1-xxx "Universal Basic Income" -o debate.md --headless
debatable --model openrouter/anthropic/claude-sonnet-4-20250514 "UBI" --headless
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
