WORK IS IN PROGRESS
================

Please join the conversation on [Slack](http://p24e.slack.com) to discuss about
component definitions, structure of guides, topics for guides etc.

Running locally
---------------

make sure you have Ruby installed, then run:

* `bundle install`
* `jekyll serve`

or, if you don't have Ruby installed:

`docker run --rm -v "$PWD":/srv/jekyll -p 4000:4000 jekyll/jekyll`

The site is running on http://localhost:4000/

Contributing
------------

You are welcome to contribute new or enhance existing guides and tech articles.
Just send a pull request - our goal is respond as fast as possible, maximum
within a week.

By doing so, you agree that you own the copyright of the content you provide
and that you are willing to put it under the [CC-BY-SA](http://creativecommons.org/licenses/by-sa/4.0/)
license.

To contribute a *guide*, please structure it like the existing ones, i.e. use
at least the following topics (additional ones are always welcome):

1. Problem description
2. Overview of the solution, also covering advantages and shortcomings
3. Implementation steps

To contribute a *tech* article about a specific tool, product or concept, keep
them concise and neutral. It's ok to add links to additional documentation.

You can also add relevant blog posts to the "front matter" of the markdown
file, for an example see [etcd.md](_tech/etcd.md). Adding posts that way will
make sure these posts also end up on the overview page of the component
("Service Discovery" in case of *etcd*.)

Only add posts that provide an unique view on the technology, like its
application in a more complex setting, or a detailed discussion of its design
or features.
