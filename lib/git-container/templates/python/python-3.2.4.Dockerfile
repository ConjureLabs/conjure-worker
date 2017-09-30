RUN \
  cd /tmp && \
  curl -o ./Python-3.2.4.tgz https://www.python.org/ftp/python/3.2.4/Python-3.2.4.tgz && \
  tar -xzf ./Python-3.2.4.tgz && \
  cd ./Python-3.2.4 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./Python-3.2.4;
