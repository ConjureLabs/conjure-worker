#! /bin/bash

BASE="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";
. $BASE/../vars.cfg;

# see http://stackoverflow.com/questions/407523/escape-a-string-for-a-sed-replace-pattern
TARGET_TEMPLATE_LOCATION=$1;
TARGET_TEMPLATE_NAME=$(sed 's/[\/&]/\\&/g' <<< $2);
FROM_TEMPLATE=$(sed 's/[\/&]/\\&/g' <<< $3);

DOCKERFILE_CONTENT="";

# append something like FROM conjure:node-v6
if [ "$FROM_TEMPLATE" != "" ]; then
  DOCKERFILE_CONTENT+=$(echo -e "FROM $FROM_TEMPLATE\n");
fi

# append rest of dockerfile template chunk
DOCKERFILE_CONTENT+=$(cat "$GIT_CONTAINER_DIR/templates/$TARGET_TEMPLATE_LOCATION");

TARGET_TEMPLATE_NAME_FILESAFE=$(sed 's/[:\/\.]/_/g' <<< $TARGET_TEMPLATE_NAME);

echo "$DOCKERFILE_CONTENT" > "$TEMP_TEMPLATE_DOCKERFILE_DIR/$TARGET_TEMPLATE_NAME_FILESAFE.Dockerfile";

docker build -t "$TARGET_TEMPLATE_NAME" -f "$TEMP_TEMPLATE_DOCKERFILE_DIR/$TARGET_TEMPLATE_NAME_FILESAFE.Dockerfile" .;
