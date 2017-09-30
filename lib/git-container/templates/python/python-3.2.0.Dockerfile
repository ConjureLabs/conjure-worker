RUN \
  cd /tmp && \
  curl -o ./Python-3.2.0.tgz https://www.python.org/ftp/python/3.2.0/Python-3.2.0.tgz && \
  tar -xzf ./Python-3.2.0.tgz && \
  cd ./Python-3.2.0 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./Python-3.2.0;
