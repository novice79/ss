 ## Signaling Service docker image
 
 Install docker on your public server, and then run
 ```bash
    docker run --restart=always -d -p 57000:57000 -p 3478:3478 -p 49152-65535:49152-65535/udp novice/ss
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

### Client app
https://play.google.com/store/apps/details?id=freenet.cppsvr

### What this app can do?
1. Start a http server on android device for clients using browser upload, download files or streaming media. [done]
2. Start a socks proxy on android device with PAC file for using it. [done]
3. Webrtc client for video/audio chat using your own server with this image. [todo]
4. Obiter: Qr/Barcode scan