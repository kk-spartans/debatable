{
  pkgs,
  lib,
  config,
  inputs,
  ...
}:

{
  packages = with pkgs; [
    bun
    gitleaks
    usage
    nixfmt
    docker
    arion
    docker-compose
  ];

  languages = {
    javascript = {
      enable = true;
      bun = {
        enable = true;
        install.enable = true;
      };
    };
    typescript.enable = true;
  };

  dotenv.enable = true;

  git-hooks.hooks.check = {
    enable = true;
    name = "check";
    entry = "devenv tasks run debatable:check";
    pass_filenames = false;
    language = "system";
  };

  tasks = {
    "debatable:check".exec = "bun run check";
    "debatable:start".exec = "bun run start";
    "debatable:release".exec = "bun run release";
    "debatable:publish".exec = "bun run devops/publish.ts";
    "debatable:compose".exec =
      "arion -f devops/arion-compose.nix -p devops/arion-pkgs.nix run --rm debatable";
  };
}
