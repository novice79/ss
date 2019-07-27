 Install docker on your public server, and then run this script
 ```bash
    #!/bin/bash
    if [ "$(docker info | grep Swarm | sed 's/Swarm: //g')" == "inactive" ]; then
        docker swarm init
    fi
    docker stack deploy -c stack.yml ss
