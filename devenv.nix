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
  };
}
