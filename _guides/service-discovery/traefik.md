---
title: Service Discovery with traefik
component: load-balancing
author: Michael Mueller
pubdate: 2015-09-25 00:00:00
---

## Problem

If you have a radpid changing microservice infrastructure and you want to make it available via HTTP you need to have the configuration managed automatically and dynamically.

---

## Overview

**Components:** [Docker](/tech/docker/), [Træfik](/tech/traefik/)
* Docker to run the services.
* Træfɪk will automatically configure it's frontend and backend configuration based on labels assigned to the docker containers. Other ways of configuring Træfɪk are available (Mesos/Marathon, Consul, Etcd, Rest API, file), but aren't covered here.

---

### Pros

- Supports several backends (Docker, Mesos/Marathon, Consul, Etcd, Rest API, file...)
- Automatically and dynamically configuration

---

### Cons
- Pretty young project
- No websocket support
- No TCP support

---

## Implementation steps

This example is based on a single machine running Ubuntu 14.04 with docker. We'll use the CoreOS example web application as backend servers.

---

### 1. Set up base infrastructure

- Install docker on your host.
- Clone github repo https://github.com/EmileVauge/traefik

---

### 2. Set up backend server as docker container

To autoconfigure the LB labels are used on the backend containers. Labels can be used on containers to override default behaviour:

`traefik.backend=foo` assign the application to foo backend
`traefik.port=80` register this port. Useful when the application exposes multiples ports
`traefik.weight=10` assign this weight to the application
`traefik.enable=false` disable this application in Træfɪk
`traefik.host=bar` override the default routing from {appName}.{domain} to bar.{domain}
`traefik.prefixes=pf1,pf2` use PathPrefix(es) instead of hostname for routing, use filename="providerTemplates/marathon-prefix.tmpl" with this option

Run web application __v1__ containers with the needed labels

```bash
docker run -d --label=traefik.backend=foo --label=traefik.host=bar --name example-v1.1 -p 8086:80 coreos/example:1.0.0
docker run -d --label=traefik.backend=foo --label=traefik.host=bar --name example-v1.2 -p 8087:80 coreos/example:1.0.0
```

---

### 3 Set up traefik

Create traefik.toml based on your needs. Example:

```bash
################################################################
# Global configuration
################################################################
port = ":80"

################################################################
# Web configuration backend
################################################################

[web]
address = ":8080"

################################################################
# Docker configuration backend
################################################################

[docker]
endpoint = "unix:///var/run/docker.sock"
domain = "docker.localhost"
watch = true
```
---

#### 3.1 Run traefik as container

```bash
docker run -d -p 8080:8080 -p 80:80 -v $PWD/traefik.toml:/traefik.toml -v /var/run/docker.sock:/var/run/docker.sock emilevauge/traefik
```

---

#### 3.2 Run traefik from binary

Grab latest sources from https://github.com/emilevauge/traefik/releases and run

```bash
./traefik traefik.toml
```

---

To validate if everything is running check the logs of the traefik container and visit the HTML frontend of traefik :8080

![fe](fe.png)

Now you can access the frontend via :80 and should see:

![v1](v1.png)

---

### 4. Performance

As a quick indication and to have a rough idea what's the performance of traefik a qucik apache benchmark has been done. And to make the result compareable, a HAProxy has been installed on the same machine and the benchmark has been done again with the same parameters.

#### 4.1 Traefik as container

```bash
ab -n 100000 -c 100 http://bar.docker.localhost/
This is ApacheBench, Version 2.3 <$Revision: 1663405 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking bar.docker.localhost (be patient)
Completed 10000 requests
Completed 20000 requests
Completed 30000 requests
Completed 40000 requests
Completed 50000 requests
Completed 60000 requests
Completed 70000 requests
Completed 80000 requests
Completed 90000 requests
Completed 100000 requests
Finished 100000 requests


Server Software:        nginx/1.1.19
Server Hostname:        bar.docker.localhost
Server Port:            80

Document Path:          /
Document Length:        68 bytes

Concurrency Level:      100
Time taken for tests:   93.258 seconds
Complete requests:      100000
Failed requests:        0
Total transferred:      23700000 bytes
HTML transferred:       6800000 bytes
Requests per second:    1072.29 [#/sec] (mean)
Time per request:       93.258 [ms] (mean)
Time per request:       0.933 [ms] (mean, across all concurrent requests)
Transfer rate:          248.18 [Kbytes/sec] received

Connection Times (ms)
             min  mean[+/-sd] median   max
Connect:        0    7  14.6      1     320
Processing:     2   87  37.0     90     425
Waiting:        2   86  36.9     89     425
Total:          2   93  35.2     93     455

Percentage of the requests served within a certain time (ms)
 50%     93
 66%     99
 75%    103
 80%    106
 90%    118
 95%    147
 98%    177
 99%    200
100%    455 (longest request)
```

