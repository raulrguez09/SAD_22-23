package deployment

import (
  s ".../service:service"
)

#Deployment: {
  name: "GitExecutorService"
  artifact: s.#Artifact
  config: {
    parameter: {
      language: "en"
    }
    resource: {}
    scale: detail: {
      frontend: hsize: 1
      worker: hsize: 1
    }
    resilience: 0
  }
}
