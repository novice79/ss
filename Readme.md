 
## 资源库webrtc signaling server docker镜像
## Resource signaling Service docker image

先在服务器上安装docker，然后运行：  
Install docker on your public server, and then run:
```bash
    # 用默认的桥模式映射大量端口会很慢，所以改为host模式
    # Mapping large range of ports confirmed very slow, so just use host mode
    #docker run --restart=always -d -p 57000:57000 -p 3478:3478 -p 49152-65535:49152-65535/udp novice/ss
    # 默认监听的服务端口是: 57000, 及其它的一堆 stun/turn 端口
    # default signaling service port: 57000, with a bunch of stun/turn ports
    docker run --restart=always -d --network="host" --name ss novice/ss
    #  可用环境变量 PORT 改变监听端口，和turnserver的用户名、密码，其它的stun/turn端口依旧是默认的
    #  Can use environment variable: PORT, TURN_USER, TURN_PASS to change listening port and turnserver account if you want
    docker run --restart=always -d -e "PORT=57001" -e "TURN_USER=myturn" -e "TURN_PASS=mypasswd" --network="host" --name ss novice/ss
    # 停止/删除服务用这个命令：
    # remove the service like this: 
    docker rm -f ss
```   
如果你想用docker集群模式运行，可用下面的脚本（前提是已克隆stack.yml到本地）  
Or run it as a swarm service
```bash
    #!/bin/bash
    if [ "$(docker info | grep Swarm | sed 's/Swarm: //g')" == "inactive" ]; then
        docker swarm init
    fi
    docker stack deploy -c stack.yml ss
```
### 关于服务打开的端口
这个镜像包含了coturn服务，所以需要打开3478 TCP端口和其它一些rfc中定义的默认udp端口。信号服务默认用57000端口，可用环境变量改变之
### About the opened ports
This image contain coturn service, so it need 3478/tcp and those udp ports opened for exchanging media. 57000/tcp is for websocket signaling service.

