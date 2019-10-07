
## Resource android app signaling Service docker image

Install docker on your public server, and then run:
```bash

    # Mapping large range of ports confirmed very slow, so just use host mode
    #docker run --restart=always -d -p 57000:57000 -p 3478:3478 -p 49152-65535:49152-65535/udp novice/ss

    # default signaling service port: 57000, with a bunch of stun/turn ports
    docker run --restart=always -d --network="host" --name ss novice/ss

    #  Can use environment variable: PORT, TURN_USER, TURN_PASS to change listening port and turnserver account if you want
    docker run --restart=always -d -e "PORT=57001" -e "TURN_USER=myturn" -e "TURN_PASS=mypasswd" --network="host" --name ss novice/ss

    # remove the service like this: 
    docker rm -f ss
```   

Or run it as a swarm service
```bash
    #!/bin/bash
    if [ "$(docker info | grep Swarm | sed 's/Swarm: //g')" == "inactive" ]; then
        docker swarm init
    fi
    docker stack deploy -c stack.yml ss
```

### About the opened ports
This image contain coturn service, so it need 3478/tcp and those udp ports opened for exchanging media. 57000/tcp is for websocket signaling service.

