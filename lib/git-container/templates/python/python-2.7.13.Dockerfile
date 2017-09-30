RUN \
  cd /tmp && \
  curl -o ./Python-2.7.13.tgz https://www.python.org/ftp/python/2.7.13/Python-2.7.13.tgz && \
  tar -xzf ./Python-2.7.13.tgz && \
  cd ./Python-2.7.13 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./Python-2.7.13;
