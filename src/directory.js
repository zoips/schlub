"use strict";

const EventEmitter = require("events").EventEmitter;
const _  = require("underscore");

function Directory(type) {
    const self = this;

    self.children = {};
    self.values = [];
    self.type = type;
}

Directory.prototype = new EventEmitter();

_.extend(Directory.prototype, {
    type: null,
    children: null,
    values: null,

    find: function(path) {
        const self = this;
        const types = path.split(/\//g);
        let nodes = [self];

        for (let i = 0; i < types.length; i++) {
            let type = types[i];
            let len = nodes.length;

            for (let j = 0; j < len; j++) {
                let node = nodes.shift();

                switch (type) {
                    case "*": {
                        let keys = Object.keys(node.children);

                        for (let k = 0; k < keys.length; k++) {
                            nodes.push(node.children[keys[k]]);
                        }
                        break;
                    }
                    default: {
                        let child = node.children[type];

                        if (typeof child !== "undefined") {
                            nodes.push(child);
                        }
                        break;
                    }
                }
            }
        }

        return nodes.reduce(function(values, node) {
            values.push.apply(values, node.values);
            return values;
        }, []);
    },

    add: function(path, value) {
        const self = this;
        const types = path.split(/\//g);
        let node = self;
        let child;

        do {
            let type = types[0];
            child = node.children[type];

            if (typeof child === "undefined") {
                child = node.children[type] = new Directory(type);
            }

            node = child;
            types.shift();
        } while(types.length > 0);

        node.values.push(value);
    }
});

module.exports = Directory;