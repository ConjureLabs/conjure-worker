RUN \
  cd /tmp && \
  curl -o ./Python-2.6.7.tgz https://www.python.org/ftp/python/2.6.7/Python-2.6.7.tgz && \
  tar -xzf ./Python-2.6.7.tgz && \
  cd ./Python-2.6.7 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./Python-2.6.7;
