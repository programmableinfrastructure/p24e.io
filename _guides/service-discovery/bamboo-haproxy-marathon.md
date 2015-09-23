---
title: Service Discovery with Marathon, Bamboo and HAProxy
component: service-discovery
author: Max Schöfmann
sponsor: HolidayCheck
sponsor_website: http://www.holidaycheck.de
pubdate: 2015-09-16 00:00:00
---
## Problem

You have a bunch of [microservices](/tech/microservice) deployed in your
[Mesos](/tech/mesos/) cluster, and want to make them available under service
specific URLs via HTTP so they can call each other or be accessed from the
outside world.

---

## Overview

**Components:** [Bamboo](/tech/bamboo/), [Marathon](/tech/Marathon/), [HAProxy](/tech/haproxy/), [Zookeeper](/tech/zookeeper/)

* Marathon starts Applications (services) as tasks in the Mesos cluster and uses
  healthchecks to keep track of their status
* Bamboo listens to Marathon events for Application changes and updates the HAProxy
  configuration when instances become available or unavailable
* HAProxy ACL rules are configured via Bamboo and can be used to match request
  characteristics, like URL patterns, host names or HTTP headers, to Applications
  that should handle the request

<p class="text-center"><img src="overview.svg" alt="Overview"></p>

---

### Pros

* Allows mapping arbitrary URLs to services
* Allows matching other request characteristics like HTTP headers
* Immediate reconfiguration by leveraging Marathon events (no cronjob)
* Battle tested code in HAProxy for the heavy lifting

---

### Cons

* Does not leverage HAProxy stats socket to minimise reloads; HAProxy reload forks
  new process, which can be problematic with high number of task status changes
* Not well suited to handle non-HTTP traffic
* All internal traffic goes through an additional hop (HAProxy)
* Even for internal traffic, a redundant HAProxy setup with failover is required
  unless a [SmartStack](/tech/synapse/) style architecture is implemented
  <small>(i.e. all internal calls made against localhost with every docker host
  running a local HAProxy and Bamboo)</small>

---

## Implementation steps

