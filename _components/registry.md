---
title: Image Registries
icon: fa fa-archive
---
To run a container inside a host, the image must somehow end up on that host. For publicly available images, [Docker Hub](/tech/docker-hub/) is a popular choice.
But most companies will generate their own images, often as part of a [Continuous Delivery](/tech/continuous-delivery/) pipeline. Those have to go somewhere, before a [scheduling](/components/scheduling/) component can decide on which host the container should start.
Thats when private container registries become interesting: They provide a place where your organization can put images in a versioned way, so that they can be pulled later when an application is scheduled to run.
