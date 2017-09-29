# OS & initial setup
FROM debian:stable-20170907

# initial
RUN apt-get update
RUN apt-get install -y curl apt-transport-https ca-certificates
RUN apt-get install -y gnupg gnupg2

# install git
RUN apt-get install -y git

# assuming env is node
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -
RUN apt-get install -y nodejs

# user & env setup
USER root
ENV HOME /root
WORKDIR /var/conjure/code

# pull codebase & branch
# using CACHEBUST to prevent caching of git clone - see https://github.com/moby/moby/issues/1996#issuecomment-185872769
ARG CACHEBUST=<CACHEBUST>
# pull codebase & branch - without perms leakage
RUN git init
RUN git pull <REPO> <BRANCH>

# more will be appended
