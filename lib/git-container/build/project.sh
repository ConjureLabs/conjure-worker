#! /bin/bash

BASE="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";
. $BASE/../vars.cfg;

# see http://stackoverflow.com/questions/407523/escape-a-string-for-a-sed-replace-pattern
TARGET_TEMPLATE=$(sed 's/[\/&]/\\&/g' <<< $1);
TARGET_REPO=$(sed 's/[\/&]/\\&/g' <<< $2); # -e?
TARGET_BRANCH=$(sed 's/[\/&]/\\&/g' <<< $3);
CONTAINER_UID=$(sed 's/[\/&]/\\&/g' <<< $4);
CONTAINER_NAME=$5;
AWS_ECR_URL=$6;
TARGET_PRE_SETUP=$(sed 's/[\/&]/\\&/g' <<< $7);
TARGET_SETUP=$(sed 's/[\/&]/\\&/g' <<< $8);
CACHEBUST=$(date +%s);

DOCKERFILE_CONTENT=$(cat "$GIT_CONTAINER_DIR/template.Dockerfile");
DOCKERFILE_CONTENT=$(sed "s/<TEMPLATE>/$TARGET_TEMPLATE/g" <<< "$DOCKERFILE_CONTENT");
DOCKERFILE_CONTENT=$(sed "s/<REPO>/$TARGET_REPO/g" <<< "$DOCKERFILE_CONTENT");
DOCKERFILE_CONTENT=$(sed "s/<BRANCH>/$TARGET_BRANCH/g" <<< "$DOCKERFILE_CONTENT");
DOCKERFILE_CONTENT=$(sed "s/<CACHEBUST>/$CACHEBUST/g" <<< "$DOCKERFILE_CONTENT");

echo "$TARGET_PRE_SETUP";

if [ "$TARGET_PRE_SETUP" != "" ]; then
  TARGET_PRE_SETUP=$(echo $TARGET_PRE_SETUP | base64 --decode);
  DOCKERFILE_CONTENT+=$(echo -e "\n$TARGET_PRE_SETUP\n");
fi
DOCKERFILE_CONTENT+=$(echo -e "\nRUN $TARGET_SETUP");

echo "$DOCKERFILE_CONTENT" > "$TEMP_PROJECT_DOCKERFILE_DIR/$CONTAINER_UID.Dockerfile";
echo "$TEMP_PROJECT_DOCKERFILE_DIR/$CONTAINER_UID.Dockerfile";

eval $(aws ecr get-login | sed 's|https://||')

docker build -t "$AWS_ECR_URL$CONTAINER_NAME:latest" -f "$TEMP_PROJECT_DOCKERFILE_DIR/$CONTAINER_UID.Dockerfile" "$TEMP_PROJECT_DOCKERFILE_DIR";

echo "$AWS_ECR_URL$CONTAINER_NAME:latest";
docker push "$AWS_ECR_URL$CONTAINER_NAME:latest";
