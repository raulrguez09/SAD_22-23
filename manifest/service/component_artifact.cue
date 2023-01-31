package service

import (
  f ".../frontend_sad:component"
  w ".../worker_sad:component"
)

#Artifact: {
  ref: name: "GitExecutorService"

  description: {
    config: {
      parameter: {
        language: string
      }
      resource: {}
    }

    role: {
      sadfrontend: artifact: f.#Artifact
      sadworker: artifact: w.#Artifact
    }

    role: {
      frontend_sad: {
        config: {
          parameter: {}
          resource: {}
        }
      }

      worker_sad: {
        config: {
          parameter: {
            appconfig: {
              language: description.config.parameter.language
            }
          }
          resource: {}
        }
      }
    }

    srv: {
      server: {
        gitservice: { protocol: "http", port: 80 }
      }
    }

    connect: {
      serviceconnector: {
        as: "lb"
  			from: self: "gitservice"
        to: frontend_sad: "restapi": _
      }
      evalconnector: {
        as: "lb"
        from: frontend_sad: "evalclient"
        to: worker_sad: "evalserver": _
      }
    }

  }
}
