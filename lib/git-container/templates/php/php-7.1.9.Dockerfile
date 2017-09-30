RUN \
  cd /tmp && \
  curl -o ./php-7.1.9.tar.bz2 http://php.net/get/php-7.1.9.tar.bz2/from/this/mirror && \
  tar -xjf ./php-7.1.9.tar.bz2 && \
  cd php-7.1.9 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./php-7.1.9;
