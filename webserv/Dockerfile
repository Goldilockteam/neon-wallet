
FROM ubuntu:bionic

ENV DEBIAN_FRONTEND noninteractive

RUN \
  apt-get update && \
  apt install -y \
    git openjdk-8-jdk \
    pbzip2 unzip gawk curl wget \
    build-essential autoconf autotools-dev libssl-dev \
    iputils-ping locales \
    libudev-dev libusb-1.0-0-dev tzdata

RUN echo "en_US.UTF-8 UTF-8" > /etc/locale.gen && locale-gen
ENV LANG en_US.utf8

RUN echo "Europe/Athens" > /etc/timezone && \
  rm -f /etc/localtime && \
  dpkg-reconfigure -f noninteractive tzdata

RUN \
  wget -O - https://deb.nodesource.com/setup_10.x | bash && \
  apt install -y nodejs && \
  npm install -g yarn coffeescript

WORKDIR /root
