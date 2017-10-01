# needed for `./configure`
RUN apt-get install -y libxml2-dev

RUN \
  cd /tmp && \
  curl -o ./php-5.4.34.tar.gz http://museum.php.net/php5/php-5.4.34.tar.gz && \
  tar -zxf ./php-5.4.34.tar.gz && \
  cd php-5.4.34 && \
  ./configure && \
  make && \
  make install && \
  cd /tmp && \
  rm -rf ./php-5.4.34;

