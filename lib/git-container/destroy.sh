#! /bin/bash

BASE="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";
. $BASE/vars.cfg;

# see http://stackoverflow.com/questions/407523/escape-a-string-for-a-sed-replace-pattern
CONTAINER_NAME=$(sed 's/[\/&]/\\&/g' <<< $1); # -e?
CONTAINER_ID=$(sed 's/[\/&]/\\&/g' <<< $2);

# todo: if file is present (and it should be) then we should verify the container id is correct
docker kill $CONTAINER_ID;
rm "/tmp/$CONTAINER_NAME.cid";
