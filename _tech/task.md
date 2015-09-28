---
title: Task
component: paradigms
---
We use the term "task" to refer to any piece of code that needs to be run by a [scheduler](/components/scheduling) on resources provided by a [resource management](/components/resource-management) component.
Often, tasks will be packaged in containers, executed in a [container runtime](/components/container-runtime). They can be both long running deamons, like micro services - or short lived jobs.
The term "task" is used in [Apache Mesos](/tech/mesos) to refer to anything run by Mesos, other tools use different nomenclature which we will point out in the respective articles.
