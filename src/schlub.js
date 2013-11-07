"use strict";

const _ = require("underscore");
const EventEmitter = require("events").EventEmitter;
const Q = require("q");
const fs = require("fs");
const fspath = require("path");
const Directory = require("./directory");

function Schlub() {
    const self = this;

    self.services = new Directory();
    self.servicesById = {};
}

Schlub.prototype = new EventEmitter();

_.extend(Schlub.prototype, {
    services: null,
    servicesById: null,
    serviceId: 0,

    point: function(type) {
        const self = this;
        let id = self.serviceId++;
        let deps;
        let service;
        let opts;

        if (typeof arguments[1] === "function") {
            deps = null;
            service = arguments[1];
            opts = arguments[2] || {};
        } else if (!_.isArray(arguments[1])) {
            deps = null;
            service = arguments[1];
            opts = arguments[2] || {};
        } else {
            deps = arguments[1];
            service = arguments[2];
            opts = arguments[3] || {};
        }

        let ref = {
            id: id,
            service: service,
            type: type,
            deps: deps,
            opts: opts
        };

        self.services.add(type, ref);
        self.servicesById[id] = ref;

        self.emit("register", type, service);
    },

    scan: Q.async(function*(paths) {
        paths = [].concat(paths);

        while (paths.length > 0) {
            let dir = paths.shift();
            let files = yield Q.nfcall(fs.readdir, dir)

            for (let i = 0; i < files.length; i++) {
                let path = [dir, files[i]].join(fspath.sep);
                let stats = yield Q.nfcall(fs.stat, path);

                if (stats.isDirectory()) {
                    paths.push(path);
                } else if (fspath.extname(path) === ".js") {
                    let reqPath = path.match(/^(.*?)\.js$/)[1];

                    require(reqPath);
                }
            }
        }
    }),

    find: function(desc) {
        const self = this;
        let refs;

        if (desc.id) {
            refs = [self.servicesById[desc.id]];
        } else if (desc.type) {
            refs = self.services.find(desc.type);
        } else {
            refs = self.services.find(desc);
        }

        if (refs === null || typeof refs === "undefined" || refs.length === 0) {
            if (desc.allowNone) {
                return null;
            } else {
                throw new Error("No schlubs for description: " + JSON.stringify(desc));
            }
        } else if (refs.length > 1 && !desc.allowMultiple) {
            throw new Error("Description ambiguous: " + JSON.stringify(desc));
        }

        return refs;
    },

    "get": function(desc) {
        const self = this;
        let refs = self.find(desc);
        let suppliedDeps = arguments[1] || [];
        let deps;
        let args = arguments[2] || [];

        if (refs === null) {
            return refs;
        }

        refs = refs.map(function(ref) {
            if (ref.deps) {
                if (ref.opts.singleton && !desc.newInstance && typeof ref.singleton !== "undefined") {
                    return ref.singleton;
                }

                deps = ref.deps.map(function(dep, i) {
                    if (suppliedDeps[i]) {
                        return suppliedDeps[i];
                    } else {
                        return self.get(dep);
                    }
                });

                let v = ref.service.apply(null, deps.concat(args));

                if (ref.opts.singleton) {
                    ref.singleton = v;
                }

                return v;
            } else {
                if (typeof ref.service === "function") {
                    if (ref.opts.singleton && !desc.newInstance && typeof ref.singleton !== "undefined") {
                        return ref.singleton;
                    }

                    let v = ref.service.apply(null, args);

                    if (ref.opts.singleton) {
                        ref.singleton = v;
                    }

                    return v;
                } else {
                    return ref.service;
                }
            }
        });

        if (desc.allowMultiple) {
            return refs;
        } else {
            return refs[0];
        }
    },

    forget: function(desc, schlub) {
        const self = this;
        let refs;

        if (typeof desc === "string") {
            refs = self.find({ type: desc, allowNone: true, allowMultiple: true });
        } else {
            refs = self.find(_.extend({}, desc, { allowNone: true, allowMultiple: true  }));
        }

        if (refs !== null) {
            for (let i = 0; i < refs.length; i++) {
                delete self.servicesById[refs[i].id];

                if (schlub) {
                    self.services.remove(refs[i].type, [schlub]);
                } else {
                    self.services.remove(refs[i].type);
                }
            }
        }
    }
});

module.exports = new Schlub();