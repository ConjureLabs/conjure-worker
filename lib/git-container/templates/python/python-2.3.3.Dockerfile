RUN \
  cd /tmp && \
  curl -o ./Python-2.3.3.tgz https://www.python.org/ftp/python/2.3.3/Python-2.3.3.tgz && \
  tar -xzf ./Python-2.3.3.tgz && \
  cd ./Python-2.3.3 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./Python-2.3.3;
