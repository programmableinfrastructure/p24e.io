---
title: Sensu
labels: OSS supported
vendor: Sensu
website: http://sensuapp.org
component: monitoring
---
Monitor servers, services, application health, and business KPIs. Unfortunately sensu does not have any docker support out of the box. However, using the plugin system you can configure support for both container metrics as well as status checks. E.g.:

- [sensu-plugins/sensu-plugins-consul](https://github.com/sensu-plugins/sensu-plugins-consul)
- [sensu-plugins/sensu-plugins-mesos](https://github.com/sensu-plugins/sensu-plugins-mesos)
- [sensu-plugins/sensu-plugins-docker](https://github.com/sensu-plugins/sensu-plugins-docker)
