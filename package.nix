{
  lib,
  config,
  dream2nix,
  ...
}: let
  cleanSrc = lib.cleanSourceWith {
    src = ./.;
    filter = name: type:
      let
        baseName = baseNameOf (toString name);
      in
      !(type == "directory" && (baseName == "node_modules" || baseName == ".devenv" || baseName == ".git" || baseName == "dist" || baseName == ".direnv"))
      && !(lib.hasPrefix "devenv" baseName && lib.hasSuffix ".nix" baseName)
      && !(baseName == "devenv.lock" || baseName == "flake.lock");
  };
in {
  imports = [
    dream2nix.modules.dream2nix.mkDerivation
  ];

  name = "debatable";
  version = "1.0.1";

  deps = { nixpkgs, ... }: {
    inherit (nixpkgs) bun;
  };

  mkDerivation = {
    src = cleanSrc;

    nativeBuildInputs = [config.deps.bun];

    dontStrip = true;

    buildPhase = ''
      runHook preBuild
      bun install --frozen-lockfile --no-verify
      bun build \
        --compile \
        --outfile dist/debatable \
        src/index.tsx
      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall
      mkdir -p $out/bin
      cp dist/debatable $out/bin/debatable
      runHook postInstall
    '';

    meta = {
      description = "AI debate simulator - two LLM instances argue PRO and NEG on a topic";
      homepage = "https://github.com/kk-spartans/debatable";
      license = lib.licenses.unlicense;
      mainProgram = "debatable";
    };
  };
}
