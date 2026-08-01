{
  config,
  lib,
  pkgs,
  ...
}:
let
  dockerImage = pkgs.callPackage ./docker.nix {
    debatable = pkgs.callPackage ./package.nix { };
  };
in
{
  config.project.name = "debatable";

  config.services.searxng = {
    service = {
      image = "searxng/searxng:latest";
      volumes = [ "./devops/settings.yml:/etc/searxng/settings.yml:ro" ];
      restart = "unless-stopped";
      capabilities = {
        ALL = false;
        CHOWN = true;
        SETGID = true;
        SETUID = true;
      };
    };
  };

  config.services.debatable = {
    build.image = lib.mkForce dockerImage;

    service = {
      depends_on = [ "searxng" ];
      env_file = [ "./.env" ];
      environment.SEARXNG_BASE_URL = "http://searxng:8080";
      tty = true;
    };

    out.service.stdin_open = true;
  };
}
