RUN \
  cd /tmp && \
  curl -o ./Python-2.2.2.tgz https://www.python.org/ftp/python/2.2.2/Python-2.2.2.tgz && \
  tar -xzf ./Python-2.2.2.tgz && \
  cd ./Python-2.2.2 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./Python-2.2.2;
