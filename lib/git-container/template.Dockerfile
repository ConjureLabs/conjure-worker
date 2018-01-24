FROM <TEMPLATE>

# adding any files needed to support conjure flow, within docker image
ADD ./conjure-files /var/conjure/support

# pull codebase & branch
# using CACHEBUST to prevent caching of git clone - see https://github.com/moby/moby/issues/1996#issuecomment-185872769
ARG CACHEBUST=<CACHEBUST>
# pull codebase & branch - without perms leakage
RUN git init
RUN git pull <REPO> <BRANCH>

# appending specific start command to entrypoint.sh
RUN echo "<START>" >> /var/conjure/support/entrypoint.sh

# more will be appended, if needed
