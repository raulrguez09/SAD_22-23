package component

#Artifact: {
  ref: name:  "frontend_sad"

  description: {

    srv: {
      server: {
        restapi: { protocol: "http", port: 3000 }
      }
      client: {
        evalclient: { protocol: "http" }
      }
    }

    config: {
      parameter: {
        appconfig: {
          endpoint: "http://0.evalclient/calc"
        }
      }
      resource: {}
    }

    size: {
      bandwidth: { size: 10, unit: "M" }
    }

    probe: frontend: {
      liveness: {
        protocol: http : { port: srv.server.restapi.port, path: "/health" }
        startupGraceWindow: { unit: "ms", duration: 30000, probe: true }
        frequency: "medium"
        timeout: 30000  
      }
      readiness: {
        protocol: http : { port: srv.server.restapi.port, path: "/health" }
        frequency: "medium"
        timeout: 30000 
      }
    }

    code: {

      frontend: {
        name: "frontend_sad"

        image: {
          hub: { name: "", secret: "" }
          tag: "raulrguez09/frontend_sad_v4"
        }

        mapping: {
          filesystem: {
            "/config.json": {
              data: value: config.parameter.appconfig
              format: "json"
            }
          }
          env: {
            CONFIG_FILE: value: "/config.json"
            HTTP_SERVER_PORT_ENV: value: "\(srv.server.restapi.port)"
          }
        }

        size: {
          memory: { size: 100, unit: "M" }
          mincpu: 100
          cpu: { size: 200, unit: "m" }
        }
      }
    }
  }
}
