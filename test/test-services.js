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

        Services.register("serviceB/typeA", function(serviceA) {
            return new ServiceB(serviceA);
        }, ["serviceA"]);

        Services.register("serviceB/typeB", function() {
            return new ServiceB2();
        });

        Services.register("serviceC", function(serviceA, serviceB) {
            return new ServiceC(serviceA, serviceB);
        }, ["serviceA", "serviceB/typeA"]);

        Services.register("serviceD", function() {
            return new ServiceD();
        });

        Services.register("serviceD/typeA/instance", new ServiceD());

        Services.register("serviceE", function(serviceA, serviceB, arg1, arg2) {
            return new ServiceE(serviceA, serviceB, arg1, arg2);
        }, ["serviceA", "serviceB/typeB"]);

        describe("#get", function() {
            it("can get a service with no dependencies", function() {
                var serviceA = Services.get("serviceA");

                assert.equal(serviceA.name, "service a", "did not get service a");
            });

            it("can get a service under a directory", function() {
                var serviceB2 = Services.get("serviceB/typeB");

                assert.equal(serviceB2.name, "service b2", "did not get service b2");
            });

            it("can get all services under a directory", function() {
                let services = Services.get({ type: "serviceB/*", allowMultiple: true });
                let found = 0;

                assert.equal(services.length, 2, "should be two services");

                for (let i = 0; i < services.length; i++) {
                    switch (true) {
                        case services[i] instanceof ServiceB:
                            found += 2;
                            break;
                        case services[i] instanceof ServiceB2:
                            found += 4;
                            break;
                    }
                }

                assert.equal(found, 6, "did not get all services");
            });

            it("can get a service with a single dependency", function() {
                var serviceB = Services.get("serviceB/typeA");

                assert.equal(serviceB.name, "service b", "got service b");
                assert.equal(serviceB.serviceA.constructor, ServiceA, "service b did not get ServiceA dependency");
            });

            it("can get a service with a deep dependency tree", function() {
                var serviceC = Services.get("serviceC");

                assert.equal(serviceC.name, "service c", "instantiated service c");
                assert.equal(serviceC.serviceA.constructor, ServiceA, "service c did not get ServiceA dependency");
                assert.equal(serviceC.serviceB.constructor, ServiceB, "service c did not get ServiceB dependency");
            });

            it("allows none when getting", function() {
                assert.doesNotThrow(function() {
                    assert.strictEqual(Services.get({ type: "foo", allowNone: true }), null, "did not allow none");
                }, "did not allow none");
            });

            it("throws when none", function() {
                assert.throws(function() {
                    Services.get("foo");
                });
            });

            it("throws when multiple", function() {
                assert.throws(function() {
                    Services.get("serviceB/*");
                });
            });

            it("get registered instance", function() {
                var serviceDInstance = Services.get("serviceD/typeA/instance");

                assert.equal(serviceDInstance.name, "service d", "did not get service d instance");
            });

            it("registering triggers register event", function() {
                var serviceD = new ServiceD();
                var triggered = false;

                Services.once("register", function(type, service) {
                    assert.equal(type, "serviceD/typeA/instance", "triggered event did not have serviceD/typeA/instance");
                    assert.equal(service, serviceD, "triggered event did not contain the service");
                    triggered = true;
                });
                Services.register("serviceD/typeA/instance", serviceD);
                assert.ok(triggered, "event wasn't triggered");
            });

            it("pass in dependency", function() {
                var serviceA = Services.get("serviceA");
                var serviceB = Services.get("serviceB/typeA", [serviceA]);

                assert.ok(serviceB.serviceA === serviceA, "serviceA isn't the same");
            });

            it("pass in constructor args", function() {
                var arg1 = "this is arg1";
                var arg2 = "this is arg2";
                var serviceE = Services.get("serviceE", [], [arg1, arg2]);

                assert.equal(serviceE.name, "service e", "wrong service");
                assert.equal(serviceE.serviceA.constructor, ServiceA, "service e got wrong ServiceA dependency");
                assert.equal(serviceE.serviceB.constructor, ServiceB2, "service e got wrong ServiceB dependency");

                assert.equal(serviceE.arg1, arg1, "arg1 is incorrect");
                assert.equal(serviceE.arg2, arg2, "arg2 is incorrect");
            });

            it("pass in specific dependency of multiple dependencies", function() {
                var serviceB = Services.get("serviceB/typeA");
                var serviceC = Services.get("serviceC", [null, serviceB]);

                assert.equal(serviceC.name, "service c", "instantiated service c");
                assert.equal(serviceC.serviceA.constructor, ServiceA, "service c got ServiceA dependency");
                assert.ok(serviceC.serviceB === serviceB, "serviceB isn't the same");
            });

            it("pass in specific dependency of multiple dependencies and constructor args", function() {
                var arg1 = "this is arg1";
                var arg2 = "this is arg2";
                var serviceB = Services.get("serviceB/typeA");
                var serviceE = Services.get("serviceE", [null, serviceB], [arg1, arg2]);

                assert.equal(serviceE.name, "service e", "wrong service");
                assert.equal(serviceE.serviceA.constructor, ServiceA, "service e got wrong ServiceA dependency");
                assert.ok(serviceE.serviceB === serviceB, "serviceB isn't the same");

                assert.equal(serviceE.arg1, arg1, "arg1 is incorrect");
                assert.equal(serviceE.arg2, arg2, "arg2 is incorrect");
            });
        });
    });
});
