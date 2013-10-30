"use strict";

var assert = require("assert");
var Directory = require("../src/directory");

describe("Directory", function() {
    it("should be a function", function() {
        assert.ok(typeof Directory === "function", "not a function");
    });

    describe("#add", function() {
        it("can add a new type", function() {
            var tt = new Directory();
            var t = { "asdf": "asdf" };
            var t2 = { "foo": "bar" };
            var t3 = { "not bar": "baz" };
            var t4 = { "not baz" : "bar" };

            tt.add("foo/bar", t);
            tt.add("foo/bar", t2);
            tt.add("foo", t3);
            tt.add("chimps", t4);

            assert.strictEqual(tt.children["foo"].children["bar"].values[0], t, "type t not in correct location");
            assert.strictEqual(tt.children["foo"].children["bar"].values[1], t2, "type t2 not in correct location");
            assert.strictEqual(tt.children["foo"].values[0], t3, "type t3 not in correct location");
            assert.strictEqual(tt.children["chimps"].values[0], t4, "type t4 not in correct location");
        });
    });

    describe("#find", function() {
        it("can find a type", function() {
            var tt = new Directory();
            var t = { "asdf": "asdf" };
            var t2 = { "foo": "bar" };
            var t3 = { "not bar": "baz" };
            var t4 = { "not baz" : "bar" };

            tt.add("foo/bar", t);
            tt.add("foo/bar", t2);
            tt.add("foo", t3);
            tt.add("chimps", t4);

            var a = tt.find("foo/bar");

            assert.equal(a.length, 2, "should be two types at foo/bar");
            assert.strictEqual(a[0], t, "foo/bar:[0] should be type t");
            assert.strictEqual(a[1], t2, "foo/bar:[1] should be type t2");

            a = tt.find("foo");

            assert.equal(a.length, 1, "should be one type at foo");
            assert.strictEqual(a[0], t3, "foo:[0] should be t3");

            a = tt.find("chimps");

            assert.equal(a.length, 1, "should be one type at chimps");
            assert.strictEqual(a[0], t4, "chimps:[0] should be t4");
        });

        it("can find types when wildcard is used at the end", function() {
            var tt = new Directory();
            var t = { "asdf": "asdf" };
            var t2 = { "foo": "bar" };
            var t3 = { "not bar": "baz" };
            var t4 = { "not baz" : "bar" };

            tt.add("foo/baz/bar", t);
            tt.add("foo/baz/bar", t2);
            tt.add("foo/baz/chimps", t3);
            tt.add("foo/knobs/bar", t4);

            var a = tt.find("foo/baz/*");

            assert.equal(a.length, 3, "should be three types for foo/baz/*");
            assert.strictEqual(a[0], t, "foo/baz/*:[0] should be type t");
            assert.strictEqual(a[1], t2, "foo/baz/*:[1] should be type t2");
            assert.strictEqual(a[2], t3, "foo/baz/*:[2] should be type t3");
        });

        it("can find types when wildcard is used in middle", function() {
            var tt = new Directory();
            var t = { "asdf": "asdf" };
            var t2 = { "foo": "bar" };
            var t3 = { "not bar": "baz" };
            var t4 = { "not baz" : "bar" };

            tt.add("foo/baz/bar", t);
            tt.add("foo/baz/bar", t2);
            tt.add("foo/baz/chimps", t3);
            tt.add("foo/knobs/bar", t4);

            var a = tt.find("foo/*/bar");

            assert.equal(a.length, 3, "should be three types at foo/*/bar");
            assert.strictEqual(a[0], t, "foo/*/bar:[0] should be type t");
            assert.strictEqual(a[1], t2, "foo/*/bar:[1] should be type t2");
            assert.strictEqual(a[2], t4, "foo/*/bar:[2] should be type t4");
        });
    });
});