FROM novice/build:latest as my_build
WORKDIR /workspace

# for test
# COPY test/sources.list /etc/apt/sources.list
COPY nodejs /workspace/nodejs
RUN cd /workspace/nodejs && npm i && pkg app.js -t node12-linux -o ../app
# for opentracker
# RUN apt-get update && apt-get install -y zlib1g-dev libowfat-dev git
# RUN git clone git://erdgeist.org/opentracker && cd opentracker && make -j4

FROM ubuntu:latest
LABEL maintainer="Novice <novice@piaoyun.shop>"
ENV DEBIAN_FRONTEND noninteractive

# for test
# COPY test/sources.list /etc/apt/sources.list

RUN apt-get update && apt-get install -y coturn curl
COPY --from=my_build /workspace/app /app
# COPY --from=my_build /workspace/opentracker/opentracker /opentracker
# COPY --from=my_build /usr/lib/libowfat.so.0 /usr/lib/libowfat.so.0

COPY turnserver.conf /etc/turnserver.conf
EXPOSE 57000 3478 3478/udp

COPY init.sh /
ENTRYPOINT ["/init.sh"]
