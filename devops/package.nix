{
  lib,
  stdenv,
  bun,
  usage,
  cacert,
}:

let
  pkg = builtins.fromJSON (builtins.readFile ./package.json);

  bunDeps = stdenv.mkDerivation {
    name = "${pkg.name}-bun-deps-${pkg.version}";
    src = lib.sourceByRegex ./. [ "^package\\.json$" "^bun\\.lock$" ];
    nativeBuildInputs = [ bun ];
    buildInputs = [ cacert ];
    dontFixup = true;
    dontPatchShebangs = true;
    dontStrip = true;
    outputHashAlgo = "sha256";
    outputHashMode = "recursive";
    outputHash = "sha256-c4ZCQWTVnrYWiayCjCWdfpXKX/XwLXCQuHhSsekowRc=";
    buildPhase = ''
      export HOME=$TMPDIR
      export SSL_CERT_FILE=${cacert}/etc/ssl/certs/ca-bundle.crt
      bun install --no-verify
    '';
    installPhase = ''
      mkdir -p $out/node_modules
      cp -r node_modules/* node_modules/.* $out/node_modules/ 2>/dev/null || true
    '';
  };
in
stdenv.mkDerivation {
  inherit (pkg) name version;

  src = lib.cleanSourceWith {
    src = ./.;
    filter =
      name: type:
      let
        baseName = baseNameOf (toString name);
      in
      !(
        type == "directory"
        && (
          baseName == "node_modules"
          || baseName == ".devenv"
          || baseName == ".git"
          || baseName == "dist"
          || baseName == ".direnv"
        )
      )
      && !(lib.hasPrefix "devenv" baseName && lib.hasSuffix ".nix" baseName)
      && !(baseName == "devenv.lock" || baseName == "flake.lock");
  };

  dontStrip = true;
  dontPatchELF = true;

  nativeBuildInputs = [
    bun
    usage
  ];

  buildPhase = ''
    runHook preBuild
    export HOME=$TMPDIR
    cp -r --no-preserve=mode ${bunDeps}/node_modules node_modules
    bun build --compile --outfile dist/debatable src/index.tsx
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p $out/bin
    cp dist/debatable $out/bin/debatable

    mkdir -p $out/share/bash-completion/completions
    mkdir -p $out/share/zsh/site-functions
    mkdir -p $out/share/fish/vendor_completions.d
    mkdir -p $out/share/nushell/completions
    mkdir -p $out/share/powershell/completions

    usage g completion bash debatable -f devops/usage.kdl > $out/share/bash-completion/completions/debatable
    usage g completion zsh debatable -f devops/usage.kdl > $out/share/zsh/site-functions/_debatable
    usage g completion fish debatable -f devops/usage.kdl > $out/share/fish/vendor_completions.d/debatable.fish
    usage g completion nu debatable -f devops/usage.kdl > $out/share/nushell/completions/debatable.nu
    usage g completion powershell debatable -f devops/usage.kdl > $out/share/powershell/completions/debatable.ps1

    runHook postInstall
  '';

  meta = {
    description = "AI debate simulator - two LLM instances argue PRO and NEG on a topic";
    homepage = "https://github.com/kk-spartans/debatable";
    license = lib.licenses.unlicense;
    mainProgram = "debatable";
  };
}