These steps assume you have already a running Mesos cluster with Marathon installed.
If you haven't, Mesosphere provides packages of both for all major Linux distributions:
[https://mesosphere.com/downloads/](https://mesosphere.com/downloads/)

The rest of this guide focusses on Debian/Ubuntu, but can easily be adapted
to any other OS.

---

### 1. Install HAProxy and Bamboo

**HAProxy**

HAProxy can usually be installed in a recent enough version via your OS package manager, e.g.

    apt-get install haproxy

Version 1.5.x is recommended, which is not the default on e.g. Ubuntu 14.04 LTS.
Check [http://haproxy.debian.net/](http://haproxy.debian.net/) for instructions how to
get a recent HAProxy on older Ubuntu and Debian releases.

**Bamboo**

You can build a `.deb` or `.rpm` package with the provided [build script](https://github.com/QubitProducts/bamboo/blob/master/builder/build.sh).
For building a Debian/Ubuntu package, there's an easier route by using the
[build container](https://github.com/QubitProducts/bamboo/blob/master/Docker-deb)
<small>(which is currently broken, [github.com/QubitProducts/bamboo/pull/166](https://github.com/QubitProducts/bamboo/pull/166) fixes it)</small>. The package will also automatically create an upstart job, so
this is the easiest route to an production worthy setup:

    docker build -f Dockerfile-deb -t bamboo-build .
    docker run -it -v $(pwd)/output:/output bamboo-build
    # package ends up as output/bamboo_1.0.0-1_all.deb

If you don't have a internal package repository in your environment, you can
distribute the `.deb` file manually to the machine and use `dpkg -i` to install it.

You need to edit `/var/bamboo/production.json` and adjust the host names
to **Marathon**, **HAProxy** and **Zookeeper**. Then restart bamboo via
`restart bamboo-server`.

Bamboo can also be deployed as Docker container together with HAProxy.
The [Bamboo readme](https://github.com/QubitProducts/bamboo#deployment)
contains detailed deployment instructions.

---

### 2. Deploy an Application to Marathon

We'll deploy the nodejs based [Ghost](https://ghost.org/) blogging engine to
Marathon for testing. For that, we need a Marathon deployment file, let's call
it `ghost.json`:

    {
      "id": "ghost-0",
      "container": {
        "type": "DOCKER",
        "docker": {
          "image": "ghost",
          "network": "BRIDGE",
          "portMappings": [{ "containerPort": 2368 }]
        }
      },
      "env": {},
      "instances": 1,
      "cpus": 0.5,
      "mem": 256,
      "healthChecks": [{ "path": "/" }]
    }

Post it to the Marathon API via curl:

    curl -X POST -H "Content-Type: application/json" http://ip-to-Marathon:8080/v2/apps -d@ghost.json

Check the Marathon UI, and you should see Ghost being deployed:

![Marathon](Marathon.png)

---

### 3. Configure matching rules in Bamboo

Now, we want to hook up the Marathon Application to HAProxy, by telling Bamboo
to which part of the URL HAProxy should look for.

![URL matching](url-matching.png)

To do that, we first add an entry in our local `/etc/hosts`, so that we
can match on the `Host` header:

    # ip of HAProxy
    192.168.99.100 ghost.local

Then visit the Bamboo UI, usually at `http://ip-of-haproxy:8000`, and add an entry
for Ghost - we named it `ghost-0` in the JSON file above.

![Bamboo ACL](bamboo-acl.png)

This should result in an entry with a green background and displaying the number of
Ghost instances running that Bamboo has detected from Marathon:

![Bamboo](bamboo.png)

If all goes well, you should now be able to browse to your new Ghost instance, via:
[http://ghost.local/](http://ghost.local/)

![Ghost](ghost.png)

Seeing a `Error 503`? Then HAProxy is not happy yet. To debug that, visit
`http://ip-of-haproxy/haproxy_stats` (default credentials are `admin/admin`).
You should see a section with the caption `::ghost-0-cluster` here with information
about the health of the Ghost instance.
You could try editing the acl config or restarting the Bamboo container in that case.

---

## Customizing the HAProxy template

You might want to customize the HAProxy configuration template in production setups.
Be aware that any customization will require that you keep your template in sync
with the upstream version of Bamboo.

---

### Leverage Marathon App Environment variables

Marathon app environment variables can be very useful to customize the HAProxy behavior for
certain apps.
One common example is the use of sticky sessions. Those are generally frowned upon as they go against
the principle of stateless services, so session stickyness should never be made available to all services.
Using an app environment variable makes this a deliberate decision on a per-service basis, one use case
we did encounter was implementing a "polling" fallback endpoint to a generally Websockets based service.
Using session stickiness can be the lesser of two evils, if the other option is changing your service
design to use a shared session storage just for a small minority of clients not supporting Websockets.

This is how it is done: Inside of a HAProxy `backend` block, add:

    {{ if $app.Env.STICKY_SESSIONS }}
    balance url_param sticky
    {{ else }}

Then, in the Marathon JSON file to deploy your service, add:

    {
      "id": "my-marathon-app",
      ...
      "env": {
        "STICKY_SESSIONS": true
      }
    }

---

### Retrying different backends on connection errors

There can be cases where connections are attempted against unhealthy backends:

1. One instances of your microservice crashes between the healthcheck intervals
   of both Marathon and HAProxy
2. Bamboo until at least 0.2.15 adds any new backends reported by Marathon to the
   HAProxy configuration, not considering if they are already healthy. HAProxy
   then sends traffic to those backends until its own healthcheck indicates their
   unhealthiness

While 2. will be solved in future versions of Bamboo, the problem in 1. remains.
Both can be mitigated by adding `option redispatch` to your HAProxy configuration.
By default, HAProxy will retry a backend 3 times before answering with an error
`503`. `option redispatch` will cause the retries to happen on different backends,
if there are any. The number of retries can be tweaked with `option retries [number]`.

---

### Connection and system settings

This is more of a general advice for running HAProxy.
Depending on the specs of the machine running HAProxy, and the kind of traffic you expect,
you might want to check if tweaking of the following settings makes sense:
`maxconn`, `ulimit-n`, `timeout connect`, `timeout client`, `timeout server`
You should, however, have good reasons to change the defaults, and test your assumptions
with load testing tools (e.g. gatling or jmeter).

You might also want to change the authentication credentials for the stats interface
which default to `admin:admin`.

Lastly, things like SSL configuration and logging are also worth looking at.
