//----------------------------------------------------------------------
// Copyright (c) Microsoft Open Technologies, Inc.
// All Rights Reserved
// Apache License 2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//----------------------------------------------------------------------
'use strict'
var jasmine = require('jasmine-node');
var confighash = { hash: '#' };
var AdalModule = require('../../../lib/adal.js');

describe('Adal', function () {
    var adal;
    var window = {
        location: {
            hash: "#hash",
            href: "href",
            replace: function (val) {
            }
        },
        localStorage: {}
    };
    var mathMock = {
        random: function () {
            return 0.2;
        },
        round: function (val) {
            return 1000;
        }
    };
    var frameMock = {
        src: "start"
    };

    var documentMock = {
        getElementById: function () {
            return frameMock;
        }
    };
    var angularMock = {};
    var conf = { loginResource: 'default resource', tenant: 'testtenant' };
    var testPage = 'this is a song';
    var STORAGE_PREFIX = 'adal';
    var STORAGE_ACCESS_TOKEN_KEY = STORAGE_PREFIX + '.access.token.key';
    var STORAGE_EXPIRATION_KEY = STORAGE_PREFIX + '.expiration.key';
    var STORAGE_TOKEN_KEYS = STORAGE_PREFIX + '.token.keys';
    var RESOURCE1 = 'token.resource1';
    var SECONDS_TO_EXPIRE = 3600;
 
    var storageFake = function () {
        var store = {};
        return {
            getItem: function (key) {
                return store[key];
            },
            setItem: function (key, value) {
                if (typeof value != 'undefined') {
                    store[key] = value.toString();
                }
            },
            clear: function () {
                store = {};
            },
            storeVerify: function () {
                return store;
            }
        };
    }();

    beforeEach(function () {

        // one item in cache
        storageFake.setItem(STORAGE_ACCESS_TOKEN_KEY + RESOURCE1, 'access_token_in_cache' + RESOURCE1);
        var secondsNow = mathMock.round(0);
        storageFake.setItem(STORAGE_EXPIRATION_KEY + RESOURCE1, secondsNow + SECONDS_TO_EXPIRE); // seconds to expire

        // add key
        storageFake.setItem(STORAGE_TOKEN_KEYS, RESOURCE1 + '|');

        window.localStorage = storageFake;

        // Init adal 
        adal = new AdalModule.inject(window, storageFake, documentMock, mathMock, angularMock, conf);
 
    });

    it('set start page', function () {
        adal.setStartPage(testPage);
        expect(adal._startPage).toEqual(testPage);
    });

    it('gets specific resource for defined endpoint mapping', function () {
        adal.config.endpoints = { 'a': 'resource for a' };
        expect(adal.getResourceForEndpoint('a')).toBe('resource for a');
        expect(adal.getResourceForEndpoint('b')).toBe('');
    });

    it('gets default resource for empty endpoint mapping', function () {
        adal.config.endpoints = null;
        expect(adal.getResourceForEndpoint('a')).toBe('default resource');
        expect(adal.getResourceForEndpoint('b')).toBe('default resource');
    });

    it('sets default resource', function () {
        expect(adal.config.resource).toBe('default resource');
    });

    it('says token expired', function () {
        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE - 100;
        expect(adal.getCachedToken(RESOURCE1)).toEqual('access_token_in_cache' + RESOURCE1);

        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE;
        expect(adal.getCachedToken(RESOURCE1)).toBe(null);

        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE + 1;
        expect(adal.getCachedToken(RESOURCE1)).toBe(null);
    });

    it('gets cache username', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.USERNAME, 'test user');
        expect(adal.getCachedUser()).toBe('test user');
    });

    it('navigates user to login by default', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.USERNAME, 'test user');
        adal.config.displayCall = null;
        adal.config.clientId = 'client';
        adal.config.redirectUri = 'contoso_site';
        spyOn(adal, 'promptUser');
        console.log('instance:' + adal.instance);
        adal.login();
        expect(adal.promptUser).toHaveBeenCalledWith('https://login.windows.net/' + conf.tenant + '/oauth2/authorize?response_type=token&client_id=client&resource=default%20resource&redirect_uri=contoso_site&state=33333333-3333-4333-b333-333333333333');
        expect(adal.config.state).toBe('33333333-3333-4333-b333-333333333333');
    });

    it('calls displaycall if given for login', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.USERNAME, 'test user');

        adal.config.clientId = 'client';
        adal.config.redirectUri = 'contoso_site';
        var urlToGo = '';
        var displayCallback = function (url) {
            urlToGo = url;
        };
        adal.config.displayCall = displayCallback;
        spyOn(adal.config, 'displayCall');
        adal.login();
        expect(adal.config.displayCall).toHaveBeenCalledWith('https://login.windows.net/' + conf.tenant + '/oauth2/authorize?response_type=token&client_id=client&resource=default%20resource&redirect_uri=contoso_site&state=33333333-3333-4333-b333-333333333333');
        expect(adal.config.state).toBe('33333333-3333-4333-b333-333333333333');
    });

    it('returns renewing true if renewtoken state registered', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.STATE_RENEW, '345');
        expect(adal.isRenewingToken()).toBe('345');
    });

    it('returns from cache for auto renewable if not expired', function () {
        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE - 100;
        var err = '';
        var token = '';
        var callback = function (valErr, valToken) {
            err = valErr;
            token = valToken;
        };
        adal.acquireToken(RESOURCE1, callback);
        expect(token).toBe('access_token_in_cache' + RESOURCE1);
    });

    it('returns err msg if token expired and renew failed before', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.FAILED_RENEW, 'renew has failed');
        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE + 100;
        var err = '';
        var token = '';
        var callback = function (valErr, valToken) {
            err = valErr;
            token = valToken;
        };
        adal.acquireToken(RESOURCE1, callback);
        expect(err).toBe('renew has failed');
    });

    it('attempts to renew if token expired and renew is allowed', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.FAILED_RENEW, '');
        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE + 100;
        var err = '';
        var token = '';
        var callback = function (valErr, valToken) {
            err = valErr;
            token = valToken;
        };
        adal.acquireToken(RESOURCE1, callback);
        expect(adal.callback).toBe(callback);
        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.LOGIN_REQUEST)).toBe('');
        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.STATE_RENEW)).toBe('33333333-3333-4333-b333-333333333333');
        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.STATE_RENEW_RESOURCE)).toBe(RESOURCE1);
        expect(frameMock.src).toBe('https://login.windows.net/' + conf.tenant + '/oauth2/authorize?response_type=token&client_id=client&resource=default%20resource&redirect_uri=contoso_site&state=33333333-3333-4333-b333-333333333333&prompt=none');
    });

    it('prompts user if url is given', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.USERNAME, 'test user');
        spyOn(window.location, 'replace');
        adal.promptUser();
        expect(window.location.replace).not.toHaveBeenCalled();
        adal.promptUser("test");
        expect(window.location.replace).toHaveBeenCalled();
    });

    it('clears cache', function () {
        // Keys are stored for each resource to map tokens for resource
        storageFake.setItem(adal.CONSTANTS.STORAGE.TOKEN_KEYS, 'key1|key2|' + RESOURCE1 + '|');
        storageFake.setItem(adal.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + 'key1', 'value1');
        storageFake.setItem(adal.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + 'key2', 'value2');
        storageFake.setItem(adal.CONSTANTS.STORAGE.EXPIRATION_KEY, 3);
        storageFake.setItem(adal.CONSTANTS.STORAGE.EXPIRATION_KEY, 3);
        storageFake.setItem(adal.CONSTANTS.STORAGE.FAILED_RENEW, 'failed renew');
        storageFake.setItem(adal.CONSTANTS.STORAGE.SESSION_STATE, 'session_state');
        storageFake.setItem(adal.CONSTANTS.STORAGE.STATE_LOGIN, 'state login');
        storageFake.setItem(adal.CONSTANTS.STORAGE.STATE_RENEW, 'state renew');
        storageFake.setItem(adal.CONSTANTS.STORAGE.STATE_RENEW_RESOURCE, 'state renew resource');
        storageFake.setItem(adal.CONSTANTS.STORAGE.STATE_IDTOKEN, 'state idtoken');
        storageFake.setItem(adal.CONSTANTS.STORAGE.START_PAGE, 'start page');
        storageFake.setItem(adal.CONSTANTS.STORAGE.USERNAME, 'username');
        storageFake.setItem(adal.CONSTANTS.STORAGE.ERROR, 'error');
        storageFake.setItem(adal.CONSTANTS.STORAGE.ERROR_DESCRIPTION, 'error description');
        adal.clearCache();
        var store = storageFake.storeVerify();
        for (var prop in store) {
            expect((store[prop] === '' || store[prop] == 0 || !store[prop])).toBe(true);
        }
    });

    it('clears cache for a resource', function () {
        // Keys are stored for each resource to map tokens for resource
        storageFake.setItem(adal.CONSTANTS.STORAGE.TOKEN_KEYS, 'key1|' + RESOURCE1 + '|');
        storageFake.setItem(adal.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + 'key1', 'value1');
        storageFake.setItem(adal.CONSTANTS.STORAGE.EXPIRATION_KEY + 'key1', 3);
        storageFake.setItem(adal.CONSTANTS.STORAGE.FAILED_RENEW, 'failed renew');
        storageFake.setItem(adal.CONSTANTS.STORAGE.STATE_RENEW, 'state renew');
        storageFake.setItem(adal.CONSTANTS.STORAGE.STATE_IDTOKEN, 'state idtoken');
        storageFake.setItem(adal.CONSTANTS.STORAGE.ERROR, 'error');
        storageFake.setItem(adal.CONSTANTS.STORAGE.ERROR_DESCRIPTION, 'error description');
        adal.clearCacheForResource(RESOURCE1);
        var store = storageFake.storeVerify();
        for (var prop in store) {
            if (prop == adal.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + RESOURCE1 ||
               prop == adal.CONSTANTS.STORAGE.EXPIRATION_KEY + RESOURCE1) {
                expect((store[prop] === '' || store[prop] == 0 || !store[prop])).toBe(true);
            }
        }
        var item = adal.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + 'key1';
        expect((store[item] === '' || store[item] == 0 || !store[item])).toBe(false);
    });

    it('clears cache before logout', function () {
        adal.config.clientId = 'client';
        adal.config.redirectUri = 'contoso_site';
        spyOn(adal, 'clearCache');
        spyOn(adal, 'promptUser');
        adal.logOut();
        expect(adal.clearCache).toHaveBeenCalled();
        expect(adal.promptUser).toHaveBeenCalled();
    });

    it('has logout redirect if given', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.USERNAME, 'test user');
        adal.config.displayCall = null;
        adal.config.clientId = 'client';
        adal.config.tenant = "testtenant"
        adal.config.postLogoutRedirectUri = 'https://contoso.com/logout';
        spyOn(adal, 'promptUser');
        adal.logOut();
        expect(adal.promptUser).toHaveBeenCalledWith('https://login.windows.net/' + adal.config.tenant + '/oauth2/logout?post_logout_redirect_uri=https%3A%2F%2Fcontoso.com%2Flogout');
    });

    it('uses common for tenant if not given at logout redirect', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.USERNAME, 'test user');
        adal.config.displayCall = null;
        adal.config.clientId = 'client';
        delete adal.config.tenant;
        adal.config.postLogoutRedirectUri = 'https://contoso.com/logout';
        spyOn(adal, 'promptUser');
        adal.logOut();
        expect(adal.promptUser).toHaveBeenCalledWith('https://login.windows.net/common/oauth2/logout?post_logout_redirect_uri=https%3A%2F%2Fcontoso.com%2Flogout');
    });

    it('gets user from cache', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.USERNAME, 'test user from cache');
        adal.config.loginResource = RESOURCE1;
        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE - 100;
        var err = '';
        var user = '';
        var callback = function (valErr, valResult) {
            err = valErr;
            user = valResult;
        };
        spyOn(adal, 'getCachedToken').andCallThrough();
        adal.getUser(callback);
        expect(user).toBe('test user from cache');
        expect(adal.getCachedToken).toHaveBeenCalledWith(RESOURCE1);
    });

    it('has user but token is invalid', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.USERNAME, 'user1@contoso.com');
        adal.config.loginResource = RESOURCE1;
        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE + 100;
        var err = '';
        var user = '';
        var callback = function (valErr, valResult) {
            err = valErr;
            user = valResult;
        };
        spyOn(adal, 'getCachedToken').andCallThrough();
        adal.getUser(callback);
        expect(user).toBe(null);
        expect(err).toBe(adal.CONSTANTS.ERR_MESSAGES.NO_TOKEN);
        expect(adal.getCachedToken).toHaveBeenCalledWith(RESOURCE1);
    });

    it('has token but not user, so it navigates to get idtoken', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.USERNAME, '');
        adal.config.loginResource = RESOURCE1;
        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE - 100;
        adal.config.clientId = 'client';
        adal.config.tenant = "testtenant"
        var err = '';
        var user = '';
        var callback = function (valErr, valResult) {
            err = valErr;
            user = valResult;
        };
        spyOn(adal, 'getCachedToken').andCallThrough();

        adal.getUser(callback);
        // callback should not be called here
        // It will wait frame to be loaded and then receive callback
        expect(user).toBe('');
        expect(err).toBe('');
        expect(adal.getCachedToken).toHaveBeenCalledWith(RESOURCE1);
        expect(frameMock.src).toBe('https://login.windows.net/' + conf.tenant + '/oauth2/authorize?response_type=id_token&client_id=client&resource=default%20resource&redirect_uri=contoso_site&state=33333333-3333-4333-b333-333333333333&prompt=none&nonce=33333333-3333-4333-b333-333333333333');
    });

    // TODO idtoken handling
    // TODO iscallback
    // TOOD getrequestinfo
    // TODO savetokenfromhash
    // TODO getResourceForEndpoint
    // TODO angular intercepptor
    // TODO angular authenticaitonService
});

var env = jasmine.getEnv().execute();
