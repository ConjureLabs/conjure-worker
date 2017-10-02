RUN \
  cd /tmp && \
  curl -o ./ruby-2.0.0-p648.tar.gz https://cache.ruby-lang.org/pub/ruby/2.0/ruby-2.0.0-p648.tar.gz && \
  tar -xzf ./ruby-2.0.0-p648.tar.gz && \
  cd ./ruby-2.0.0-p648 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./ruby-2.0.0-p648;
