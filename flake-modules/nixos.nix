{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.programs.debatable;
  inherit (lib)
    mkEnableOption
    mkIf
    mkOption
    types
    ;
in
{
  options.programs.debatable = {
    enable = mkEnableOption "debatable - AI debate simulator";

    package = mkOption {
      type = types.package;
      description = "The debatable package to use";
    };

    enableFishIntegration = mkOption {
      type = types.bool;
      default = config.programs.fish.enable or false;
      description = "Enable fish integration";
    };
  };

  config = mkIf cfg.enable {
    environment.systemPackages = [ cfg.package ];

    environment.pathsToLink = mkIf cfg.enableFishIntegration [
      "/share/fish"
    ];
  };
}
