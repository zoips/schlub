"use strict";

var assert = require("assert");
var Services = require("../src/services");

describe("Services", function() {
    it("should be an object", function() {
        assert.ok(typeof Services === "object", "not an object");
        assert.ok(Services !== null, "null");
    });

    describe("api", function() {
        function ServiceA() {
            this.name = "service a";
        }

        function ServiceB(serviceA) {
            this.name = "service b";
            this.serviceA = serviceA;
        }

        function ServiceB2() {
            this.name = "service b2";
        }

        function ServiceC(serviceA, serviceB) {
            this.name = "service c";
            this.serviceA = serviceA;
            this.serviceB = serviceB;
        }

        function ServiceD() {
            this.name = "service d";
        }

        function ServiceE(serviceA, serviceB, arg1, arg2) {
            this.name = "service e";
            this.serviceA = serviceA;
            this.serviceB = serviceB;
            this.arg1 = arg1;
            this.arg2 = arg2;
        }

        Services.register("serviceA", function() {
            return new ServiceA();
        });

        Services.register({ name: "serviceB", type: "typeA" }, function(serviceA) {
            return new ServiceB(serviceA);
        }, [{ name: "serviceA" }]);

        Services.register({ name: "serviceB", type: "typeB" }, function() {
            return new ServiceB2();
        });

        Services.register("serviceC", function(serviceA, serviceB) {
            return new ServiceC(serviceA, serviceB);
        }, [{ name: "serviceA" }, { name: "serviceB", type: "typeA" }]);

        Services.register({ name: "serviceD", type: "typeA" }, function() {
            return new ServiceD();
        });

        Services.register({ name: "serviceD", type: "typeA:instance" }, new ServiceD());

        Services.register("serviceE", function(serviceA, serviceB, arg1, arg2) {
            return new ServiceE(serviceA, serviceB, arg1, arg2);
        }, [{ name: "serviceA" }, { name: "serviceB", type: "typeB" }], { name: "serviceE" });

        describe("#getByName", function() {
            it("can retrieve all services by name", function() {
                var serviceBs = Services.getByName("serviceB");
                var service;
                var services = 0;
                var i;

                assert.equal(serviceBs.length, 2, "did not get all serviceBs");

                for (i = 0; i < serviceBs.length; i++) {
                    service = Services.get(serviceBs[i]);

                    switch (true) {
                        case service.name === "service b":
                            services += 1;
                            break;
                        case service.name === "service b2":
                            services += 2;
                            break;
                    }
                }

                assert.equal(services, 3, "did not get got correct serviceBs");
            });
        });

        describe("#getByType", function() {
            it("can retrieve all services by type", function() {
                var typeAs = Services.getByType("typeA");
                var service;
                var services = 0;
                var i;

                assert.equal(typeAs.length, 2, "did not get got all typeAs");

                for (i = 0; i < typeAs.length; i++) {
                    service = Services.get(typeAs[i]);

                    switch (true) {
                        case service.name === "service b":
                            services += 1;
                            break;
                        case service.name === "service d":
                            services += 2;
                            break;
                    }
                }

                assert.equal(services, 3, "did not get got correct typeAs");
            });
        });

        describe("#get", function() {
            it("can get a service with no dependencies", function() {
                var serviceA = Services.get({ name: "serviceA" });

                assert.equal(serviceA.name, "service a", "did not get service a");
            });

            it("can get a service with multiple types", function() {
                var serviceB2 = Services.get({ name: "serviceB", type: "typeB" });

                assert.equal(serviceB2.name, "service b2", "did not get service b2");
            });

            it("can get a service with a single dependency", function() {
                var serviceB = Services.get({ name: "serviceB", type: "typeA" });

                assert.equal(serviceB.name, "service b", "got service b");
                assert.equal(serviceB.serviceA.constructor, ServiceA, "service b did not get ServiceA dependency");
            });

            it("can get a service with a deep dependency tree", function() {
                var serviceC = Services.get({ name: "serviceC" });

                assert.equal(serviceC.name, "service c", "instantiated service c");
                assert.equal(serviceC.serviceA.constructor, ServiceA, "service c did not get ServiceA dependency");
                assert.equal(serviceC.serviceB.constructor, ServiceB, "service c did not get ServiceB dependency");
            });

            it("allows none when getting", function() {
                assert.doesNotThrow(function() {
                    assert.strictEqual(Services.get({ name: "foo", allowNone: true }), null, "did not allow none");
                }, "did not allow none");
            });

            it("throws when none", function() {
                assert.throws(function() {
                    Services.get({ name: "foo" });
                });
            });

            it("allows multiple when getting", function() {
                var serviceBs = Services.get({ name: "serviceB", allowMultiple: true });
                var services = 0;
                var i;

                assert.equal(serviceBs.length, 2, "did not get service bs");

                for (i = 0; i < serviceBs.length; i++) {
                    switch (true) {
                        case serviceBs[i].name === "service b": services += 1;
                            break;
                        case serviceBs[i].name === "service b2": services += 2;
                            break;
                    }
                }

                assert.equal(services, 3, "did not get all services");
            });

            it("throws when multiple", function() {
                assert.throws(function() {
                    Services.get({ name: "serviceB" });
                });
            });

            it("get registered instance", function() {
                var serviceDInstance = Services.get({ type: "typeA:instance" });

                assert.equal(serviceDInstance.name, "service d", "did not get service d instance");
            });

            it("registering triggers register event", function() {
                var serviceD = new ServiceD();
                var triggered = false;

                Services.once("register", function(name, type, service) {
                    assert.equal(name, "serviceD", "triggered event did not have serviceD name");
                    assert.equal(type, "typeA:instance", "triggered event did not have typeA:instance");
                    assert.equal(service, serviceD, "triggered event did not contain the service");
                    triggered = true;
                });
                Services.register({ name: "serviceD", type: "typeA:instance" }, serviceD);
                assert.ok(triggered, "event wasn't triggered");
            });

            it("pass in dependency", function() {
                var serviceA = Services.get({ name: "serviceA" });
                var serviceB = Services.get({ name: "serviceB", type: "typeA" }, [serviceA]);

                assert.ok(serviceB.serviceA === serviceA, "serviceA isn't the same");
            });

            it("pass in constructor args", function() {
                var arg1 = "this is arg1";
                var arg2 = "this is arg2";
                var serviceE = Services.get({ name: "serviceE" }, [], [arg1, arg2]);

                assert.equal(serviceE.name, "service e", "wrong service");
                assert.equal(serviceE.serviceA.constructor, ServiceA, "service e got wrong ServiceA dependency");
                assert.equal(serviceE.serviceB.constructor, ServiceB2, "service e got wrong ServiceB dependency");

                assert.equal(serviceE.arg1, arg1, "arg1 is incorrect");
                assert.equal(serviceE.arg2, arg2, "arg2 is incorrect");
            });

            it("pass in specific dependency of multiple dependencies", function() {
                var serviceB = Services.get({ name: "serviceB", type: "typeA" });
                var serviceC = Services.get({ name: "serviceC" }, [null, serviceB]);

                assert.equal(serviceC.name, "service c", "instantiated service c");
                assert.equal(serviceC.serviceA.constructor, ServiceA, "service c got ServiceA dependency");
                assert.ok(serviceC.serviceB === serviceB, "serviceB isn't the same");
            });

            it("pass in specific dependency of multiple dependencies and constructor args", function() {
                var arg1 = "this is arg1";
                var arg2 = "this is arg2";
                var serviceB = Services.get({ name: "serviceB", type: "typeA" });
                var serviceE = Services.get({ name: "serviceE" }, [null, serviceB], [arg1, arg2]);

                assert.equal(serviceE.name, "service e", "wrong service");
                assert.equal(serviceE.serviceA.constructor, ServiceA, "service e got wrong ServiceA dependency");
                assert.ok(serviceE.serviceB === serviceB, "serviceB isn't the same");

                assert.equal(serviceE.arg1, arg1, "arg1 is incorrect");
                assert.equal(serviceE.arg2, arg2, "arg2 is incorrect");
            });    
        })
    });
});