---

#### 4.2 Traefik running from binary

```bash
ab -n 100000 -c 100 http://bar.docker.localhost/
This is ApacheBench, Version 2.3 <$Revision: 1663405 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking bar.docker.localhost (be patient)
Completed 10000 requests
Completed 20000 requests
Completed 30000 requests
Completed 40000 requests
Completed 50000 requests
Completed 60000 requests
Completed 70000 requests
Completed 80000 requests
Completed 90000 requests
Completed 100000 requests
Finished 100000 requests


Server Software:        nginx/1.1.19
Server Hostname:        bar.docker.localhost
Server Port:            80

Document Path:          /
Document Length:        68 bytes

Concurrency Level:      100
Time taken for tests:   90.485 seconds
Complete requests:      100000
Failed requests:        0
Total transferred:      23700000 bytes
HTML transferred:       6800000 bytes
Requests per second:    1105.15 [#/sec] (mean)
Time per request:       90.485 [ms] (mean)
Time per request:       0.905 [ms] (mean, across all concurrent requests)
Transfer rate:          255.78 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0   15  21.9      7    1097
Processing:     2   75  44.4     79     970
Waiting:        2   75  44.3     78     970
Total:          2   90  42.0     91    1188

Percentage of the requests served within a certain time (ms)
  50%     91
  66%     97
  75%    102
  80%    105
  90%    119
  95%    146
  98%    176
  99%    191
 100%   1188 (longest request)
```

---

#### 4.3 HAProxy
```bash
ab -n 100000 -c 100 http://bar.docker.localhost/
This is ApacheBench, Version 2.3 <$Revision: 1663405 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking bar.docker.localhost (be patient)
Completed 10000 requests
Completed 20000 requests
Completed 30000 requests
Completed 40000 requests
Completed 50000 requests
Completed 60000 requests
Completed 70000 requests
Completed 80000 requests
Completed 90000 requests
Completed 100000 requests
Finished 100000 requests


Server Software:        
Server Hostname:        bar.docker.localhost
Server Port:            80

Document Path:          /
Document Length:        108 bytes

Concurrency Level:      100
Time taken for tests:   40.240 seconds
Complete requests:      100000
Failed requests:        0
Non-2xx responses:      100000
Total transferred:      21300000 bytes
HTML transferred:       10800000 bytes
Requests per second:    2485.11 [#/sec] (mean)
Time per request:       40.240 [ms] (mean)
Time per request:       0.402 [ms] (mean, across all concurrent requests)
Transfer rate:          516.92 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0   19  21.5     10     107
Processing:     1   22  23.1     10     107
Waiting:        1   21  23.1     10     107
Total:          1   40  27.7     21     165

Percentage of the requests served within a certain time (ms)
  50%     21
  66%     71
  75%     73
  80%     74
  90%     75
  95%     77
  98%     83
  99%     91
 100%    165 (longest request)
```

---

### 5 Conclusion

The test was running with 100 concurrent requests using apache benchmark and HAproxy and Træfɪk acting as simple loadbalancer between two containers.

|platform|50% requests completed (ms)|95% requests completed (ms)|request per s (mean)|
|---|---|---|---|
|HAproxy|21|72|2485,11|
|Træfɪk binary|91|146|1105,15|
|Træfɪk container|93|147|1072,29|


Træfɪk is an easy to manage loadbalancer. The current state of Træfɪk still has some shortcomings when it comes to TCP loadbalancing, Websocket support and performance, but there exist active discussions (for example [here!](https://github.com/EmileVauge/traefik/issues)) on how to address these issues. It’s worth keeping an eye on.
