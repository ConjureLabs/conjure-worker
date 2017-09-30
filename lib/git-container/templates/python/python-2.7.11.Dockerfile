RUN \
  cd /tmp && \
  curl -o ./Python-2.7.11.tgz https://www.python.org/ftp/python/2.7.11/Python-2.7.11.tgz && \
  tar -xzf ./Python-2.7.11.tgz && \
  cd ./Python-2.7.11 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./Python-2.7.11;
