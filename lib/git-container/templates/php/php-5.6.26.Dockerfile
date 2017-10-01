# needed for `./configure`
RUN apt-get install -y libxml2-dev

RUN \
  cd /tmp && \
  curl -o ./php-5.6.26.tar.gz http://www.php.net/distributions/php-5.6.26.tar.gz && \
  tar -zxf ./php-5.6.26.tar.gz && \
  cd php-5.6.26 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./php-5.6.26;

