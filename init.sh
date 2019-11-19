#!/bin/bash
log () {
    printf "[%(%Y-%m-%d %T)T] %s\n" -1 "$*"
}
EXTERNAL_IP="$(curl -4 https://icanhazip.com 2>/dev/null)"
log "EXTERNAL_IP=$EXTERNAL_IP"
log "TURN_USER=${TURN_USER:=piaoyun}"
log "TURN_PASS=${TURN_PASS:=freego}"
sed -i "s/TURN_ACCOUNT_HERE/user=$TURN_USER:$TURN_PASS/" /etc/turnserver.conf
turnserver --log-file=stdout --external-ip=$EXTERNAL_IP &
export TURN_USER TURN_PASS
log "TRACKER_PORT=${TRACKER_PORT:=2018}"
export TRACKER_PORT
/opentracker -p $TRACKER_PORT -P $TRACKER_PORT &
/app
