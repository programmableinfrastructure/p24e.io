---
title: Configuration Management
icon: fa fa-code
---
Configuration Management (CM) systems are used to configure services and application  on servers, usually via a special *Domain Specific Language* (DSL). Some CM systems also allow provisioning of infrastructure, like VMs, and integrate with other infrastructure components, like networking gear.
They typically follow either a push or pull model of distributing and applying configuration changes, some come with central servers where the current state of your infrastructure is stored and a versioned repository of configurations exists.
Recently, a trend can be observed to use CM systems for system level configuration while leveraging [orchestration](/components/orchestration) tools and containerization, e.g. via [Docker](/tech/docker), to configure at the application level.
