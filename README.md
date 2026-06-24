# debatable

**I don't have any more ideas for this. If you have something you want to add, please open an issue, or make a PR. It does not have to be properly formatted, or well thought out (I've seen a lot of friction here).**

docker:

```
mkdir debatable
cd debatable
curl https://raw.githubusercontent.com/kk-spartans/debatable/refs/heads/main/devops/docker-compose.yml > docker-compose.yml
curl https://raw.githubusercontent.com/kk-spartans/debatable/refs/heads/main/devops/settings.yml > settings.yml
echo "OPENROUTER_API_KEY=xxx" > .env
docker compose run --rm -d searxng
docker compose run --rm debatable
```

nix:

```
# make sure to set the OPENROUTER_API_KEY env var
nix run github:kk-spartans/debatable --no-write-lock-file --searxng-url "http://localhost:8080"
```

npm:

```
bunx debatable --searxng-url "http://localhost:8080"
```

## Home Manager Module

_i was bored_

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
