---
title: PaaS and managed container environments
icon: fa fa-cloud
---
Commercial PaaS offerings based on [OpenShift](/tech/openshift) or [CloudFoundry](/tech/cloudfoundry) have been around for quite some time - both implementing their own [containerization](/components/container-runtime) and [service discovery](/components/service-discovery) components. With the advent of new offerings that focus solely on de-facto standardized technologies like [Docker](/tech/docker/), also the established PaaS vendors are following suit. As an example, the latest OpenShift version is already based around [Kubernetes](/tech/kubernetes/).

Complex problems like auto-scaling, [persistency](/components/persistency) and [networking](/components/networking) lack de-facto standard solutions, so commercial PaaS offerings often promise to solve these complexities using proprietary components.
