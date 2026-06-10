{ config, lib, pkgs, ... }:

let
  cfg = config.programs.debatable;
  inherit (lib) mkIf mkEnableOption mkOption types;
in {
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
            default = {};
            description = "Theme configuration (catppuccin mocha defaults)";
          };
        };
      };
      default = {};
      description = "Debatable settings (theme, etc.)";
    };

    enableZshIntegration = mkOption {
      type = types.bool;
      default = config.programs.zsh.enable or false;
      description = "Enable zsh integration";
    };

    enableBashIntegration = mkOption {
      type = types.bool;
      default = config.programs.bash.enable or false;
      description = "Enable bash integration";
    };

    enableFishIntegration = mkOption {
      type = types.bool;
      default = config.programs.fish.enable or false;
      description = "Enable fish integration";
    };
  };

  config = mkIf cfg.enable {
    home.packages = [ cfg.package ];

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

    programs.zsh = mkIf cfg.enableZshIntegration {
      initExtra = ''
        if command -v debatable &>/dev/null; then
          eval "$(debatable --completions zsh)"
        fi
      '';
    };

    programs.bash = mkIf cfg.enableBashIntegration {
      initExtra = ''
        if command -v debatable &>/dev/null; then
          eval "$(debatable --completions bash)"
        fi
      '';
    };

    programs.fish = mkIf cfg.enableFishIntegration {
      interactiveShellInit = ''
        if command -v debatable &>/dev/null
          debatable --completions fish | source
        end
      '';
    };
  };
}
