{
  lib,
  dockerTools,
  debatable,
  cacert,
}:

let
  pkg = builtins.fromJSON (builtins.readFile ../package.json);
  image = dockerTools.buildLayeredImage {
    name = "ghcr.io/kk-spartans/debatable/debatable-app";
    tag = "latest";
    contents = [
      debatable
      cacert
      dockerTools.fakeNss
    ];
    config = {
      Entrypoint = [ "/bin/debatable" ];
      Env = [
        "SSL_CERT_FILE=/etc/ssl/certs/ca-bundle.crt"
        "PATH=/bin"
      ];
      Labels = {
        "org.opencontainers.image.source" = "https://github.com/kk-spartans/debatable";
        "org.opencontainers.image.title" = pkg.name;
        "org.opencontainers.image.version" = pkg.version;
      };
    };
    meta = {
      description = "Docker image for ${pkg.name}";
      license = lib.licenses.unlicense;
    };
  };
in
image
// {
  isExe = false;
  passthru = (image.passthru or { }) // {
    isExe = false;
  };

  meta = {
    description = "Docker image for ${pkg.name}";
    license = lib.licenses.unlicense;
  };
}
