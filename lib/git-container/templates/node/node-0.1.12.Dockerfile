# first installing python, needed during `./configure`
# todo: if user specifies python version, should we handle wiping python first? or install their verison before node?
RUN apt-get install -y python

RUN \
  cd /tmp && \
  curl -o ./node-0.1.12.tar.gz http://nodejs.org/dist/node-0.1.12.tar.gz && \
  tar -xzf ./node-0.1.12.tar.gz && \
  cd node-0.1.12 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./node-0.1.12;
