RUN \
  cd /tmp && \
  curl -o ./Python-3.5.0a3.tgz https://www.python.org/ftp/python/3.5.0/Python-3.5.0a3.tgz && \
  tar -xzf ./Python-3.5.0a3.tgz && \
  cd ./Python-3.5.0a3 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./Python-3.5.0a3;
