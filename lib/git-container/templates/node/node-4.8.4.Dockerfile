# first installing python, needed during `./configure`
# todo: if user specifies python version, should we handle wiping python first? or install their verison before node?
RUN apt-get install -y python

RUN \
  cd /tmp && \
  curl -o ./node-v4.8.4.tar.gz https://nodejs.org/dist/v4.8.4/node-v4.8.4.tar.gz && \
  tar -xzf ./node-v4.8.4.tar.gz && \
  cd node-v4.8.4 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./node-v4.8.4;
