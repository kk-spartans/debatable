{
  description = "Debatable - AI debate simulator";

  inputs = {
    dream2nix.url = "github:nix-community/dream2nix";
    dream2nix.inputs.nixpkgs.follows = "nixpkgs";
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs =
    {
      self,
      dream2nix,
      nixpkgs,
    }:
    let
      eachSystem = nixpkgs.lib.genAttrs [
        "aarch64-linux"
        "x86_64-linux"
      ];
    in
    {
      packages = eachSystem (system: {
        default = dream2nix.lib.evalModules {
          packageSets.nixpkgs = nixpkgs.legacyPackages.${system};
          modules = [
            ./package.nix
            {
              paths.projectRoot = ./.;
              paths.projectRootFile = "flake.nix";
              paths.package = ./.;
            }
          ];
        };
      });

      apps = eachSystem (system: {
        default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/debatable";
        };
      });

      devShells = eachSystem (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              bun
              codespell
              nixfmt
            ];
          };
        }
      );

      formatter = eachSystem (system: nixpkgs.legacyPackages.${system}.nixfmt);

      homeManagerModules.default =
        {
          config,
          lib,
          pkgs,
          ...
        }:
        let
          system = pkgs.stdenv.hostPlatform.system;
        in
        {
          imports = [ ./flake-modules/home-manager.nix ];

          config.programs.debatable.package = lib.mkDefault self.packages.${system}.default;
        };
    };
}
