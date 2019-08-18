 
## 信号服务docker镜像
## Signaling Service docker image

先在服务器上安装docker，然后运行：  
Install docker on your public server, and then run:
```bash
    # 用默认的桥模式映射大量端口会很慢，所以改为host模式
    # Mapping large range of ports confirmed very slow, so just use host mode
    #docker run --restart=always -d -p 57000:57000 -p 3478:3478 -p 49152-65535:49152-65535/udp novice/ss
    # 默认监听的服务端口是: 57000, 及其它的一堆 stun/turn 端口
    # default signaling service port: 57000, with a bunch of stun/turn ports
    docker run --restart=always -d --network="host" --name ss novice/ss
    #  可用环境变量 PORT 改变监听端口，当然其它的stun/turn端口依旧是默认的
    #  use environment variable PORT to change it
    docker run --restart=always -d -e "PORT=57001" --network="host" --name ss novice/ss
    # 停止/删除服务用这个命令：
    # remove the service use: 
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

### 客户端app地址
### Client app
https://play.google.com/store/apps/details?id=freenet.cppsvr

### 这个app能做什么
1. 启动安卓设备上的http服务器，其它客户端可用浏览器上传、下载文件，大小没限制
2. 在线播放音频、视频，安卓设备当媒体服务器。或者当做本地音乐播放器用，可单曲循环、顺序播放，或目录循环
3. 启动socks5代理，并用配套的pac文件，可直接在其它客户端浏览器中设置pac地址，把安卓手机当代理服务器用
4. Webrtc客户端，可与其它玩家视频、语音聊天。这个需通过公网服务器——也就是这个镜像的作用。启动你自己的服务器，然后在客户端中设置服务地址即可 
5. 扫码

### What this app can do?
1. Start a http server on android device for clients using browser upload, download files or . 
2. Streaming audio/video, or as a local music player
3. Start a socks proxy on android device with PAC file for using it. 
4. Webrtc client for video/audio chat using your own server with this image. 
5. Obiter: Qr/Barcode scan