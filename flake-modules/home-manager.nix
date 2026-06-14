{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.programs.debatable;
  inherit (lib)
    mkIf
    mkEnableOption
    mkOption
    types
    ;

  hasCompletionIntegration =
    cfg.enableBashIntegration
    || cfg.enableZshIntegration
    || cfg.enableFishIntegration
    || cfg.enableNushellIntegration
    || cfg.enablePowerShellIntegration;
in
{
  options.programs.debatable = {
    enable = mkEnableOption "debatable - AI debate simulator";

    package = mkOption {
      type = types.package;
      description = "The debatable package to use";
    };

    settings = mkOption {
      type = types.submodule {
        options = {
          theme = mkOption {
            type = types.submodule {
              options = {
                accent = mkOption {
                  type = types.str;
                  default = "#f5c2e7";
                  description = "Accent color (border, highlights)";
                };
                pro = mkOption {
                  type = types.str;
                  default = "#89b4fa";
                  description = "PRO side color";
                };
                con = mkOption {
                  type = types.str;
                  default = "#f38ba8";
                  description = "CON/NEG side color";
                };
                text = mkOption {
                  type = types.str;
                  default = "#cdd6f4";
                  description = "Primary text color";
                };
                subtext = mkOption {
                  type = types.str;
                  default = "#a6adc8";
                  description = "Subtext color";
                };
                surface0 = mkOption {
                  type = types.str;
                  default = "#313244";
                  description = "Surface background color";
                };
                muted = mkOption {
                  type = types.str;
                  default = "#6c7086";
                  description = "Muted text color";
                };
              };
            };
            default = { };
            description = "Theme configuration (catppuccin mocha defaults)";
          };
        };
      };
      default = { };
      description = "Debatable settings (theme, etc.)";
    };

    enableZshIntegration = mkOption {
      type = types.bool;
      default = config.programs.zsh.enable or false;
      description = "Enable zsh integration (completions)";
    };

    enableBashIntegration = mkOption {
      type = types.bool;
      default = config.programs.bash.enable or false;
      description = "Enable bash integration (completions)";
    };

    enableFishIntegration = mkOption {
      type = types.bool;
      default = config.programs.fish.enable or false;
      description = "Enable fish integration (completions)";
    };

    enableNushellIntegration = mkOption {
      type = types.bool;
      default = config.programs.nushell.enable or false;
      description = "Enable nushell integration (completions)";
    };

    enablePowerShellIntegration = mkOption {
      type = types.bool;
      default = config.programs.powershell.enable or false;
      description = "Enable powershell integration (completions)";
    };

    enableIonIntegration = mkOption {
      type = types.bool;
      default = config.programs.ion.enable or false;
      description = "Enable ion integration";
    };

    enableXonshIntegration = mkOption {
      type = types.bool;
      default = config.programs.xonsh.enable or false;
      description = "Enable xonsh integration";
    };

    enableElvishIntegration = mkOption {
      type = types.bool;
      default = config.programs.elvish.enable or false;
      description = "Enable elvish integration";
    };
  };

  config = mkIf cfg.enable {
    home.packages = [ cfg.package ] ++ lib.optionals hasCompletionIntegration [ pkgs.usage ];

    xdg.configFile."debatable/config.json" = {
      text = builtins.toJSON {
        theme = {
          accent = cfg.settings.theme.accent or "#f5c2e7";
          pro = cfg.settings.theme.pro or "#89b4fa";
          con = cfg.settings.theme.con or "#f38ba8";
          text = cfg.settings.theme.text or "#cdd6f4";
          subtext = cfg.settings.theme.subtext or "#a6adc8";
          surface0 = cfg.settings.theme.surface0 or "#313244";
          muted = cfg.settings.theme.muted or "#6c7086";
        };
      };
    };

    xdg.dataFile."bash-completion/completions/debatable" = mkIf cfg.enableBashIntegration {
      source = "${cfg.package}/share/bash-completion/completions/debatable";
    };

    programs.zsh = mkIf cfg.enableZshIntegration {
      initExtra = "fpath+=${cfg.package}/share/zsh/site-functions";
    };

    xdg.configFile."fish/completions/debatable.fish" = mkIf cfg.enableFishIntegration {
      source = "${cfg.package}/share/fish/vendor_completions.d/debatable.fish";
    };

    programs.nushell = mkIf cfg.enableNushellIntegration {
      extraConfig = "source ${cfg.package}/share/nushell/completions/debatable.nu";
    };

    xdg.configFile."powershell/debatable-completions.ps1" = mkIf cfg.enablePowerShellIntegration {
      text = ". '${cfg.package}/share/powershell/completions/debatable.ps1'";
    };
  };
}
