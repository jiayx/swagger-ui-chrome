#!/usr/bin/env bash

pwd=`pwd`

dir=`dirname $0`

$dir/fetch_assets.sh

echo "=== 清理多余文件 ==="

rm -f $pwd/swagger-ui/*.map
rm -f $pwd/swagger-ui/swagger-ui-es-bundle*
rm -f $pwd/swagger-ui/swagger-ui.js

echo "=== 复制 swagger-initializer.js 文件 ==="
cp src/swagger-initializer.js $pwd/swagger-ui/swagger-initializer.js

echo "=== 更新完成 ==="
