# OS & initial setup
FROM centos:centos7

# assuming env is node
RUN rpm -Uvh http://download.fedoraproject.org/pub/epel/6/i386/epel-release-6-8.noarch.rpm
RUN yum install -y tar curl sudo which wget htop vim-enhanced xz
RUN wget -O ~/node-v6.9.0-linux-x64.tar.xz https://nodejs.org/dist/v6.9.0/node-v6.9.0-linux-x64.tar.xz && \
  tar -C /usr/local --strip-components 1 -xJf ~/node-v6.9.0-linux-x64.tar.xz

# user & env setup
USER root
ENV HOME /root
WORKDIR /var/conjure/code

# basics
RUN yum install -y git

# pull codebase & branch
# using CACHEBUST to prevent caching of git clone - see https://github.com/moby/moby/issues/1996#issuecomment-185872769
ARG CACHEBUST=<CACHEBUST>
# pull codebase & branch - without perms leakage
RUN git init
RUN git pull <REPO> <BRANCH>

# rest is set up dynamically
