var jasmine = require('jasmine-node');

var Adal = require('../../../lib/adal.js');
 
describe("Adal", function () {
    var adal;
    var store = {};
    var testPage = "this is a song";
    var STORAGE_PREFIX = "adal";
    var STORAGE_ACCESS_TOKEN_KEY = STORAGE_PREFIX + ".access.token";
    var STORAGE_EXPIRATION_KEY = STORAGE_PREFIX + ".expiration";

    beforeEach(function () {
        adal = new Adal();
        store = {};

        spyOn(localStorage, 'getItem').andCallFake(function (key) {
            return store[key];
        });
        spyOn(localStorage, 'setItem').andCallFake(function (key, value) {
            return store[key] = value + '';
        });
        spyOn(localStorage, 'clear').andCallFake(function () {
            store = {};
        });

        // one item in cache
        store[STORAGE_ACCESS_TOKEN_KEY] = "access_token_in_cache";
        var secondsNow = Math.round(new Date().getTime() / 1000.0);
        store[STORAGE_EXPIRATION_KEY] = secondsNow + 3600; // seconds to expire
    });


    it("set start page", function () {
	adal.setStartPage(testPage);
        expect(adal.startPage).toEqual(testPage);        
    });

    it("gets resource for endpoint", function () {
        adal.config = {resource:"default resource"};
        adal.config.endpoints = { "a": "resource for a" };
        expect(adal.getResourceForEndpoint("a")).toBe("resource for a");
        expect(adal.getResourceForEndpoint("b")).toBe("default resource");
    });

    it("says token expired", function () {
        adal.setStartPage(testPage);
        expect(adal.startPage).toEqual(testPage);
    });

});

env = jasmine.getEnv().execute();