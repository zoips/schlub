"use strict";

const _ = require("underscore");
const EventEmitter = require("events").EventEmitter;
const Q = require("q");
const fs = require("fs");
const fspath = require("path");
const Directory = require("./directory");

function Services() {
    const self = this;

    self.services = new Directory();
    self.servicesById = {};
}

Services.prototype = new EventEmitter();

_.extend(Services.prototype, {
    services: null,
    servicesById: null,
    serviceId: 0,

    register: function(type, service, deps) {
        const self = this;
        let id = self.serviceId++;
        let ref = {
            id: id,
            service: service,
            type: type,
            deps: deps
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

    "get": function(desc) {
        const self = this;
        let refs;
        let suppliedDeps = arguments[1] || [];
        let deps;
        let args = arguments[2] || [];

        if (desc.id) {
            refs = [self.servicesById[desc.id]];
        } else if (desc.type) {
            refs = self.services.find(desc.type);
        } else {
            refs = self.services.find(desc);
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