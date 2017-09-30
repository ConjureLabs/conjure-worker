#! /bin/bash

BASE="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";
. $BASE/../vars.cfg;

# see http://stackoverflow.com/questions/407523/escape-a-string-for-a-sed-replace-pattern
TARGET_TEMPLATE_LOCATION=$1;
TARGET_TEMPLATE_NAME=$(sed 's/[\/&]/\\&/g' <<< $2);
FROM_TEMPLATE=$(sed 's/[\/&]/\\&/g' <<< $3);

DOCKERFILE_START="";
DOCKERFILE_MIDDLE="";

# append something like FROM conjure:node-v6
if [ "$FROM_TEMPLATE" != "" ]; then
  DOCKERFILE_START=$(echo -e "FROM $FROM_TEMPLATE");
  DOCKERFILE_MIDDLE="\n\n";
fi

# append rest of dockerfile template chunk
DOCKERFILE_END=$(cat "$GIT_CONTAINER_DIR/templates/$TARGET_TEMPLATE_LOCATION");

TARGET_TEMPLATE_NAME_FILESAFE=$(sed 's/[:\/\.]/_/g' <<< $TARGET_TEMPLATE_NAME);

echo -e "$DOCKERFILE_START$DOCKERFILE_MIDDLE$DOCKERFILE_END" > "$TEMP_TEMPLATE_DOCKERFILE_DIR/$TARGET_TEMPLATE_NAME_FILESAFE.Dockerfile";
echo "$TEMP_TEMPLATE_DOCKERFILE_DIR/$TARGET_TEMPLATE_NAME_FILESAFE.Dockerfile"
docker build -t "$TARGET_TEMPLATE_NAME" -f "$TEMP_TEMPLATE_DOCKERFILE_DIR/$TARGET_TEMPLATE_NAME_FILESAFE.Dockerfile" "$TEMP_TEMPLATE_DOCKERFILE_DIR";
