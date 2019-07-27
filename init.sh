#!/bin/bash
log () {
    printf "[%(%Y-%m-%d %T)T] %s\n" -1 "$*"
}
EXTERNAL_IP="$(curl -4 https://icanhazip.com 2>/dev/null)"
log "EXTERNAL_IP=$EXTERNAL_IP"
turnserver --log-file=stdout --external-ip=$EXTERNAL_IP &

/app
