RUN \
  cd /tmp && \
  curl -o ./Python-2.6.8.tgz https://www.python.org/ftp/python/2.6.8/Python-2.6.8.tgz && \
  tar -xzf ./Python-2.6.8.tgz && \
  cd ./Python-2.6.8 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./Python-2.6.8;
