var jasmine = require('jasmine-node');

var AdalModule = require('../../../lib/adal.js');

describe("Adal", function () {
    var adal;
    var conf = {};
    var testPage = "this is a song";
    var STORAGE_PREFIX = "adal";
    var STORAGE_ACCESS_TOKEN_KEY = STORAGE_PREFIX + ".access.token";
    var STORAGE_EXPIRATION_KEY = STORAGE_PREFIX + ".expiration";
    var STORAGE_TOKEN_KEYS = STORAGE_PREFIX + ".token.keys";
    var RESOURCE1 = "token.resource1";
    var SECONDS_TO_EXPIRE = 3600;
    var window = {};
    var storageFake = function () {
        var store = {};
        return {
            getItem: function (key) {
                return store[key];
            },
            setItem: function (key, value) {
                store[key] = value.toString();
            },
            clear: function () {
                store = {};
            }
        };
    }();

    beforeEach(function () {

        // one item in cache
        storageFake.setItem(STORAGE_ACCESS_TOKEN_KEY + RESOURCE1, "access_token_in_cache" + RESOURCE1);
        var secondsNow = Math.round(new Date().getTime() / 1000.0);
        storageFake.setItem(STORAGE_EXPIRATION_KEY + RESOURCE1, secondsNow + SECONDS_TO_EXPIRE); // seconds to expire

        // add key
        storageFake.setItem(STORAGE_TOKEN_KEYS, RESOURCE1 + "|");

        Object.defineProperty(window, 'localStorage', storageFake);

        // Init adal
        adal = new AdalModule.inject(window, storageFake, conf);
    });


    it("set start page", function () {
        adal.setStartPage(testPage);
        expect(adal.startPage).toEqual(testPage);
    });

    it("gets specific resource for defined endpoint mapping", function () {
        adal.config = { resource: "default resource" };
        adal.config.endpoints = { "a": "resource for a" };
        expect(adal.getResourceForEndpoint("a")).toBe("resource for a");
        expect(adal.getResourceForEndpoint("b")).toBe("");
    });

    it("gets default resource for empty endpoint mapping", function () {
        adal.config = { resource: "default resource" };
        adal.config.endpoints = null;
        expect(adal.getResourceForEndpoint("a")).toBe("default resource");
        expect(adal.getResourceForEndpoint("b")).toBe("default resource");
    });

    it("says token expired", function () {
        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE - 100;
        expect(adal.getCachedToken(RESOURCE1)).toEqual("access_token_in_cache" + RESOURCE1);

        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE;
        expect(adal.getCachedToken(RESOURCE1)).toBe(null);

        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE + 1;
        expect(adal.getCachedToken(RESOURCE1)).toBe(null);

    });

});

env = jasmine.getEnv().execute();