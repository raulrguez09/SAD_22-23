# Instalamos nuestra imagen base
FROM ubuntu

WORKDIR /root

# Copy files from producer image
RUN mkdir ./producer
COPY ./index.js ./producer

# Installing requirements
RUN apt-get update
RUN echo "y" | apt-get install curl python3 make gcc g++ ed git pip

# Installing Node/NPM using NVM
RUN mkdir -p /usr/local/nvm
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION v16.17.0
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
RUN /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"

# add node and npm to the PATH
ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/bin
ENV PATH $NODE_PATH:$PATH

# Installing dependencies
RUN npm init -y

# Producer dependencies
RUN npm i express --save

# Producer and worker dependencies
RUN npm i node-rdkafka --save

# run the application
CMD ["node","./producer/index.js"]
