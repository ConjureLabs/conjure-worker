RUN \
  cd /tmp && \
  curl -o ./ruby-1.9.2-p290.tar.gz https://cache.ruby-lang.org/pub/ruby/1.9/ruby-1.9.2-p290.tar.gz && \
  tar -xzf ./ruby-1.9.2-p290.tar.gz && \
  cd ./ruby-1.9.2-p290 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./ruby-1.9.2-p290;
