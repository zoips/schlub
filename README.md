# schlub

_"Hey, find me some schlub to do this job"_

Yet another IoC/Service locator for Javascript.

## Yeah, and?

schlub lays out types according to a hierarchy in the same fashion as Unix filesystem. It allows globbing and wildcard
matching to enable the discovery of types in the hierarchy. Combined with a filesystem scan to automatically load
all types, this allows you to do something easy like find everything that claims to be a controller and wire it up
with your server without having to handcode all the references.

## Requirements

schlub uses Harmony generators, so you'll need Node 0.11 or higher.

## Concepts

### Type of schlub

A type is simply a / separated string.

Examples:

* controllers/admin_controller
* server/rest

### Describing a schlub

TODO

### Schlubs your schlub depends on

TODO

## API

### point(type : String, dependencies : Array<String>, opts : Object)

### find(description : Object)

### get(description : Object)

### forget(description : Object, schlub : Object)

### scan(paths : Array<String>)

## What works currently?

* Wildcards

```javascript
schlub.get("foo/*"); // Get all types directly under foo
schlub.get("foo/*/bar"); // Get all bars everywhere under foo
```

* Singletons. You can mark a schlub as a singleton, so every call to get it returns the same instance.

## What needs to be implemented?

* Partial wildcards, eg foo/baz*/bar or foo/*baz/bar
* globstar, ie **