---
title: Raft
component: paradigms
---
> Raft is a consensus algorithm designed as an alternative to [Paxos](/tech/paxos/). It was meant to be more understandable than Paxos by means of separation of logic, but it is also formally proven safe and offers some new features.

More info: [Raft on Wikipedia](https://en.wikipedia.org/wiki/Raft_(computer_science))

The Raft algorithm is often used in [Service Discovery](/components/service-discovery) components, [etcd](/tech/etcd) is a notable example for implementing it.
