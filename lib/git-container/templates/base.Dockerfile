# OS & initial setup
FROM debian:stable-20170907

# user & env setup
USER root
ENV HOME /root
WORKDIR /var/conjure/code

# initial
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y apt-transport-https
RUN apt-get install -y ca-certificates
RUN apt-get install -y gnupg gnupg2
RUN apt-get install -y build-essential

# install git
RUN apt-get install -y git
