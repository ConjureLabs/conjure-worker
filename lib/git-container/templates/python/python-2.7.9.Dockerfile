RUN \
  cd /tmp && \
  curl -o ./Python-2.7.9.tgz https://www.python.org/ftp/python/2.7.9/Python-2.7.9.tgz && \
  tar -xzf ./Python-2.7.9.tgz && \
  cd ./Python-2.7.9 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./Python-2.7.9;
