RUN \
  cd /tmp && \
  curl -o ./Python-3.4.7.tgz https://www.python.org/ftp/python/3.4.7/Python-3.4.7.tgz && \
  tar -xzf ./Python-3.4.7.tgz && \
  cd ./Python-3.4.7 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./Python-3.4.7;
