# first installing python, needed during `./configure`
# todo: if user specifies python version, should we handle wiping python first? or install their verison before node?
RUN apt-get install -y python

RUN \
  cd /tmp && \
  curl -o ./node-v7.7.2.tar.gz https://nodejs.org/dist/v7.7.2/node-v7.7.2.tar.gz && \
  tar -xzf ./node-v7.7.2.tar.gz && \
  cd node-v7.7.2 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./node-v7.7.2;
