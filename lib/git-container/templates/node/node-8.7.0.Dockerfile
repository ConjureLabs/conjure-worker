# first installing python, needed during `./configure`
# todo: if user specifies python version, should we handle wiping python first? or install their verison before node?
RUN apt-get install -y python

RUN \
  cd /tmp && \
  curl -o ./node-v8.7.0.tar.gz https://nodejs.org/dist/v8.7.0/node-v8.7.0.tar.gz && \
  tar -xzf ./node-v8.7.0.tar.gz && \
  cd node-v8.7.0 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./node-v8.7.0;
