#!/bin/bash

# USAGE:
# CORE_URL=<url to core> CORE_ADMIN_USER=<name> CORE_ADMIN_PWD=<password> initDrone.sh

NAME=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 16 | head -n 1)
APIKEY=$(node util/createDroneUser.js DRONE_NAME=$NAME | grep "Your API key is" -A 1 | grep -v "Your API key is")
echo "APIKEY IS: $APIKEY"
CORE_API_TOKEN=$APIKEY DRONE_NAME=$NAME npm start
