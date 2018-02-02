FROM <TEMPLATE>

# pull codebase & branch
# using CACHEBUST to prevent caching of git clone - see https://github.com/moby/moby/issues/1996#issuecomment-185872769
ARG CACHEBUST=<CACHEBUST>
# pull codebase & branch - without perms leakage
RUN git init
RUN git pull <REPO> <BRANCH>

# adding in entrypoint file, needed to boot the process
ADD entrypoint.sh /var/conjure/support/entrypoint.sh

# more will be appended, if needed
