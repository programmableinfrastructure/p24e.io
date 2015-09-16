---
title: Load balancing
icon: fa fa-globe
---
After a [Scheduler](/components/scheduling/) has started a multiple instances
of a service, it is usually not enough to just provide a way to learn where
the new instances are via [Service Discovery](/components/service-discovery).
In most cases, workloads going towards these services, such as HTTP requests,
need to be balanced across all available instances.
Load balancing components provide that functionality, usually by routing
requests through themselves in form of a reverse proxy.
Some [Service Discovery](/components/service-discovery) mechanisms, like
[Mesos DNS](/tech/mesos-dns) can also be regarded as load balancing as it
allows to distribute requests from clients relatively seamlessly.
