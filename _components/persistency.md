---
title: Persistency
icon: fa fa-database
---
When application containers are scheduled to run on arbitrary machines,
managing persistency for workloads like databases or message queues
becomes challenging. While a [resource management](/components/resource-management/)
component can make sure a container is run on a host that has sufficient
disk space of the required quality, dealing with the movement and management of
volumes as containers are moved around the infrastructure is ths job of a
persistency component.
