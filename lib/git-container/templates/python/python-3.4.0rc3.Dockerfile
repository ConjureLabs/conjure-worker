RUN \
  cd /tmp && \
  curl -o ./Python-3.4.0rc3.tgz https://www.python.org/ftp/python/3.4.0rc3/Python-3.4.0rc3.tgz && \
  tar -xzf ./Python-3.4.0rc3.tgz && \
  cd ./Python-3.4.0rc3 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./Python-3.4.0rc3;
