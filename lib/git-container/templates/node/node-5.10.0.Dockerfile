# first installing python, needed during `./configure`
# todo: if user specifies python version, should we handle wiping python first? or install their verison before node?
RUN apt-get install -y python

RUN \
  cd /tmp && \
  curl -o ./node-v5.10.0.tar.gz https://nodejs.org/dist/v5.10.0/node-v5.10.0.tar.gz && \
  tar -xzf ./node-v5.10.0.tar.gz && \
  cd node-v5.10.0 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./node-v5.10.0;
