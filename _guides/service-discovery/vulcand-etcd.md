---
title: Service Discovery with etcd and vulcand
component: service-discovery
author: Michael Mueller
sponsor: Swisscom AG
sponsor_website: http://www.swisscom.ch
pubdate: 2015-09-23 00:00:00
---

#### Problem

If you have a couple of microservices distribured across your coreos cluster, and want to make them accessible via HTTP so they can call each other or be accessed from the outside world. You need a mechanism which can reconfigure itself.

#### Components

* [CoreOS](/tech/coreos/)
* [etcd](/tech/etcd/)
* [vulcand](/tech/vulcand/)

#### Overview

Marathon schedules services as tasks in the Mesos cluster and uses healthchecks to keep track of the
tasks status. Bamboo listens to Marathon events for task changes and updates the HAProxy configuration
accordingly. HAProxy ACL rules are configured via Bamboo and can be used to match request characteristics,
like URL patterns, host names or HTTP headers to services that should handle the request.


# coreos-vulcand-example

Vulcand version: `v0.8.0-beta.2`

### TEST ENVIRONMENT

This example is based on the coreos/example https://coreos.com/blog/zero-downtime-frontend-deploys-vulcand/ running on a 3 node coreos-cluster deployed via Vagrant.

Example Vagrantfile, user-data and config.rb can be found here:
https://github.com/muemich/coreos-vagrant-vulcand

### Set up

Add `172.17.8.101 example.com` to `/etc/hosts` on your host machine,


Launch CoreOS VMs and log in,

```bash
$ vagrant up
$ vagrant ssh core-01 -- -A
```

### Ensure etcd and vulcand is running
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
           └─1331 /usr/bin/docker run --name vulcand -p 80:80 -p 443:443 -p 8182:8182 -p 8181:8181 mailgun/vulcand:v0.8.0-beta.2 /go/bin/vulcand -apiInterface=0.0.0.0 -interface=0.0.0.0 -etcd=http://...

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


### Deploy v1 containers

Run web application __v1__ containers,

```bash
$ docker run -d --name example-v1.1 -p 8086:80 coreos/example:1.0.0
$ docker run -d --name example-v1.2 -p 8087:80 coreos/example:1.0.0
```

Configure Vulcand to proxy to __v1__ container,

```bash
# Register v1 containers
$ etcdctl set /vulcand/backends/v1/backend '{"Type": "http"}'
$ etcdctl set /vulcand/backends/v1/servers/v1.1 '{"URL": "http://172.17.8.101:8086"}'
$ etcdctl set /vulcand/backends/v1/servers/v1.2 '{"URL": "http://172.17.8.101:8087"}'

# To proxy to v1 containers
$ etcdctl set /vulcand/frontends/example/frontend '{"Type": "http", "BackendId": "v1", "Route": "Host(`example.com`) && Path(`/`)"}'
```

Then access to `example.com` and you can see the current version _1.0.0_ .

![example_com](https://cloud.githubusercontent.com/assets/680124/9721329/a21893b0-55d3-11e5-88de-1b0c45394076.png)

### Deploy v2 containers

OK, let's deploy the new version __v2__.

Run web application __v2__ containers,

```bash
$ docker run -d --name example-v2.1 -p 8088:80 coreos/example:2.0.0
$ docker run -d --name example-v2.2 -p 8089:80 coreos/example:2.0.0
```

Configure Vulcand to proxy to __v2__ container,

```bash
# Register v2 containers
$ etcdctl set /vulcand/backends/v2/backend '{"Type": "http"}'
$ etcdctl set /vulcand/backends/v2/servers/v2.1 '{"URL": "http://172.17.8.101:8088"}'
$ etcdctl set /vulcand/backends/v2/servers/v2.2 '{"URL": "http://172.17.8.101:8089"}'

# To proxy to v2 containers
$ etcdctl set /vulcand/frontends/example/frontend '{"Type": "http", "BackendId": "v2", "Route": "Host(`example.com`) && Path(`/`)"}'
```

Then access to `example.com` and you can see the current version _2.0.0_ .

![example_com](https://cloud.githubusercontent.com/assets/680124/9721333/aeb836e8-55d3-11e5-9ecf-1eb707fcd81b.png)

### Hints
If you're sitting behind a proxy you have to run an own discovery endpoint behind the proxy or if possible try to bypass the proxy. On a local machine mobile tethering will do the trick.

### pros and cons of using vulcand
Pros:
- Interacts directly with etcd
- Changes don't need a restart
- No config files needed

Cons:
- Still beta
- No heavy development visible

### When to use
In test environment with moderate load.

### Future work
High availability needs to be tested but could be achieved with multiple vulcand containers behind a cloud load balancer.
