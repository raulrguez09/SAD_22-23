# Instalamos nuestra imagen base
FROM ubuntu:18.04

# Copy files
COPY ./EjemploImage /root/

# Installing Node/NPM using NVM
# NVM requirements
RUN apt-get update
RUN echo "y" | apt-get install curl python3 make gcc g++ ed

# NVM env vars
RUN mkdir -p /usr/local/nvm
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION v16.17.0
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
RUN /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"

# add node and npm to the PATH
ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/bin
ENV PATH $NODE_PATH:$PATH

#
WORKDIR /root/
RUN npm init -y
RUN npm i avsc --save
RUN npm i shelljs --save
RUN npm i events --save
RUN npm i readline --save
RUN npm i node-fs --save
RUN npm i express --save
RUN npm i lodash --save
RUN npm i node-rdkafka --save

# RUN printf '5i\n\t"type": "module",\n.\n,p\n' | ed -s package.json
RUN printf '7i\n\t"start:producer": "node ./producer/index.js",,\n.\n,p\n' | ed -s package.json
RUN printf '8i\n\t"start:consumer": "node ./consumer/index.js",,\n.\n,p\n' | ed -s package.json

# tell the port number the container should expose
# EXPOSE 3000

# run the application
#CMD ["npm run start:consumer", ""]
