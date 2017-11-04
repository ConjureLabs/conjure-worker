#! /bin/bash

BASE="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";
. $BASE/../functions.cfg;

set -e;

eslint ./**/*.js --quiet;
jscs ./**/*.js;

progress "Lint passed";
