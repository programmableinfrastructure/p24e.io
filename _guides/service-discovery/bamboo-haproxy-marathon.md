---
title: Service Discovery with Marathon, Bamboo and HAProxy
component: service-discovery
author: Max Schöfmann
sponsor: HolidayCheck
sponsor_website: http://www.holidaycheck.de
pubdate: 2015-09-16 00:00:00
---
#### Problem

You have a bunch of microservices deployed in your [Mesos](/tech/mesos/) cluster, and want to make them
available under a service specific URLs via HTTP so they can call each other or be accessed from the
outside world.

#### Components

* [Bamboo](/tech/bamboo/)
* [Marathon](/tech/marathon/)
* [HAProxy](/tech/haproxy/)
* [Zookeeper](/tech/zookeeper/)

#### Overview

Marathon schedules services as tasks in the Mesos cluster and uses healthchecks to keep track of the
tasks status. Bamboo listens to Marathon events for task changes and updates the HAProxy configuration
accordingly. HAProxy ACL rules are configured via Bamboo and can be used to match request characteristics,
like URL patterns, host names or HTTP headers to services that should handle the request.

##### Pros

* Allows mapping arbitrary URLs to services
* Allows matching other request characteristics like HTTP headers
* Immediate reconfiguration due to usage of marathon events (no cronjob)
* Battle tested code in HAProxy for the heavy lifting

##### Cons

* Does not leverage HAProxy stats socket to minimise reloads
* HAProxy reload forks new process, which can be problematic with high number of task status changes
* All internal traffic goes through an additional hop (HAProxy)
* Redundant HAProxy setup with failover required unless the [SmartStack](/tech/synapse/) pattern is used.

#### Implementation steps

(howto goes here)
