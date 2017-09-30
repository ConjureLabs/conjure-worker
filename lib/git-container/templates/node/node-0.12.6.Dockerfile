# first installing python, needed during `./configure`
# todo: if user specifies python version, should we handle wiping python first? or install their verison before node?
RUN apt-get install -y python

RUN \
  cd /tmp && \
  curl -o ./node-v0.12.6.tar.gz https://nodejs.org/dist/v0.12.6/node-v0.12.6.tar.gz && \
  tar -xzf ./node-v0.12.6.tar.gz && \
  cd node-v0.12.6 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./node-v0.12.6;
