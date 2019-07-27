FROM novice/build:latest as my_build
WORKDIR /workspace

COPY nodejs /workspace/nodejs
RUN cd /workspace/nodejs && npm i && pkg app.js -t node10-linux -o ../app

FROM ubuntu:latest
LABEL maintainer="Novice <novice@piaoyun.shop>"
ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && apt-get install -y coturn curl
COPY --from=my_build /workspace/app /app
COPY turnserver.conf /etc/turnserver.conf
EXPOSE 57000 3478 3478/udp

COPY init.sh /
ENTRYPOINT ["/init.sh"]
