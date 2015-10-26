---
title: Service Discovery with Marathon, Mesos-DNS and HAProxy
component: service-discovery
author: Michael Hausenblas
sponsor: Mesosphere Inc.
sponsor_website: http://mesosphere.io
pubdate: 2015-10-24 00:00:00
---
## Problem

You have a bunch of [microservices](/tech/microservice) deployed in your [Mesos](/tech/mesos/) cluster, and want to make them available under service specific URLs via HTTP so they can call each other or be accessed from the outside world.

---

## Overview

**Components:** [Mesos-DNS](/tech/mesos-dns/), [Marathon](/tech/marathon/), [HAProxy](/tech/haproxy/)

* Marathon starts applications as tasks in the Mesos cluster and uses health checks to keep track of their status.
* Mesos-DNS polls Mesos Master for app/task - `IP:PORT` mapping  
* HAProxy configuration is done via [servicerouter.py](https://github.com/mesosphere/marathon/blob/master/bin/servicerouter.py) following the default service discovery [recipe](https://mesosphere.github.io/marathon/docs/service-discovery-load-balancing.html) for Marathon with Mesos-DNS.


---

### Pros

* Allows logical (DNS) names to `IP:PORT` mappings.
* DNS is mature and well understood.
* Allows matching other request characteristics like HTTP headers.
* Offers sticky sessions, HTTP to HTTPS redirection, SSL offloading, VHost support and templating capabilities.
* Battle tested code in HAProxy for the heavy lifting.

---

### Cons

* Depends on cron job.
* Some clients aggressively cache DNS entries (for example Java) which can lead to outdated IP addresses.
* `SRV` records might not be understood in your environment.


---

## Implementation steps

These steps assume you have already a running Mesos cluster with Marathon installed. 

The rest of this guide focusses on Debian/Ubuntu, but can easily be adapted to any other OS.

---

### 1. Install HAProxy and Mesos-DNS

**HAProxy**

HAProxy can usually be installed in a recent enough version via your OS package manager, e.g.

    $ apt-get install haproxy

Version 1.5.x is recommended, which is not the default on e.g. Ubuntu 14.04 LTS.
Check [http://haproxy.debian.net/](http://haproxy.debian.net/) for instructions how to get a recent HAProxy on older Ubuntu and Debian releases.

**Mesos-DNS**

We will do a deployment of Mesos-DNS via Marathon as described in the following. You might want to launch Mesos-DNS outside of Mesos/Marathon and
monitor/re-start out of band, alternatively—see also [Mesos-DNS using systemd](http://mesosphere.github.io/mesos-dns/docs/tutorial-systemd.html).

First create a Mesos-DNS [configuration](http://mesosphere.github.io/mesos-dns/docs/configuration-parameters.html) file and place it, for example, in `/etc/mesos-dns/`:

    $ cat /etc/mesos-dns/config.js
    {
      "zk": "zk://127.0.0.1:2181/mesos",
      "refreshSeconds": 60,
      "ttl": 60,
      "domain": "mesos",
      "port": 53,
      "resolvers": ["10.0.2.3"],
      "timeout": 5,
      "email": "root.mesos-dns.mesos"
    }

Here, I've set it up as primary nameserver, but you can also [re-use an existing Bind server](http://mesosphere.github.io/mesos-dns/docs/tutorial-forward.html) and use Mesos-DNS only for the `.mesos` domain.

The second step for a Marathon-based deployment of Mesos-DNS is to create a Marathon app specification that looks as follows:

```json
{
    "args": [
        "/mesos-dns",
        "-config=/config.json"
    ],
    "container": {
        "docker": {
            "image": "mesosphere/mesos-dns",
            "network": "HOST"
        },
        "type": "DOCKER",
        "volumes": [
            {
                "containerPath": "/config.json",
                "hostPath": "/etc/mesos-dns/config.js",
                "mode": "RO"
            }
        ]
    },
    "cpus": 0.2,
    "id": "mesos-dns",
    "instances": 1,
}
```

Note that in above Marathon app specification it's important to use the same path under the `hostPath` key where you stored the
Mesos-DNS configuration file in the previous step. I've stored this app spec at `~/marathon-mesosdns.json` but it really doesn't matter where 
you put it.

Now you can post it to the Marathon API via curl:

    $ curl -X POST -H "Content-Type: application/json" http://localhost:8080/v2/apps -d@~/marathon-mesosdns.json


---

### 2. Test Mesos-DNS setup

In order to test the setup, we now deploy a simple Python app to Marathon.
For that, we need a Marathon app spec which we call `pyapp.json`:

```json
{
  "id": "peek",
  "cmd": "env >env.txt && python3 -m http.server 8080",
  "cpus": 0.5,
  "mem": 32.0,
  "container": {
    "type": "DOCKER",
    "docker": {
      "image": "python:3",
      "network": "BRIDGE",
      "portMappings": [
        { "containerPort": 8080, "hostPort": 0 }
      ]
    }
  }
}
```

Post it to the Marathon API via curl:

    $ curl -X POST -H "Content-Type: application/json" http://localhost:8080/v2/apps -d@pyapp.json

Check the Marathon UI, and you should now see both Mesos-DNS and the Python app running:

![Marathon](marathon.png)

Test Mesos-DNS via `dig`:

```bash
$ dig _peek._tcp.marathon.mesos SRV
vagrant@mesos:~$ dig _peek._tcp.marathon.mesos SRV

; <<>> DiG 9.9.5-3ubuntu0.5-Ubuntu <<>> _peek._tcp.marathon.mesos SRV
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 57329
;; flags: qr aa rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; QUESTION SECTION:
;_peek._tcp.marathon.mesos.	IN	SRV

;; ANSWER SECTION:
_peek._tcp.marathon.mesos. 60	IN	SRV	0 0 31000 peek-27346-s0.marathon.mesos.

;; ADDITIONAL SECTION:
peek-27346-s0.marathon.mesos. 60 IN	A	10.141.141.10

;; Query time: 4 msec
;; SERVER: 127.0.0.1#53(127.0.0.1)
;; WHEN: Sat Oct 24 23:21:15 UTC 2015
;; MSG SIZE  rcvd: 160
```

This tells us that the app with the Marathon ID `/peek` and the logical FQHN `peek.marathon.mesos`
is running on host `10.141.141.10` and is available via port `31000`.

---

### 3. Use servicerouter to configure HAProxy

To generate an HAProxy configuration from Marathon running at `localhost:8080` with `servicerouter.py` do the following:

```bash
$ wget https://raw.githubusercontent.com/mesosphere/marathon/master/bin/servicerouter.py
$ sudo python servicerouter.py --marathon http://localhost:8080 --haproxy-config /etc/haproxy/haproxy.cfg
servicerouter: fetching apps
servicerouter: GET http://10.141.141.10:8080/v2/apps?embed=apps.tasks
servicerouter: got apps [u'/mesos-dns', u'/peek']
servicerouter: generating config
servicerouter: setting default value for HAPROXY_HEAD
servicerouter: setting default value for HAPROXY_HTTP_FRONTEND_HEAD
servicerouter: setting default value for HAPROXY_HTTP_FRONTEND_APPID_HEAD
servicerouter: setting default value for HAPROXY_HTTPS_FRONTEND_HEAD
servicerouter: setting default value for HAPROXY_FRONTEND_HEAD
servicerouter: setting default value for HAPROXY_BACKEND_REDIRECT_HTTP_TO_HTTPS
servicerouter: setting default value for HAPROXY_BACKEND_HEAD
servicerouter: setting default value for HAPROXY_HTTP_FRONTEND_ACL
servicerouter: setting default value for HAPROXY_HTTP_FRONTEND_APPID_ACL
servicerouter: setting default value for HAPROXY_HTTPS_FRONTEND_ACL
servicerouter: setting default value for HAPROXY_BACKEND_HTTP_OPTIONS
servicerouter: setting default value for HAPROXY_BACKEND_HTTP_HEALTHCHECK_OPTIONS
servicerouter: setting default value for HAPROXY_BACKEND_TCP_HEALTHCHECK_OPTIONS
servicerouter: setting default value for HAPROXY_BACKEND_STICKY_OPTIONS
servicerouter: setting default value for HAPROXY_BACKEND_SERVER_OPTIONS
servicerouter: setting default value for HAPROXY_BACKEND_SERVER_HTTP_HEALTHCHECK_OPTIONS
servicerouter: setting default value for HAPROXY_BACKEND_SERVER_TCP_HEALTHCHECK_OPTIONS
servicerouter: setting default value for HAPROXY_FRONTEND_BACKEND_GLUE
servicerouter: configuring app /mesos-dns
servicerouter: frontend at *:10000 with backend mesos-dns_10000
servicerouter: backend server at 10.141.141.10:31421
servicerouter: trying to resolve ip address for host 10.141.141.10
servicerouter: configuring app /peek
servicerouter: frontend at *:10001 with backend peek_10001
servicerouter: backend server at 10.141.141.10:31000
servicerouter: reading running config from /etc/haproxy/haproxy.cfg
servicerouter: running config is different from generated config - reloading
servicerouter: writing config to temp file /tmp/tmp_32M3e
servicerouter: moving temp file /tmp/tmp_32M3e to /etc/haproxy/haproxy.cfg
servicerouter: trying to find out how to reload the configuration
servicerouter: we seem to be running on a sysvinit based system
servicerouter: reloading using /etc/init.d/haproxy reload
```

This will refresh `haproxy.cfg`, and if there were any changes, then it will automatically reload HAProxy.
In order to keep HAProxy up to date, you can use a cron job that executes the `servicerouter.py`, say, every minute.
