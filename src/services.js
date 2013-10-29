"use strict";

const _ = require("underscore");
const EventEmitter = require("events").EventEmitter
const Q = require("q");
const fs = require("fs");
const fspath = require("path");

function Services() {
    const self = this;

    self.services = [];
    self.servicesByName = {};
    self.servicesByType = {};
    self.servicesById = {};
};

Services.prototype = new EventEmitter();

_.extend(Services.prototype, {
    services: null,
    servicesByName: null,
    servicesByType: null,
    servicesById: null,
    serviceId: 0,

    register: function(r, service, deps) {
        const self = this;
        let id = self.serviceId++;
        let name = typeof r === "object" ? r.name : r;
        let type = typeof r === "object" ? r.type : null;
        let ref = {
            id: id,
            name: name,
            service: service,
            type: type,
            deps: deps
        };

        self.services.push(ref);
        self.servicesById[id] = ref;

        if (!self.servicesByName[name]) {
            self.servicesByName[name] = [];
        }

        self.servicesByName[name].push(ref);

        if (typeof type !== "undefined" && type !== null) {
            if (!self.servicesByType[type]) {
                self.servicesByType[type] = [];
            }

            self.servicesByType[type].push(ref);
        }

        self.emit("register", name, type, service);
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

    getByName: function(name) {
        const self = this;
        let refs = self.servicesByName[name];

        if (!refs) {
            throw new Error("No services for name " + name);
        }

        return _.map(refs, function(ref) {
            return {
                id: ref.id,
                name: ref.name,
                type: ref.type
            };
        });
    },

    getByType: function(type) {
        const self = this;
        let refs = self.servicesByType[type];

        if (!refs) {
            throw new Error("No services for name " + name);
        }

        return refs.map(function(ref) {
            return {
                id: ref.id,
                name: ref.name,
                type: ref.type
            };
        });
    },

    "get": function(desc) {
        const self = this;
        let refs;
        let suppliedDeps = arguments[1] || [];
        let deps;
        let args = arguments[2] || [];

        if (desc.id) {
            refs = [self.servicesById[desc.id]];
        } else if (desc.name) {
            refs = self.servicesByName[desc.name];

            if (_.isArray(refs) && desc.type) {
                refs = refs.filter(function(ref) {
                    return ref.type === desc.type;
                });
            }
        } else if (desc.type) {
            refs = self.servicesByType[desc.type];
        } else {
            throw new Error("Description ambiguous: " + JSON.stringify(desc));
        }

        if (refs == null || refs.length === 0) {
            if (desc.allowNone) {
                return null;
            } else {
                throw new Error("No services for description: " + JSON.stringify(desc));
            }
        } else if (refs.length > 1 && !desc.allowMultiple) {
            throw new Error("Description ambiguous: " + JSON.stringify(desc));
        }

        refs = refs.map(function(ref) {
            if (ref.deps) {
                deps = ref.deps.map(function(dep, i) {
                    if (suppliedDeps[i]) {
                        return suppliedDeps[i];
                    } else {
                        return self.get(dep);
                    }
                });

                return ref.service.apply(null, deps.concat(args));
            } else {
                if (typeof ref.service === "function") {
                    return ref.service.apply(null, args);
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
    }
});

module.exports = new Services();