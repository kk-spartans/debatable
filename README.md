# debatable

[![CI](https://github.com/kk-spartans/debatable/actions/workflows/ci.yml/badge.svg)](https://github.com/kk-spartans/debatable/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/debatable)](https://www.npmjs.com/package/debatable)
[![License: Unlicense](https://img.shields.io/badge/license-Unlicense-blue.svg)](https://unlicense.org/)

Make AI models argue.

## Run

### Docker (recommended)

Copy `.env.example` to `.env` and set `OPENROUTER_API_KEY`, then:

```bash
docker compose -f devops/docker-compose.yml up -d searxng
docker compose -f devops/docker-compose.yml run --rm debatable
```

For local development (builds from source):

```bash
docker compose -f devops/docker-compose-dev.yml up -d searxng
docker compose -f devops/docker-compose-dev.yml run --rm debatable
```

### Without Docker

First, start SearXNG with JSON format enabled:

```bash
docker run --rm -p 8080:8080 \
  -v "$(mktemp -d):/etc/searxng" \
  --entrypoint sh \
  searxng/searxng:latest \
  -c 'cp /usr/local/searxng/searx/settings.yml /etc/searxng/settings.yml \
    && sed -i "s/^  formats:.*/  formats: [html, json]/" /etc/searxng/settings.yml \
    && exec /usr/local/searxng/dockerfiles/docker-entrypoint.sh'
```

Then run debatable:

```bash
bunx debatable
nix run github:kk-spartans/debatable --no-write-lock-file
```

### Nix

```bash
nix run github:kk-spartans/debatable --no-write-lock-file
nix run github:kk-spartans/debatable --no-write-lock-file "Is AI a threat to humanity?"
nix profile install github:kk-spartans/debatable
nix build .#default
```

## Usage

```text
Usage: debatable [options] [topic]

An AI debate between PRO and NEG on a given topic.

Options:
  topic                    Debate topic (required in headless mode)
  -r, --rounds <n>         Number of debate rounds (default: 3)
  -m, --min-searches <n>   Minimum searches per turn (default: 1)
  -k, --api-key <key>      Set API key (overrides OPENROUTER_API_KEY)
  --model <model>          Default model for all sides
  --pro-model <model>      Override model for the PRO side
  --con-model <model>      Override model for the NEG side
  --judge-model <model>    Override model for judging and feedback
  --searxng-url <url>      Base URL for SearXNG (default: $SEARXNG_BASE_URL or http://localhost:8080)
  -o, --output <path>      Output markdown file path
  --headless               Run without TUI
  --completions <shell>    Print shell completions
  -h, --help               Show help
```

### Examples

```bash
debatable "Migration increases unemployment"
debatable -r 2 "AI will replace most jobs" --headless
debatable -k sk-or-v1-xxx "Universal Basic Income" -o debate.md --headless
debatable --model openrouter/anthropic/claude-sonnet-4-20250514 "UBI" --headless
debatable --completions bash > /etc/bash_completion.d/debatable
```

## Requirements

- [Bun](https://bun.sh/) runtime (for non-Docker usage)
- An OpenRouter API key — set via `OPENROUTER_API_KEY` env var or `--api-key`
- SearXNG instance (docker compose handles this)

## Development

```bash
devenv.sh
bun install
bun dev
```

## Home Manager Module

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
    enableFishIntegration = true;
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

## License

[The Unlicense](https://unlicense.org/)
