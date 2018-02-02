# OS & initial setup
FROM debian:stable-20170907

# user & env setup
USER root
ENV HOME /root
WORKDIR /var/conjure/code

# initial
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y apt-transport-https
RUN apt-get install -y ca-certificates
RUN apt-get install -y gnupg gnupg2
RUN apt-get install -y build-essential

# install git
RUN apt-get install -y git

# first installing python, needed during `./configure`
# todo: if user specifies python version, should we handle wiping python first? or install their verison before node?
RUN apt-get install -y python

RUN \
  cd /tmp && \
  curl -o ./node-v6.11.3.tar.gz https://nodejs.org/dist/v6.11.3/node-v6.11.3.tar.gz && \
  tar -xzf ./node-v6.11.3.tar.gz && \
  cd node-v6.11.3 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./node-v6.11.3;

# pull codebase & branch - without perms leakage
RUN git init
RUN git pull https://a3751ad41a5e85b0a84747ef3c0b44faaac2cb8d:x-oauth-basic@github.com/ConjureLabs/mock-web-repo.git tmarshall-patch-2

# more will be appended
RUN npm i -g next
RUN npm install
RUN npm run build
RUN npm install
