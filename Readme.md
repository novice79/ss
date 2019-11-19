 
## 安卓“资源库”app signaling server docker镜像

### 如何使用
1. 先在公网服务器上（不需域名）安装docker，然后运行：  

```bash
    # 用默认的桥模式映射大量端口会很慢，所以改为host模式
    #docker run --restart=always -d -p 57000:57000 -p 3478:3478 -p 49152-65535:49152-65535/udp novice/ss
    # 默认的signaling端口是: 57000; stun/turn端口: 3478; opentracker端口: 2018
    docker run --restart=always -d --network="host" --name ss novice/ss
    # 除了stun/turn端口，其它服务端口和turnserver的用户名、密码，均可用环境变量更改，例如：
    docker run --restart=always -d \
    -e "PORT=57000" -e "TRACKER_PORT=2018" \
    -e "TURN_USER=myturn" -e "TURN_PASS=mypasswd" \
    --network="host" --name ss novice/ss
    # 停止/删除服务用这个命令：
    docker rm -f ss
```   
>如果你想用docker集群模式运行，可用下面的脚本（假设stack.yml文件在当前目录）  
```bash
    #!/bin/bash
    if [ "$(docker info | grep Swarm | sed 's/Swarm: //g')" == "inactive" ]; then
        docker swarm init
    fi
    docker stack deploy -c stack.yml ss
```
2. 然后在安卓app中配置该服务地址: ***您的服务器ip:端口***
> 注意：端口默认是57000，如果您启动时用环境变量改了端口号，客户端配置地址需相应修改

### 包含了哪些服务
1. coturn服务（用于webrtc节点查找自身外网ip）
2. opentracker（用于bt下载——暂时未用到）
3. nodejs写的signaling服务（用于webrtc节点间建立连接）

