---
title: Load Balancing with etcd and vulcand
component: load-balancing
author: Michael Mueller
pubdate: 2015-09-23 00:00:00
---

## Problem

If you want to horizontal scale your HTTP service, vulcanproxy as a loadbalancer with additional features like authentication, ciruit breaker and rate limiting will be an option.

---

## Overview

**Components:** [CoreOS](/tech/coreos/), [etcd](/tech/etcd/), [vulcand](/tech/vulcand/)

* CoreOS is a minimal Linux OS optimized to run containers
* [etcd](/tech/etcd/) is a clustered key value store used to store the configuration of vulcand
* vulcand is a progammable loadbalancer developed by [mailgun.com](https://www.mailgun.com/), an email service for devs


---

### Pros

- Interacts directly with etcd
- Configuration is distributed across all etcd servers
- Changes don't need a restart
- No config files needed

---

### Cons

- Still beta
- "Status: Under active development. Used at Mailgun on moderate workloads."

---

## How Vulcand works

Vulcand consists of three parts, frontends, backends and middlewares. The frontend is a URI path which can be matched using RegEx. This location is matched up with an backend, which is a set of servers to serve the request.
If the request matches a frontend, the traffic get routed to defined backend. Middlewares sit between frontend and backend and are able to change, intercept or reject requests.

---

### Frontends

[vulcand/frontends](https://docs.vulcand.io/proxy.html#frontends)

A frontend defines how requests should be routed to backends. An example route definition will look like `Path("/foo/bar")`, which will match the given path for all hosts. If you like to match only to a given Host the expression will look like `Host("example.com") && Path ("/foo/bar")`

```bash
$ etcdctl set /vulcand/frontends/example/frontend '{"Type": "http", "BackendId": "v1", "Route": "Host(`example.com`) && Path(`/`)"}'
```

#### Settings

In the frontend different controls are available

```json
{
  "Limits": {
    "MaxMemBodyBytes":<VALUE>, // Maximum request body size to keep in memory before buffering to disk
    "MaxBodyBytes":<VALUE>, // Maximum request body size to allow for this frontend
  },
  "FailoverPredicate":"IsNetworkError() && Attempts() <= 1", // Predicate that defines when requests are allowed to failover
  "Hostname": "host1", // Host to set in forwarding headers
  "TrustForwardHeader":<true|false>, // Time provider (useful for testing purposes)
}
```

---

### Backends

[vulcand/backends](https://docs.vulcand.io/proxy.html#backends-and-servers)

Vulcand load-balances requests within the backend and keeps the connections open to every server in the pool. Frontends using the same backend will share the connections. Changes to the backend configuration can be done at any time and will triger a graceful reload of the settings.

```json
{
  "Timeouts": {
     "Read":"1s", // Socket read timeout (before we receive the first reply header)
     "Dial":"2s", // Socket connect timeout
     "TLSHandshake": "3s", // TLS handshake timeout
  },
  "KeepAlive": {
     "Period":"4s", // Keepalive period for idle connections
     "MaxIdleConnsPerHost":3, // How many idle connections will be kept per host
  }
}

```

---

## Implementation steps

This example is based on the coreos/example [coreos.com/blog/zero-downtime-frontend-deploys-vulcand/](https://coreos.com/blog/zero-downtime-frontend-deploys-vulcand/) running on a 3 node coreos-cluster deployed via Vagrant.

Example `Vagrantfile`, `user-data` and `config.rb` can be found here:
[https://github.com/muemich/coreos-vagrant-vulcand](https://github.com/muemich/coreos-vagrant-vulcand)

---

### 1. Set up base infrastructure

Add `172.17.8.101 example.com` to `/etc/hosts` on your host machine,


Launch one or many CoreOS machines and log in. For this example one is enough.

```bash
$ vagrant up
$ vagrant ssh core-01 -- -A
```
---

### 2. Ensure etcd and vulcand are running

```bash
core@core-01 ~ $ systemctl status etcd2
● etcd2.service - etcd2
   Loaded: loaded (/usr/lib64/systemd/system/etcd2.service; disabled; vendor preset: disabled)
  Drop-In: /run/systemd/system/etcd2.service.d
           └─20-cloudinit.conf
   Active: active (running) since Tue 2015-09-22 15:00:57 UTC; 54min ago
 Main PID: 967 (etcd2)
   Memory: 38.2M
      CPU: 34.202s
   CGroup: /system.slice/etcd2.service
           └─967 /usr/bin/etcd2

Sep 22 15:01:43 core-01 etcd2[967]: 2015/09/22 15:01:43 raft: aeb20866b279648e received vote from aeb20866b279648e at term 2
Sep 22 15:01:43 core-01 etcd2[967]: 2015/09/22 15:01:43 raft: aeb20866b279648e [logterm: 1, index: 3] sent vote request to 56da6d1265bdc9ed at term 2
Sep 22 15:01:43 core-01 etcd2[967]: 2015/09/22 15:01:43 raft: aeb20866b279648e [logterm: 1, index: 3] sent vote request to eefc97cb642769af at term 2
Sep 22 15:01:43 core-01 etcd2[967]: 2015/09/22 15:01:43 raft: aeb20866b279648e received vote from 56da6d1265bdc9ed at term 2
Sep 22 15:01:43 core-01 etcd2[967]: 2015/09/22 15:01:43 raft: aeb20866b279648e [q:2] has received 2 votes and 0 vote rejections
Sep 22 15:01:43 core-01 etcd2[967]: 2015/09/22 15:01:43 raft: aeb20866b279648e became leader at term 2
Sep 22 15:01:43 core-01 etcd2[967]: 2015/09/22 15:01:43 raft: raft.node: aeb20866b279648e elected leader aeb20866b279648e at term 2
Sep 22 15:01:43 core-01 etcd2[967]: 2015/09/22 15:01:43 etcdserver: setting up the initial cluster version to 2.1.0
Sep 22 15:01:43 core-01 etcd2[967]: 2015/09/22 15:01:43 etcdserver: published {Name:d7251d6864f0497294358cf18f811017 ClientURLs:[http://172.17.8.101:2379]} to cluster eba7d2dbe11be795
Sep 22 15:01:43 core-01 etcd2[967]: 2015/09/22 15:01:43 etcdserver: set the initial cluster version to 2.1.0
```

```bash
systemctl status vulcand
● vulcand.service - Vulcand
   Loaded: loaded (/etc/systemd/system/vulcand.service; enabled; vendor preset: disabled)
   Active: active (running) since Tue 2015-09-22 15:02:49 UTC; 53min ago
  Process: 1070 ExecStartPre=/usr/bin/docker pull mailgun/vulcand:v0.8.0-beta.3 (code=exited, status=0/SUCCESS)
  Process: 1063 ExecStartPre=/usr/bin/docker rm vulcand (code=exited, status=1/FAILURE)
  Process: 979 ExecStartPre=/usr/bin/docker kill vulcand (code=exited, status=1/FAILURE)
 Main PID: 1331 (docker)
   Memory: 12.5M
      CPU: 123ms
   CGroup: /system.slice/vulcand.service
           └─1331 /usr/bin/docker run --name vulcand -p 80:80 -p 443:443 -p 8182:8182 -p 8181:8181 mailgun/vulcand:v0.8.0-beta.2 /go/bin/vulcand -apiInterface=0.0.0.0 -interface=0.0.0.0 -etcd=http://<IP:4001>

Sep 22 15:03:00 core-01 docker[1331]: 5c5ef0bea32a: Download complete
Sep 22 15:03:00 core-01 docker[1331]: 6c24554e26e5: Pulling metadata
Sep 22 15:03:01 core-01 docker[1331]: 6c24554e26e5: Pulling fs layer
Sep 22 15:03:02 core-01 docker[1331]: 6c24554e26e5: Download complete
Sep 22 15:03:02 core-01 docker[1331]: e7e8f43c66ae: Pulling metadata
Sep 22 15:03:03 core-01 docker[1331]: e7e8f43c66ae: Pulling fs layer
Sep 22 15:03:05 core-01 docker[1331]: e7e8f43c66ae: Download complete
Sep 22 15:03:05 core-01 docker[1331]: e7e8f43c66ae: Download complete
Sep 22 15:03:05 core-01 docker[1331]: Status: Downloaded newer image for mailgun/vulcand:v0.8.0-beta.2
Sep 22 15:03:05 core-01 docker[1331]: Sep 22 15:03:05.587: WARN PID:1 [supervisor.go:349] No frontends found
```

As there are no frontends deployed yet, the warning can be ignored.

---

### 3. Deploy test backend containers

Run web application __v1__ containers,

```bash
$ docker run -d --name example-v1.1 -p 8086:80 coreos/example:1.0.0
$ docker run -d --name example-v1.2 -p 8087:80 coreos/example:1.0.0
```

Configure Vulcand to proxy to __v1__ container,

---

### 4. Register backend containers

```bash
$ etcdctl set /vulcand/backends/v1/backend '{"Type": "http"}'
$ etcdctl set /vulcand/backends/v1/servers/v1.1 '{"URL": "http://172.17.8.101:8086"}'
$ etcdctl set /vulcand/backends/v1/servers/v1.2 '{"URL": "http://172.17.8.101:8087"}'
```

*To proxy to v1 containers:*

```
$ etcdctl set /vulcand/frontends/example/frontend '{"Type": "http", "BackendId": "v1", "Route": "Host(`example.com`) && Path(`/`)"}'
```

Then access to `example.com` and you can see the current version _1.0.0_ .

![example_com](https://cloud.githubusercontent.com/assets/680124/9721329/a21893b0-55d3-11e5-88de-1b0c45394076.png)

---

### 5. Setup middlewares

> With middlewares you can change, intercept or reject request. Middlewares are allowed to observe, modify and intercept http requests and responses. Each middleware is fully compatible with Go standard library http.Handler

There is the possibility to build middleware-chains, which means that each middleware handler will be exectued in a defined order. Like this it's possible to build an auth handler in front of an rate-limit handler.

For getting this example to work, I used my MacBook where the above example is running in a Vagrant/Virtualbox environment. The requirements are a working [golang](https://golang.org/) installation.
In this example the [vulcand-auth](http://github.com/mailgun/vulcand-auth) middleware of mailgun is used. It uses basic auth, which requires all requests to be authenticated. Details of all the component can be found [here](http://www.vulcanproxy.com/middlewares.html#example-auth-middleware)

* Install the `vctl` and `vbundle` cli-tools

```bash
$ go get github.com/mailgun/vulcand/vctl
$ go get github.com/mailgun/vulcand/vbundle
```

* Create a folder in the `$GOPATH` and clone the github repo

```bash
mkdir $GOPATH/src/github.com/mailgun && cd $GOPATH/src/github.com/mailgun && git clone http://github.com/mailgun/vulcand-auth
```

* Create a folder in your `GOPATH` environment that will be used for your version of Vulcand with the new middleware.

```bash
mkdir $GOPATH/src/github.com/mailgun/vulcand-bundle
```

* Access the newly created folder

```bash
cd $GOPATH/src/github.com/mailgun/vulcand-bundle
```

* Execute the `vbundle` command

```bash
vbundle init --middleware=github.com/mailgun/vulcand-auth/auth
```
the --middleware flag tells the tool the location of the auth middleware into bundle

* Check if there are new files/folders `main.go`, `registry` and `vctl`. If this is the case everything went well and `vbundle` wrote a new `main.go` and `vctl` which includes the auth middleware.
* Now the bundle needs to be installed.

```bash
$ go build -o vulcand
$ pushd vctl/ && go build -o vctl && popd
```

* Start vulcand with `./vulcand -etcd http://<IP_ETCD>:4001`

Connect to one of the coreos machine `$ vagrant ssh core-01 -- -A` and set the needed key that the above example is using the auth middleware

```bash
$ etcdctl set /vulcand/frontends/example/middlewares/auth1 '{"Type": "auth", "Middleware":{"Username": "user", "Password": "secret1"}}'
```

To validate if everything is running you can `curl` from your local machine

```bash
curl -i http://example.com:8181
HTTP/1.1 403 Forbidden
Date: Tue, 06 Oct 2015 11:21:33 GMT
Content-Length: 0
Content-Type: text/plain; charset=utf-8
```

The response will be a 403 forbidden

```bash
curl -u user:secret1 -i http://example.com:8181
HTTP/1.1 200 OK
Connection: keep-alive
Content-Length: 68
Content-Type: text/html
Date: Tue, 06 Oct 2015 11:22:24 GMT
Last-Modified: Thu, 01 May 2014 04:06:46 GMT
Server: nginx/1.1.19

<html>
<body style="background:red">
<h1>1.0.0</h1>
</body>
</html>
```

With basic auth the response will be a 200 OK

---

### Future work
Create  a container of the newly created vulcand including the auth middleware.

To make the registration process of new backends automatic, entries for each backend need to be created in etcd. This can be accomplished by a script that runs after a new backend is started, or by hooking into lifecycle events of [schedulers](/components/scheduling).
