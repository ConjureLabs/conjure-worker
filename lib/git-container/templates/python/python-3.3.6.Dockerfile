RUN \
  cd /tmp && \
  curl -o ./Python-3.3.6.tgz https://www.python.org/ftp/python/3.3.6/Python-3.3.6.tgz && \
  tar -xzf ./Python-3.3.6.tgz && \
  cd ./Python-3.3.6 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./Python-3.3.6;
