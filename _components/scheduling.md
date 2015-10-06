---
title: Scheduling
icon: fa fa-rocket
---
A scheduler is a component that ensures [tasks](/tech/task) are run in the desired number of instances, or at the desired point in time. They usually also deal with failing tasks via healthchecks and can re-schedule
accordingly. To achieve that, they must work together with a [resource management](/components/resource-management) component that can tell the scheduler on which host a task should run, possibly taking into account resource constraints - like required CPU, memory or disk space - set by the scheduler.
Schedulers usually integrate with [service discovery](/components/service-discovery) mechanisms to allow tasks or a [load balancing](/components/load-balancing) component to learn where tasks are running.
