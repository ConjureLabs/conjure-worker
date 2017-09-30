RUN \
  cd /tmp && \
  curl -o ./Python-3.3.3.tgz https://www.python.org/ftp/python/3.3.3/Python-3.3.3.tgz && \
  tar -xzf ./Python-3.3.3.tgz && \
  cd ./Python-3.3.3 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./Python-3.3.3;
