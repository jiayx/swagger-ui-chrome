#!/bin/sh

cd `dirname $0`
pwd=`pwd`

swagger_path=$pwd/swagger-ui

if [[ -e $swagger_path ]]; then
    cd $swagger_path
    git pull
else
    git clone https://github.com/swagger-api/swagger-ui.git $swagger_path
fi

cp $swagger_path/dist/* $pwd/swagger

cp $pwd/src/index.templet.html $pwd/swagger/index.html
