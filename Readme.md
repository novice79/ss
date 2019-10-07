 
## 安卓“资源库”app signaling server docker镜像

### 如何使用
1. 先在您的公网服务器上安装docker，然后运行：  

```bash
    # 用默认的桥模式映射大量端口会很慢，所以改为host模式
    #docker run --restart=always -d -p 57000:57000 -p 3478:3478 -p 49152-65535:49152-65535/udp novice/ss
    # 默认监听的服务端口是: 57000, 及其它的一堆 stun/turn 端口
    docker run --restart=always -d --network="host" --name ss novice/ss
    # 或： 可用环境变量 PORT 改变监听端口，和turnserver的用户名、密码，其它的stun/turn端口依旧是默认的
    docker run --restart=always -d -e "PORT=57001" -e "TURN_USER=myturn" -e "TURN_PASS=mypasswd" --network="host" --name ss novice/ss
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

### 关于服务打开的端口
这个镜像包含了coturn服务，所以需要打开3478 TCP端口和其它一些rfc中定义的默认udp端口。信号服务默认用57000端口，可用环境变量改变之


