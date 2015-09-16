---
title: Management of secrets
icon: fa fa-user-secret
---
In the world of programmable infrastructure, secrets like API keys or
database passwords can no longer be manually put into a config file.
These critical pieces of information might otherwise end up in shared
[image registries](/components/registry/). They might also require
different values for test, development and production environments.
More advanced setups will also require to generate such secrets on the
fly, e.g. to provision new database instances.

Systems for secrets management try to solve these challenges.
