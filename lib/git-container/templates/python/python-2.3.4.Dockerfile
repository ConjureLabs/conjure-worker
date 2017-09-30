RUN \
  cd /tmp && \
  curl -o ./Python-2.3.4.tgz https://www.python.org/ftp/python/2.3.4/Python-2.3.4.tgz && \
  tar -xzf ./Python-2.3.4.tgz && \
  cd ./Python-2.3.4 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./Python-2.3.4;
