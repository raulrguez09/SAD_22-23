package component

#Artifact: {
  ref: name:  "worker_sad"

  description: {

    srv: {
      server: {
        evalserver: { protocol: "http", port: 3000 }
      }
    }

    config: {
      parameter: {
        appconfig: {
          language: string
        }
      }
      resource: {}
    }

    size: {
      bandwidth: { size: 10, unit: "M" }
    }

    probe: worker: {
      liveness: {
        protocol: http : { port: srv.server.evalserver.port, path: "/health" }
        startupGraceWindow: { unit: "ms", duration: 30000, probe: true }
        frequency: "medium"
        timeout: 30000  // msec
      }
      readiness: {
        protocol: http : { port: srv.server.evalserver.port, path: "/health" }
        frequency: "medium"
        timeout: 30000 // msec
      }
    }

    code: {

      worker: {
        name: "worker"

        image: {
          hub: { name: "", secret: "" }
          tag: "raulrguez09/worker_sad_v4"
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
            HTTP_SERVER_PORT_ENV: value: "\(srv.server.evalserver.port)"
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
