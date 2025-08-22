#!/bin/bash

if [[ "$(uname)" == "Linux" ]]; then
    BIN_PATH="$HOME/.luarocks/bin"
else
    BIN_PATH="/opt/homebrew/bin"
fi
# Recreate build directories
rm -rf ./build
rm -rf ./build-lua

# GENERATE LUA in /build-lua
mkdir -p ./build
mkdir -p ./build-lua

# build teal
cyan build -u

cd build-lua

amalg.lua -s yield/main.lua -o ../build/yield.lua \
    utils.utils.dbAdmin \
    utils.globals \ 
   

# FINAL RESULT is build/main.lua