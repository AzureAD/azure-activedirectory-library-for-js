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
/* Directive tells jshint that it, describe are globals defined by jasmine */
/* global it */
/* global describe */
var atobHelper = require('atob');
var confighash = { hash: '#' };
global.window = {};
var AdalModule = require('../../../lib/adal.js');

describe('Adal', function () {
    var adal;
    global.Logging = global.window.Logging;
    var window = {
        location: {
            hash: '#hash',
            href: 'href',
            replace: function (val) {
            }
        },
        localStorage: {},
        sessionStorage: {},
        atob: atobHelper,
        innerWidth: 100,
        innerHeight: 100
    };
    var mathMock = {
        random: function () {
            return 0.2;
        },
        round: function (val) {
            return 1000;
        }
    };

    var mockFrames = {};

    var documentMock = {
        getElementById: function (frameId) {
            if (!mockFrames[frameId]) {
                mockFrames[frameId] = { src: 'start' };
            }
            return mockFrames[frameId];
        }
    };

    var angularMock = {};
    var conf = { loginResource: 'defaultResource', tenant: 'testtenant', clientId: 'e9a5a8b6-8af7-4719-9821-0deef255f68e' };
    var testPage = 'this is a song';
    var STORAGE_PREFIX = 'adal';
    var STORAGE_ACCESS_TOKEN_KEY = STORAGE_PREFIX + '.access.token.key';
    var STORAGE_EXPIRATION_KEY = STORAGE_PREFIX + '.expiration.key';
    var STORAGE_TOKEN_KEYS = STORAGE_PREFIX + '.token.keys';
    var RESOURCE1 = 'token.resource1';
    var SECONDS_TO_EXPIRE = 3600;
    var DEFAULT_INSTANCE = "https://login.microsoftonline.com/";
    var IDTOKEN_MOCK = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjVUa0d0S1JrZ2FpZXpFWTJFc0xDMmdPTGpBNCJ9.eyJhdWQiOiJlOWE1YThiNi04YWY3LTQ3MTktOTgyMS0wZGVlZjI1NWY2OGUiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLXBwZS5uZXQvNTJkNGIwNzItOTQ3MC00OWZiLTg3MjEtYmMzYTFjOTkxMmExLyIsImlhdCI6MTQxMTk1OTAwMCwibmJmIjoxNDExOTU5MDAwLCJleHAiOjE0MTE5NjI5MDAsInZlciI6IjEuMCIsInRpZCI6IjUyZDRiMDcyLTk0NzAtNDlmYi04NzIxLWJjM2ExYzk5MTJhMSIsImFtciI6WyJwd2QiXSwib2lkIjoiZmEzYzVmYTctN2Q5OC00Zjk3LWJmYzQtZGJkM2E0YTAyNDMxIiwidXBuIjoidXNlckBvYXV0aGltcGxpY2l0LmNjc2N0cC5uZXQiLCJ1bmlxdWVfbmFtZSI6InVzZXJAb2F1dGhpbXBsaWNpdC5jY3NjdHAubmV0Iiwic3ViIjoiWTdUbXhFY09IUzI0NGFHa3RjbWpicnNrdk5tU1I4WHo5XzZmbVc2NXloZyIsImZhbWlseV9uYW1lIjoiYSIsImdpdmVuX25hbWUiOiJ1c2VyIiwibm9uY2UiOiI4MGZmYTkwYS1jYjc0LTRkMGYtYTRhYy1hZTFmOTNlMzJmZTAiLCJwd2RfZXhwIjoiNTc3OTkxMCIsInB3ZF91cmwiOiJodHRwczovL3BvcnRhbC5taWNyb3NvZnRvbmxpbmUuY29tL0NoYW5nZVBhc3N3b3JkLmFzcHgifQ.WHsl8TH1rQ3dQbRkV0TS6GBVAxzNOpG3nGG6mpEBCwAOCbyW6qRsSoo4qq8I5IGyerDf2cvcS-zzatHEROpRC9dcpwkRm6ta5dFZuouFyZ_QiYVKSMwfzEC_FI-6p7eT8gY6FbV51bp-Ah_WKJqEmaXv-lqjIpgsMGeWDgZRlB9cPODXosBq-PEk0q27Be-_A-KefQacJuWTX2eEhECLyuAu-ETVJb7s19jQrs_LJXz_ISib4DdTKPa7XTBDJlVGdCI18ctB67XwGmGi8MevkeKqFI8dkykTxeJ0MXMmEQbE6Fw-gxmP7uJYbZ61Jqwsw24zMDMeXatk2VWMBPCuhA';
    var STATE = '33333333-3333-4333-b333-333333333333';
    var SESSION_STATE = '451c6916-27cf-4eae-81cd-accf96126398';
    var VALID_URLFRAGMENT = 'id_token=' + IDTOKEN_MOCK + '' + '&state=' + STATE + '&session_state=' + SESSION_STATE;
    var INVALID_URLFRAGMENT = 'id_token' + IDTOKEN_MOCK + '' + '&state=' + STATE + '&session_state=' + SESSION_STATE;
    var storageFake = function () {
        var store = {};
        return {
            getItem: function (key) {
                return store[key];
            },
            setItem: function (key, value) {
                if (typeof value != 'undefined') {
                    store[key] = value;
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
        storageFake.clear();
        storageFake.setItem(STORAGE_ACCESS_TOKEN_KEY + RESOURCE1, 'access_token_in_cache' + RESOURCE1);
        var secondsNow = mathMock.round(0);
        storageFake.setItem(STORAGE_EXPIRATION_KEY + RESOURCE1, secondsNow + SECONDS_TO_EXPIRE); // seconds to expire

        // add key
        storageFake.setItem(STORAGE_TOKEN_KEYS, RESOURCE1 + '|');

        window.localStorage = storageFake;
        window.sessionStorage = storageFake;
        // Init adal 

        global.window = window;
        global.localStorage = storageFake;
        global.sessionStorage = storageFake;
        global.document = documentMock;
        global.Math = mathMock;
        global.angular = angularMock;

        adal = new AdalModule.inject(conf);
        adal._user = null;
        adal._renewStates = [];
        adal._activeRenewals = {};
        adal.CONSTANTS.LOADFRAME_TIMEOUT = 800;
    });

    it('gets specific resource for defined endpoint mapping', function () {
        adal.config.endpoints = { 'a': 'resource for a' };
        expect(adal.getResourceForEndpoint('a')).toBe('resource for a');
        expect(adal.getResourceForEndpoint('b')).toBe(adal.config.loginResource);
    });

    it('gets default resource for empty endpoint mapping', function () {
        adal.config.endpoints = null;
        expect(adal.getResourceForEndpoint('a')).toBe('defaultResource');
        expect(adal.getResourceForEndpoint('b')).toBe('defaultResource');
    });

    it('gets null resource for annonymous endpoints', function () {
        adal.config.anonymousEndpoints = ['app/views'];
        expect(adal.getResourceForEndpoint('app/views')).toBe(null);
        expect(adal.getResourceForEndpoint('app/views/abc')).toBe(null);
        expect(adal.getResourceForEndpoint('default/app/views/abc')).toBe(null);
        expect(adal.getResourceForEndpoint('app/home')).toBe('defaultResource');
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
        storageFake.setItem(adal.CONSTANTS.STORAGE.IDTOKEN, IDTOKEN_MOCK);
        expect(adal.getCachedUser().userName).toBe('user@oauthimplicit.ccsctp.net');
    });

    it('navigates user to login by default', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.USERNAME, 'test user');
        adal.config.displayCall = null;
        adal.config.clientId = 'client';
        adal.config.redirectUri = 'contoso_site';
        spyOn(adal, 'promptUser');
        adal.login();
        expect(adal.promptUser).toHaveBeenCalledWith(DEFAULT_INSTANCE + conf.tenant + '/oauth2/authorize?response_type=id_token&client_id=client&redirect_uri=contoso_site&state=33333333-3333-4333-b333-333333333333'
            + '&client-request-id=33333333-3333-4333-b333-333333333333' + adal._addLibMetadata() + '&nonce=33333333-3333-4333-b333-333333333333');
        expect(adal.config.state).toBe('33333333-3333-4333-b333-333333333333');
    });

    it('sets loginprogress to true for login', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.USERNAME, 'test user');
        adal.config.displayCall = null;
        adal.config.clientId = 'client';
        adal.config.redirectUri = 'contoso_site';
        adal.login();
        expect(adal.loginInProgress()).toBe(true);
    });

    it('calls displaycall if given for login', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.USERNAME, 'test user');
        adal._loginInProgress = false;
        adal.config.clientId = 'client';
        adal.config.redirectUri = 'contoso_site';
        var urlToGo = '';
        var displayCallback = function (url) {
            urlToGo = url;
        };
        adal.config.displayCall = displayCallback;
        spyOn(adal.config, 'displayCall');
        adal.login();
        expect(adal.config.displayCall).toHaveBeenCalledWith(DEFAULT_INSTANCE + conf.tenant + '/oauth2/authorize?response_type=id_token&client_id=client&redirect_uri=contoso_site&state=33333333-3333-4333-b333-333333333333'
            + '&client-request-id=33333333-3333-4333-b333-333333333333'
            + adal._addLibMetadata()
            + '&nonce=33333333-3333-4333-b333-333333333333'
            );
        expect(adal.config.state).toBe('33333333-3333-4333-b333-333333333333');
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

    it('returns error for acquireToken without resource', function () {
        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE - 100;
        var err = '';
        var token = '';
        var callback = function (valErr, valToken) {
            err = valErr;
            token = valToken;
        };
        adal.acquireToken(null, callback);
        expect(err).toBe('resource is required');
    });

    it('attempts to renew if token expired and renew is allowed', function () {
        adal.config.redirectUri = 'contoso_site';
        adal.config.clientId = 'client';
        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE + 100;
        var err = '';
        var token = '';
        var callback = function (valErr, valToken) {
            err = valErr;
            token = valToken;
        };
        adal._renewStates = [];
        adal._user = { profile: { 'upn': 'test@testuser.com' }, userName: 'test@domain.com' };
        adal.acquireToken(RESOURCE1, callback);
        expect(adal.callback).toBe(null);
        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.LOGIN_REQUEST)).toBe('');
        expect(adal._renewStates.length).toBe(1);
        // Wait for initial timeout load
        console.log('Waiting for initial timeout');
        waitsFor(function () {
            return mockFrames['adalRenewFrame' + RESOURCE1].src !== 'about:blank';
        }, 'iframe src not updated', 2000);

        runs(function () {
            expect(mockFrames['adalRenewFrame' + RESOURCE1].src).toBe(DEFAULT_INSTANCE + conf.tenant + '/oauth2/authorize?response_type=token&client_id=client&resource=' + RESOURCE1 + '&redirect_uri=contoso_site&state=33333333-3333-4333-b333-333333333333%7Ctoken.resource1'
                + '&client-request-id=33333333-3333-4333-b333-333333333333' + adal._addLibMetadata() + '&prompt=none&login_hint=test%40testuser.com&domain_hint=testuser.com');
        });

    });

    //Necessary for integration with Angular when multiple http calls are queued.
    it('allows multiple callers to be notified when the token is renewed', function () {
        adal.config.redirectUri = 'contoso_site';
        adal.config.clientId = 'client';
        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE + 100;
        var err = null;
        var token = null;
        var err2 = null;
        var token2 = null;
        var callback = function (valErr, valToken) {
            err = valErr;
            token = valToken;
        };
        var callback2 = function (valErr, valToken) {
            err2 = valErr;
            token2 = valToken;
        };

        adal._renewStates = [];
        adal._user = { profile: { 'upn': 'test@testuser.com' }, userName: 'test@domain.com' };
        adal.acquireToken(RESOURCE1, callback);
        //Simulate second acquire i.e. second service call from Angular.
        adal.acquireToken(RESOURCE1, callback2);
        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.LOGIN_REQUEST)).toBe('');
        expect(adal._renewStates.length).toBe(1);
        // Wait for initial timeout load
        console.log('Waiting for initial timeout');
        waitsFor(function () {
            return mockFrames['adalRenewFrame' + RESOURCE1].src !== 'about:blank';
        }, 'iframe src not updated', 2000);

        runs(function () {
            expect(mockFrames['adalRenewFrame' + RESOURCE1].src).toBe(DEFAULT_INSTANCE + conf.tenant + '/oauth2/authorize?response_type=token&client_id=client&resource=' + RESOURCE1 + '&redirect_uri=contoso_site&state=33333333-3333-4333-b333-333333333333%7Ctoken.resource1'
                + '&client-request-id=33333333-3333-4333-b333-333333333333' + adal._addLibMetadata() + '&prompt=none&login_hint=test%40testuser.com&domain_hint=testuser.com');
        });

        //Simulate callback from the frame.
        //adal.callback(null, '33333333-3333-4333-b333-333333333333');
        window.callBackMappedToRenewStates[adal.config.state](null, '33333333-3333-4333-b333-333333333333');
        //Both callbacks should have been provided with the token.
        expect(token).toBe('33333333-3333-4333-b333-333333333333', 'First callback should be called');
        expect(token2).toBe('33333333-3333-4333-b333-333333333333', 'Second callback should be called');

    });

    it('check guid masking', function () {
        // masking is required for ver4 guid at begining hex  after version block
        // 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
        mathMock.random = function () {
            return 0.1;
        };
        // 1->0001 after masked with & 0011 | 1000  1001
        expect(adal._guid()).toBe('11111111-1111-4111-9111-111111111111');
        mathMock.random = function () {
            return 0.3;
        };
        // 4->0100 after masked with & 0011 | 1000  1000
        expect(adal._guid()).toBe('44444444-4444-4444-8444-444444444444');
        mathMock.random = function () {
            return 0.99;
        };
        // 15->1111 after masked with & 0011 | 1000  1011
        expect(adal._guid()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');

        mathMock.random = function () {
            return 0.9;
        };
        // 14->1110 after masked with & 0011 | 1000  1010
        expect(adal._guid()).toBe('eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee');
        mathMock.random = function () {
            return 0.2;
        };
        // 3->0011 after masked with & 0011 | 1000  1011
        expect(adal._guid()).toBe('33333333-3333-4333-b333-333333333333');
    });

    it('prompts user if url is given', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.USERNAME, 'test user');
        spyOn(window.location, 'replace');
        adal.promptUser();
        expect(window.location.replace).not.toHaveBeenCalled();
        adal.promptUser('test');
        expect(window.location.replace).toHaveBeenCalled();
    });

    it('clears cache', function () {
        // Keys are stored for each resource to map tokens for resource
        storageFake.setItem(adal.CONSTANTS.STORAGE.TOKEN_KEYS, 'key1|key2|' + RESOURCE1 + '|');
        storageFake.setItem(adal.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + 'key1', 'value1');
        storageFake.setItem(adal.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + 'key2', 'value2');
        storageFake.setItem(adal.CONSTANTS.STORAGE.EXPIRATION_KEY, 3);
        storageFake.setItem(adal.CONSTANTS.STORAGE.EXPIRATION_KEY, 3);
        storageFake.setItem(adal.CONSTANTS.STORAGE.SESSION_STATE, 'session_state');
        storageFake.setItem(adal.CONSTANTS.STORAGE.STATE_LOGIN, 'state login');
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
        storageFake.setItem(adal.CONSTANTS.STORAGE.STATE_RENEW, 'state renew');
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
        adal.config.tenant = 'testtenant'
        adal.config.postLogoutRedirectUri = 'https://contoso.com/logout';
        spyOn(adal, 'promptUser');
        adal.logOut();
        expect(adal.promptUser).toHaveBeenCalledWith(DEFAULT_INSTANCE + adal.config.tenant + '/oauth2/logout?post_logout_redirect_uri=https%3A%2F%2Fcontoso.com%2Flogout');
    });

    it('uses common for tenant if not given at logout redirect', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.USERNAME, 'test user');
        adal.config.displayCall = null;
        adal.config.clientId = 'client';
        delete adal.config.tenant;
        adal.config.postLogoutRedirectUri = 'https://contoso.com/logout';
        spyOn(adal, 'promptUser');
        adal.logOut();
        expect(adal.promptUser).toHaveBeenCalledWith(DEFAULT_INSTANCE + 'common/oauth2/logout?post_logout_redirect_uri=https%3A%2F%2Fcontoso.com%2Flogout');
    });

    it('gets user from cache', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.IDTOKEN, IDTOKEN_MOCK);
        adal.config.clientId = 'e9a5a8b6-8af7-4719-9821-0deef255f68e';
        adal.config.loginResource = RESOURCE1;
        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE - 100;
        var err = '';
        var user = {};
        var callback = function (valErr, valResult) {
            err = valErr;
            user = valResult;
        };
        spyOn(adal, 'getCachedToken').andCallThrough();
        adal.getUser(callback);
        expect(adal.getCachedToken).not.toHaveBeenCalledWith(RESOURCE1);
        expect(user.userName).toBe('user@oauthimplicit.ccsctp.net');
    });

    it('is callback if has error or access token or idtoken', function () {
        expect(adal.isCallback('not a callback')).toBe(false);
        expect(adal.isCallback('#error_description=someting_wrong')).toBe(true);
        expect(adal.isCallback('#/error_description=someting_wrong')).toBe(true);
        expect(adal.isCallback('#access_token=token123')).toBe(true);
        expect(adal.isCallback('#id_token=idtoken234')).toBe(true);
    });

    it('gets login error if any recorded', function () {
        storageFake.setItem(adal.CONSTANTS.STORAGE.LOGIN_ERROR, '');
        expect(adal.getLoginError()).toBe('');
        storageFake.setItem(adal.CONSTANTS.STORAGE.LOGIN_ERROR, 'err');
        expect(adal.getLoginError()).toBe('err');
    });

    it('gets request info from hash', function () {
        var requestInfo = adal.getRequestInfo('invalid');
        expect(requestInfo.valid).toBe(false);
        requestInfo = adal.getRequestInfo('#error_description=someting_wrong');
        expect(requestInfo.valid).toBe(true);
        expect(requestInfo.stateResponse).toBe('');

        requestInfo = adal.getRequestInfo('#error_description=someting_wrong&state=1232');
        expect(requestInfo.valid).toBe(true);
        expect(requestInfo.stateResponse).toBe('1232');
        expect(requestInfo.stateMatch).toBe(false);

        checkStateType(adal.CONSTANTS.STORAGE.STATE_LOGIN, '1234', adal.REQUEST_TYPE.LOGIN);
    });

    var checkStateType = function (state, stateExpected, requestType) {
        storageFake.setItem(state, stateExpected);
        adal._renewStates.push(stateExpected);
        var requestInfo = adal.getRequestInfo('#error_description=someting_wrong&state=' + stateExpected);
        expect(requestInfo.valid).toBe(true);
        expect(requestInfo.stateResponse).toBe(stateExpected);
        expect(requestInfo.stateMatch).toBe(true);
        expect(requestInfo.requestType).toBe(requestType);
        storageFake.setItem(state, '');
    }

    it('saves errors token from callback', function () {
        var requestInfo = {
            valid: false,
            parameters: { 'error_description': 'error description', 'error': 'invalid' },
            stateMatch: false,
            stateResponse: '',
            requestType: adal.REQUEST_TYPE.UNKNOWN
        };
        adal.saveTokenFromHash(requestInfo);

        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.ERROR)).toBe('invalid');
        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.ERROR_DESCRIPTION)).toBe('error description');
    });

    it('saves token if state matches', function () {
        var requestInfo = {
            valid: true,
            parameters: { 'access_token': 'token123', 'state': '123' },
            stateMatch: true,
            stateResponse: '123|loginResource1',
            requestType: adal.REQUEST_TYPE.RENEW_TOKEN
        };
        adal.saveTokenFromHash(requestInfo);

        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.ACCESS_TOKEN_KEY + 'loginResource1')).toBe('token123');
    });

    it('saves expiry if state matches', function () {
        var requestInfo = {
            valid: true,
            parameters: { 'access_token': 'token123', 'state': '123', 'expires_in': 3589 },
            stateMatch: true,
            stateResponse: '123|loginResource1',
            requestType: adal.REQUEST_TYPE.RENEW_TOKEN
        };
        adal.saveTokenFromHash(requestInfo);
        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.EXPIRATION_KEY + 'loginResource1')).toBe(mathMock.round(1) + 3589);
    });

    it('saves username after extracting idtoken', function () {
        var requestInfo = {
            valid: true,
            parameters: {
                'id_token': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjVUa0d0S1JrZ2FpZXpFWTJFc0xDMmdPTGpBNCJ9.eyJhdWQiOiJlOWE1YThiNi04YWY3LTQ3MTktOTgyMS0wZGVlZjI1NWY2OGUiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLXBwZS5uZXQvNTJkNGIwNzItOTQ3MC00OWZiLTg3MjEtYmMzYTFjOTkxMmExLyIsImlhdCI6MTQxMTk2MDkwMiwibmJmIjoxNDExOTYwOTAyLCJleHAiOjE0MTE5NjQ4MDIsInZlciI6IjEuMCIsInRpZCI6IjUyZDRiMDcyLTk0NzAtNDlmYi04NzIxLWJjM2ExYzk5MTJhMSIsImFtciI6WyJwd2QiXSwib2lkIjoiZmEzYzVmYTctN2Q5OC00Zjk3LWJmYzQtZGJkM2E0YTAyNDMxIiwidXBuIjoidXNlckBvYXV0aGltcGxpY2l0LmNjc2N0cC5uZXQiLCJ1bmlxdWVfbmFtZSI6InVzZXJAb2F1dGhpbXBsaWNpdC5jY3NjdHAubmV0Iiwic3ViIjoiWTdUbXhFY09IUzI0NGFHa3RjbWpicnNrdk5tU1I4WHo5XzZmbVc2NXloZyIsImZhbWlseV9uYW1lIjoiYSIsImdpdmVuX25hbWUiOiJ1c2VyIiwibm9uY2UiOiIxOWU2N2IyNC1jZDk5LTQ1YjYtYTU4OC04NDBlM2Y4ZjJhNzAiLCJwd2RfZXhwIjoiNTc3ODAwOCIsInB3ZF91cmwiOiJodHRwczovL3BvcnRhbC5taWNyb3NvZnRvbmxpbmUuY29tL0NoYW5nZVBhc3N3b3JkLmFzcHgifQ.GzbTwMXhjs4uJFogd1B46C_gKX6uZ4BfgJIpzFS-n-HRXEWeKdZWboRC_-C4UnEy6G9kR6vNFq7zi3DY1P8uf1lUavdOFUE27xNY1McN1Vjm6HKxKNYOLU549-wIb6SSfGVycdyskdJfplf5VRasMGclwHlY0l9bBCTaPunjhfcg-mQmGKND-aO0B54EGhdGs740NiLMCh6kNXbp1WAv7V6Yn408qZEIsOQoPO0dW-wO54DTqpbLtqiwae0pk0hDxXWczaUPxR_wcz0f3TgF42iTp-j5bXTf2GOP1VPZtN9PtdjcjDIfZ6ihAVZCEDB_Y9czHv7et0IvB1bzRWP6bQ',
                'state': '123'
            },
            stateMatch: true,
            stateResponse: '123',
            requestType: adal.REQUEST_TYPE.ID_TOKEN
        };
        storageFake.setItem(adal.CONSTANTS.STORAGE.NONCE_IDTOKEN, '19e67b24-cd99-45b6-a588-840e3f8f2a70');
        adal.config.clientId = conf.clientId;
        adal._user = null;
        adal.saveTokenFromHash(requestInfo);
        var cachedUser = adal.getCachedUser();
        expect(cachedUser.userName).toBe('user@oauthimplicit.ccsctp.net');
        expect(cachedUser.profile.upn).toBe('user@oauthimplicit.ccsctp.net');
    });

    it('does not save user for invalid nonce in idtoken', function () {
        var requestInfo = {
            valid: true,
            parameters: {
                'id_token': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjVUa0d0S1JrZ2FpZXpFWTJFc0xDMmdPTGpBNCJ9.eyJhdWQiOiJlOWE1YThiNi04YWY3LTQ3MTktOTgyMS0wZGVlZjI1NWY2OGUiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLXBwZS5uZXQvNTJkNGIwNzItOTQ3MC00OWZiLTg3MjEtYmMzYTFjOTkxMmExLyIsImlhdCI6MTQxMTk2MDkwMiwibmJmIjoxNDExOTYwOTAyLCJleHAiOjE0MTE5NjQ4MDIsInZlciI6IjEuMCIsInRpZCI6IjUyZDRiMDcyLTk0NzAtNDlmYi04NzIxLWJjM2ExYzk5MTJhMSIsImFtciI6WyJwd2QiXSwib2lkIjoiZmEzYzVmYTctN2Q5OC00Zjk3LWJmYzQtZGJkM2E0YTAyNDMxIiwidXBuIjoidXNlckBvYXV0aGltcGxpY2l0LmNjc2N0cC5uZXQiLCJ1bmlxdWVfbmFtZSI6InVzZXJAb2F1dGhpbXBsaWNpdC5jY3NjdHAubmV0Iiwic3ViIjoiWTdUbXhFY09IUzI0NGFHa3RjbWpicnNrdk5tU1I4WHo5XzZmbVc2NXloZyIsImZhbWlseV9uYW1lIjoiYSIsImdpdmVuX25hbWUiOiJ1c2VyIiwibm9uY2UiOiIxOWU2N2IyNC1jZDk5LTQ1YjYtYTU4OC04NDBlM2Y4ZjJhNzAiLCJwd2RfZXhwIjoiNTc3ODAwOCIsInB3ZF91cmwiOiJodHRwczovL3BvcnRhbC5taWNyb3NvZnRvbmxpbmUuY29tL0NoYW5nZVBhc3N3b3JkLmFzcHgifQ.GzbTwMXhjs4uJFogd1B46C_gKX6uZ4BfgJIpzFS-n-HRXEWeKdZWboRC_-C4UnEy6G9kR6vNFq7zi3DY1P8uf1lUavdOFUE27xNY1McN1Vjm6HKxKNYOLU549-wIb6SSfGVycdyskdJfplf5VRasMGclwHlY0l9bBCTaPunjhfcg-mQmGKND-aO0B54EGhdGs740NiLMCh6kNXbp1WAv7V6Yn408qZEIsOQoPO0dW-wO54DTqpbLtqiwae0pk0hDxXWczaUPxR_wcz0f3TgF42iTp-j5bXTf2GOP1VPZtN9PtdjcjDIfZ6ihAVZCEDB_Y9czHv7et0IvB1bzRWP6bQ',
                'state': '123'
            },
            stateMatch: true,
            stateResponse: '123',
            requestType: adal.REQUEST_TYPE.ID_TOKEN
        };
        adal.config.clientId = conf.clientId;
        adal._user = null;
        adal.saveTokenFromHash(requestInfo);
        expect(adal.getCachedUser()).toBe(null);
    });


    it('saves null for username if idtoken is invalid', function () {
        var requestInfo = {
            valid: true,
            parameters: {
                'id_token': 'invalid',
                'state': '123'
            },
            stateMatch: true,
            stateResponse: '123',
            requestType: adal.REQUEST_TYPE.ID_TOKEN
        };
        adal.config.loginResource = 'loginResource1';
        adal.saveTokenFromHash(requestInfo);

        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.USERNAME)).toBeUndefined();
    });

    it('saves null for username if idtoken is invalid', function () {
        var requestInfo = {
            valid: true,
            parameters: {
                'id_token': 'invalid',
                'state': '123'
            },
            stateMatch: true,
            stateResponse: '123',
            requestType: adal.REQUEST_TYPE.ID_TOKEN
        };
        adal.config.loginResource = 'loginResource1';
        adal.saveTokenFromHash(requestInfo);

        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.USERNAME)).toBeUndefined();
    });

    it('test decode with no padding', function () {
        expect(adal._decode('ZGVjb2RlIHRlc3Rz')).toBe('decode tests');
    });

    it('test decode with one = padding', function () {
        expect(adal._decode('ZWNvZGUgdGVzdHM=')).toBe('ecode tests');
    });

    it('test decode with two == padding', function () {
        expect(adal._decode('Y29kZSB0ZXN0cw==')).toBe('code tests');
    })

    it('test decode throw error', function () {
        try {
            adal._decode('YW55I');
        } catch (e) {
            expect(e.message).toBe('The token to be decoded is not correctly encoded.');
        }
    });

    it('test get resource for endpoint from app backend', function () {
        adal.config.redirectUri = 'https://host.com/page';
        expect(adal.getResourceForEndpoint('https://host.com')).toBe(adal.config.loginResource);
        expect(adal.getResourceForEndpoint('https://host.com/a/b')).toBe(adal.config.loginResource);
        expect(adal.getResourceForEndpoint('https://host.com/page/')).toBe(adal.config.loginResource);
        expect(adal.getResourceForEndpoint('https://notapp.com/page/')).toBe(null);
        expect(adal.getResourceForEndpoint('/api/todo')).toBe(adal.config.loginResource);
    });

    it('test host extraction', function () {
        expect(adal._getHostFromUri('https://a.com/b/c')).toBe('a.com');
        expect(adal._getHostFromUri('http://a.com')).toBe('a.com');
        expect(adal._getHostFromUri('a.com/b/c')).toBe('a.com');
        expect(adal._getHostFromUri('http://a.com/')).toBe('a.com');
        expect(adal._getHostFromUri('http://localhost:8080')).toBe('localhost:8080');
    });

    it('test decode jwt', function () {
        expect(adal._decodeJwt('')).toBe(null);
        expect(adal._decodeJwt(null)).toBe(null);
    })

    it('saves error if state mismatch', function () {
        var requestInfo = {
            valid: true,
            parameters: { 'access_token': 'token123', 'state': '123' },
            stateMatch: false,
            stateResponse: '64532',
            requestType: adal.REQUEST_TYPE.UNKNOWN
        };
        adal.config.loginResource = 'loginResource1';
        adal.saveTokenFromHash(requestInfo);

        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.ERROR_DESCRIPTION)).toBe('Invalid_state. state: ' + requestInfo.stateResponse);
    });

    it('checks if Logging is defined on window', function () {
        Logging.level = 2;
        Logging.log = function (message) {
            window.logMessage = message;
        }
        adal.promptUser();
        expect(window.logMessage).toContain("Navigate url is empty");
        expect(Logging.level).toEqual(2);
    });

    it('tests the load frame timeout method', function () {
        adal._loadFrameTimeout('urlnavigation', 'frameName', RESOURCE1);
        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.RENEW_STATUS + RESOURCE1)).toBe(adal.CONSTANTS.TOKEN_RENEW_STATUS_IN_PROGRESS);

        // timeout interval passed
        waitsFor(function () {
            return storageFake.getItem(adal.CONSTANTS.STORAGE.RENEW_STATUS + RESOURCE1) === adal.CONSTANTS.TOKEN_RENEW_STATUS_CANCELED;
        }, 'token renew status not updated', 1000);

        runs(function () {
            expect(storageFake.getItem(adal.CONSTANTS.STORAGE.RENEW_STATUS + RESOURCE1)).toBe(adal.CONSTANTS.TOKEN_RENEW_STATUS_CANCELED);

            adal._loadFrameTimeout('urlnavigation', 'frameName', RESOURCE1);
            expect(storageFake.getItem(adal.CONSTANTS.STORAGE.RENEW_STATUS + RESOURCE1)).toBe(adal.CONSTANTS.TOKEN_RENEW_STATUS_IN_PROGRESS);
            var requestInfo = {
                valid: true,
                parameters: { 'access_token': 'token123', 'state': '123', 'expires_in': '23' },
                stateMatch: true,
                stateResponse: '64532|' + RESOURCE1,
                requestType: adal.REQUEST_TYPE.RENEW_TOKEN
            };
            adal.saveTokenFromHash(requestInfo);
            expect(storageFake.getItem(adal.CONSTANTS.STORAGE.RENEW_STATUS + RESOURCE1)).toBe(adal.CONSTANTS.TOKEN_RENEW_STATUS_COMPLETED);
        });
    });

    it('tests that callbacks are called when renewal token request was canceled', function () {
        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE + 100;
        var err = '';
        var token = '';
        var callback = function (valErr, valToken) {
            err = valErr;
            token = valToken;
        };
        adal._renewStates = [];
        adal._user = { userName: 'test@testuser.com' };
        adal.acquireToken(RESOURCE1, callback);
        waitsFor(function () {
            return storageFake.getItem(adal.CONSTANTS.STORAGE.RENEW_STATUS + RESOURCE1) === adal.CONSTANTS.TOKEN_RENEW_STATUS_CANCELED;
        }, 'token renew status not updated', 1000);
        runs(function () {
            expect(storageFake.getItem(adal.CONSTANTS.STORAGE.RENEW_STATUS + RESOURCE1)).toBe(adal.CONSTANTS.TOKEN_RENEW_STATUS_CANCELED);
            expect(err).toBe('Token renewal operation failed due to timeout');
            expect(token).toBe(null);

        });
    });

    it('attempts to renewidToken if token expired and renew is allowed', function () {
        adal.config.redirectUri = 'contoso_site';
        adal.config.clientId = 'client';
        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE + 100;
        adal.config.tenant = 'testtenant';
        var err = '';
        var token = '';
        var callback = function (valErr, valToken) {
            err = valErr;
            token = valToken;
        };
        adal._renewStates = [];
        adal._user = { profile: { 'upn': 'test@testuser.com' }, userName: 'test@domain.com' };
        adal.acquireToken(adal.config.clientId, callback);
        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.NONCE_IDTOKEN)).toBe('33333333-3333-4333-b333-333333333333');
        expect(adal.config.state).toBe('33333333-3333-4333-b333-333333333333' + '|' + 'client');
        expect(adal._renewStates.length).toBe(1);
        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.LOGIN_REQUEST)).toBe('');
        // Wait for initial timeout load
        console.log('Waiting for initial timeout');
        waitsFor(function () {
            return mockFrames['adalIdTokenFrame'].src !== 'about:blank';
        }, 'iframe src not updated', 2000);

        runs(function () {
            expect(mockFrames['adalIdTokenFrame'].src).toBe(DEFAULT_INSTANCE + conf.tenant + '/oauth2/authorize?response_type=id_token&client_id=' + adal.config.clientId + '&redirect_uri=contoso_site&state=33333333-3333-4333-b333-333333333333%7Cclient'
    		+ '&client-request-id=33333333-3333-4333-b333-333333333333' + adal._addLibMetadata() + '&prompt=none&login_hint=test%40testuser.com&domain_hint=testuser.com' + '&nonce=33333333-3333-4333-b333-333333333333');
        });
    });

    it('tests handleWindowCallback function for RENEW_TOKEN', function () {
        window.location.hash = '#/id_token=' + IDTOKEN_MOCK;
        var _getRequestInfo = adal.getRequestInfo;
        adal.getRequestInfo = function (hash) {
            return {
                valid: true,
                parameters: { 'error_description': 'error description', 'error': 'invalid', 'id_token': IDTOKEN_MOCK, 'session_state': '61ae5247-eaf8-4496-a667-32b0acbad7a0', 'state': '19537a2a-e9e7-489d-ae7d-3eefab9e4137' },
                stateMatch: true,
                stateResponse: '19537a2a-e9e7-489d-ae7d-3eefab9e4137',
                requestType: adal.REQUEST_TYPE.RENEW_TOKEN
            };
        };
        var err = '';
        var token = '';
        var callback = function (valErr, valToken) {
            err = valErr;
            token = valToken;
        };
        window.parent = {};
        window.parent.callBackMappedToRenewStates = {};
        window.parent.callBackMappedToRenewStates[adal.getRequestInfo().stateResponse] = callback;
        adal.handleWindowCallback();
        expect(err).toBe('error description');
        expect(token).toBe(IDTOKEN_MOCK);
        adal.getRequestInfo = _getRequestInfo;

    });

    it('tests handleWindowCallback function for LOGIN_REQUEST', function () {
        window.location = {};
        window.location.hash = '#/id_token=' + IDTOKEN_MOCK;
        var _getRequestInfo = adal.getRequestInfo;
        adal.getRequestInfo = function () {
            return {
                valid: true,
                parameters: { 'error_description': 'error description', 'error': 'invalid', 'id_token': IDTOKEN_MOCK, 'session_state': '61ae5247-eaf8-4496-a667-32b0acbad7a0', 'state': '19537a2a-e9e7-489d-ae7d-3eefab9e4137' },
                stateMatch: true,
                stateResponse: '19537a2a-e9e7-489d-ae7d-3eefab9e4137',
                requestType: adal.REQUEST_TYPE.LOGIN_REQUEST
            };
        };
        storageFake.setItem(adal.CONSTANTS.STORAGE.LOGIN_REQUEST, "www.test.com");
        window.oauth2Callback = {};
        adal.handleWindowCallback();
        expect(window.location).toBe('www.test.com');
        adal.getRequestInfo = _getRequestInfo;

    });

    it('use the same correlationId for each request sent to AAD if set by user', function () {
        adal.config.correlationId = '33333333-3333-4333-b333-333333333333';
        adal.config.redirectUri = 'contoso_site';
        adal.config.clientId = 'client';
        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE + 100;
        var callback = function () {
        };
        adal._renewStates = [];
        adal._user = { profile: { 'upn': 'test@testuser.com' }, userName: 'test@domain.com' };
        spyOn(adal, '_loadFrameTimeout');
        adal.acquireToken(RESOURCE1, callback);
        expect(adal._loadFrameTimeout).toHaveBeenCalledWith(DEFAULT_INSTANCE + conf.tenant + '/oauth2/authorize?response_type=token&client_id=client&resource=' + RESOURCE1 + '&redirect_uri=contoso_site&state=33333333-3333-4333-b333-333333333333%7Ctoken.resource1'
                + '&client-request-id=33333333-3333-4333-b333-333333333333' + adal._addLibMetadata() + '&prompt=none&login_hint=test%40testuser.com&domain_hint=testuser.com', 'adalRenewFrametoken.resource1', 'token.resource1');

        adal._activeRenewals = {};
        adal._user = { profile: { 'sub': 'test@testuser.com' }, userName: 'test@domain.com' };
        adal.acquireToken(RESOURCE1, callback);
        expect(adal._loadFrameTimeout).toHaveBeenCalledWith(DEFAULT_INSTANCE + conf.tenant + '/oauth2/authorize?response_type=token&client_id=client&resource=' + RESOURCE1 + '&redirect_uri=contoso_site&state=33333333-3333-4333-b333-333333333333%7Ctoken.resource1'
                + '&client-request-id=33333333-3333-4333-b333-333333333333' + adal._addLibMetadata() + '&prompt=none', 'adalRenewFrametoken.resource1', 'token.resource1');
    });

    it('generates new correlationId for each request sent to AAD if not set by user', function () {
        adal.config.correlationId = null;
        adal.config.redirectUri = 'contoso_site';
        adal.config.clientId = 'client';
        adal.config.expireOffsetSeconds = SECONDS_TO_EXPIRE + 100;
        var callback = function () {
        };
        adal._renewStates = [];
        adal._user = { profile: { 'upn': 'test@testuser.com' }, userName: 'test@domain.com' };
        mathMock.random = function () {
            return 0.1;
        };
        spyOn(adal, '_loadFrameTimeout');
        adal.acquireToken(RESOURCE1, callback);
        expect(adal._loadFrameTimeout).toHaveBeenCalledWith(DEFAULT_INSTANCE + conf.tenant + '/oauth2/authorize?response_type=token&client_id=client&resource=' + RESOURCE1 + '&redirect_uri=contoso_site&state=11111111-1111-4111-9111-111111111111%7Ctoken.resource1'
                + '&client-request-id=11111111-1111-4111-9111-111111111111' + adal._addLibMetadata() + '&prompt=none&login_hint=test%40testuser.com&domain_hint=testuser.com', 'adalRenewFrametoken.resource1', 'token.resource1');

        mathMock.random = function () {
            return 0.3;
        };
        adal._activeRenewals = {};
        adal._user = { profile: { 'sub': 'test@testuser.com' }, userName: 'test@domain.com' };
        adal.acquireToken(RESOURCE1, callback);
        expect(adal._loadFrameTimeout).toHaveBeenCalledWith(DEFAULT_INSTANCE + conf.tenant + '/oauth2/authorize?response_type=token&client_id=client&resource=' + RESOURCE1 + '&redirect_uri=contoso_site&state=44444444-4444-4444-8444-444444444444%7Ctoken.resource1'
                + '&client-request-id=44444444-4444-4444-8444-444444444444' + adal._addLibMetadata() + '&prompt=none', 'adalRenewFrametoken.resource1', 'token.resource1');

    });

    it('checks the deserialize method for extracting idToken', function () {
        var obj = adal._deserialize(VALID_URLFRAGMENT);
        expect(obj.id_token).toBe(IDTOKEN_MOCK);
        expect(obj.state).toBe(STATE);
        expect(obj.session_state).toBe(SESSION_STATE);

        obj = adal._deserialize(INVALID_URLFRAGMENT);
        expect(obj.id_token).toBeUndefined;
        expect(obj.state).toBe(STATE);
        expect(obj.session_state).toBe(SESSION_STATE);
        expect(obj['id_token' + IDTOKEN_MOCK]).toBeUndefined;
        var deserialize = adal._deserialize;//save initial state of function

        adal._deserialize = function (query) {
            var match,
            pl = /\+/g,  // Regex for replacing addition symbol with a space
            search = /([^&=]+)=?([^&]*)/g,
            decode = function (s) {
                return decodeURIComponent(s.replace(pl, ' '));
            },
            obj = {};
            match = search.exec(query);
            while (match) {
                obj[decode(match[1])] = decode(match[2]);
                match = search.exec(query);
            }

            return obj;
        }
        obj = adal._deserialize(INVALID_URLFRAGMENT);
        expect(obj['id_token' + IDTOKEN_MOCK]).toBe('');//This additional property is parsed because of ? operator in regex
        expect(obj.id_token).toBeUndefined;
        expect(obj.state).toBe(STATE);
        expect(obj.session_state).toBe(SESSION_STATE);
        adal._deserialize = deserialize;//reassign state to original function
    });

    it('tests if callback is called after login, if popup window is null', function () {
        adal.popUp = true;
        adal.config.clientId = 'client';
        adal.config.redirectUri = 'contoso_site';
        var err;
        var token;
        var callback = function (valErr, valToken) {
            err = valErr;
            token = valToken;
        };
        window.open = function () {
            return null;
        }
        adal.callback = callback;
        adal.login();
        expect(err).toBe('Popup Window is null. This can happen if you are using IE');
        expect(token).toBe(null);
        expect(adal.loginInProgress()).toBe(false);
    });

    it('tests login functionality in case of popup window', function () {
        var timercallback;
        window.clearInterval = function () {
        };
        window.setInterval = function (method, timer) {
            timercallback = method;
        };
        adal.popUp = true;
        adal.config.clientId = 'client';
        adal.config.redirectUri = 'contoso_site';
        var popupWindow;
        window.open = function () {
            popupWindow = {
                location: {
                    hash: VALID_URLFRAGMENT,
                    href: 'hrefcontoso_site',
                    search: ''
                },
                closed: false,
                close: function () {
                    this.closed = true;
                }
            };
            return popupWindow;
        };
        var err;
        var token;
        var callback = function (valErr, valToken) {
            err = valErr;
            token = valToken;
        };
        adal.callback = callback;
        mathMock.random = function () {
            return 0.2;
        };
        
        adal.login();
        waitsFor(function () {
            timercallback();
            storageFake.setItem(adal.CONSTANTS.STORAGE.LOGIN_REQUEST, 'home page');
            return popupWindow.closed == true;
        }, 'error closing popup window', 2000);

        runs(function () {
            expect(adal.loginInProgress()).toBe(false);
            expect(token).toBe(IDTOKEN_MOCK);
            expect(window.location.href).not.toBe('home page');
        });

    });

    it('ensures that adal.callback is not overridden in calls to getUser', function () {
        var _callback = adal.callback;
        adal.callback = null;
        var err = '';
        var user = {};
        var callback = function (valErr, valResult) {
            err = valErr;
            user = valResult;
        };
        adal._user = { profile: { 'upn': 'test@testuser.com' }, userName: 'test@domain.com' };
        adal.getUser(callback);
        expect(user).toBe(adal._user);
        expect(adal.callback).toBe(null);
        adal.callback = _callback;
    });

    it('tests _guid function if window.crypto is defined in the browser', function () {
        var buffer = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
        window.msCrypto = null;
        window.crypto = {
            getRandomValues: function (_buffer) {
                for (var i = 0; i < _buffer.length; i++) {
                    _buffer[i] = buffer[i];
                }
            }
        };
        expect(adal._guid()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
        window.crypto = null;
    });

    it('verifies _getNavigateUrl() returns the correct value when tenant and rootContext are undefined, and scope and responseType are not truthy', function() {
        adal.config.tenant = undefined;
        adal.config.rootContext = undefined;
        adal.config.scope = '';
        adal.config.responseType = '';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/common\/oauth2\/authorize\?response_type=id_token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*/);
    });

    it('verifies _getNavigateUrl() returns the correct value when tenant and rootContext are undefined, scope is not truthy, and responseType is truthy', function() {
        adal.config.tenant = undefined;
        adal.config.rootContext = undefined;
        adal.config.scope = '';
        adal.config.responseType = 'id_token token';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/common\/oauth2\/authorize\?response_type=id_token%20token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*/);
    });

    it('verifies _getNavigateUrl() returns the correct value when tenant and rootContext are undefined, scope is truthy, and responseType is not truthy', function() {
        adal.config.tenant = undefined;
        adal.config.rootContext = undefined;
        adal.config.scope = 'openid';
        adal.config.responseType = '';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/common\/oauth2\/authorize\?response_type=id_token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*&scope=openid/);
    }); 

    it('verifies _getNavigateUrl() returns the correct value when tenant and rootContext are undefined, and scope and responseType are truthy', function() {
        adal.config.tenant = undefined;
        adal.config.rootContext = undefined;
        adal.config.scope = 'openid';
        adal.config.responseType = 'id_token token';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/common\/oauth2\/authorize\?response_type=id_token%20token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*&scope=openid/);
    });

    it('verifies _getNavigateUrl() returns the correct value when tenant is undefined, rootContext is blank, and scope and responseType are not truthy', function() {
        adal.config.tenant = undefined;
        adal.config.rootContext = '';
        adal.config.scope = '';
        adal.config.responseType = '';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/common\/authorize\?response_type=id_token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*/);
    }); 

    it('verifies _getNavigateUrl() returns the correct value when tenant is undefined, rootContext is blank, scope is not truthy, and responseType is truthy', function() {
        adal.config.tenant = undefined;
        adal.config.rootContext = '';
        adal.config.scope = '';
        adal.config.responseType = 'id_token token';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/common\/authorize\?response_type=id_token%20token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*/);
    });    

    it('verifies _getNavigateUrl() returns the correct value when tenant is undefined, rootContext is blank, scope is truthy, and responseType is not truthy', function() {
        adal.config.tenant = undefined;
        adal.config.rootContext = '';
        adal.config.scope = 'openid';
        adal.config.responseType = '';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/common\/authorize\?response_type=id_token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*&scope=openid/);
    });     

    it('verifies _getNavigateUrl() returns the correct value when tenant is undefined, rootContext is blank, and scope and responseType are truthy', function() {
        adal.config.tenant = undefined;
        adal.config.rootContext = '';
        adal.config.scope = 'openid';
        adal.config.responseType = 'id_token token';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/common\/authorize\?response_type=id_token%20token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*&scope=openid/);
    });        

    it('verifies _getNavigateUrl() returns the correct value when tenant is blank, rootContext is undefined, and scope and responseType are not truthy', function() {
        adal.config.tenant = '';
        adal.config.rootContext = undefined;
        adal.config.scope = '';
        adal.config.responseType = '';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/oauth2\/authorize\?response_type=id_token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*/);
    }); 

    it('verifies _getNavigateUrl() returns the correct value when tenant is blank, rootContext is undefined, scope is not truthy, and responseType is truthy', function() {
        adal.config.tenant = '';
        adal.config.rootContext = undefined;
        adal.config.scope = '';
        adal.config.responseType = 'id_token token';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/oauth2\/authorize\?response_type=id_token%20token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*/);
    }); 

    it('verifies _getNavigateUrl() returns the correct value when tenant is blank, rootContext is undefined, scope is truthy, and responseType is not truthy', function() {
        adal.config.tenant = '';
        adal.config.rootContext = undefined;
        adal.config.scope = 'openid';
        adal.config.responseType = '';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/oauth2\/authorize\?response_type=id_token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*&scope=openid/);
    }); 

    it('verifies _getNavigateUrl() returns the correct value when tenant is blank, rootContext is undefined, and scope and responseType are truthy', function() {
        adal.config.tenant = '';
        adal.config.rootContext = undefined;
        adal.config.scope = 'openid';
        adal.config.responseType = 'id_token token';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/oauth2\/authorize\?response_type=id_token%20token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*&scope=openid/);
    }); 

    it('verifies _getNavigateUrl() returns the correct value when tenant and rootContext are blank, and scope and responseType are not truthy', function() {
        adal.config.tenant = '';
        adal.config.rootContext = '';
        adal.config.scope = '';
        adal.config.responseType = '';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/authorize\?response_type=id_token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*/);
    });     

    it('verifies _getNavigateUrl() returns the correct value when tenant and rootContext are blank, scope is not truthy, and responseType is truthy', function() {
        adal.config.tenant = '';
        adal.config.rootContext = '';
        adal.config.scope = '';
        adal.config.responseType = 'id_token token';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/authorize\?response_type=id_token%20token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*/);
    });  

    it('verifies _getNavigateUrl() returns the correct value when tenant and rootContext are blank, scope is truthy, and responseType is not truthy', function() {
        adal.config.tenant = '';
        adal.config.rootContext = '';
        adal.config.scope = 'openid';
        adal.config.responseType = '';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/authorize\?response_type=id_token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*&scope=openid/);
    });        

    it('verifies _getNavigateUrl() returns the correct value when tenant and rootContext are blank, and scope and responseType are truthy', function() {
        adal.config.tenant = '';
        adal.config.rootContext = '';
        adal.config.scope = 'openid';
        adal.config.responseType = 'id_token token';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/authorize\?response_type=id_token%20token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*&scope=openid/);
    });  

    it('verifies _getNavigateUrl() returns the correct value when tenant is non-blank, rootContext is undefined, and scope and responseType are not truthy', function() {
        adal.config.tenant = 'contoso';
        adal.config.rootContext = undefined;
        adal.config.scope = '';
        adal.config.responseType = '';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/contoso\/oauth2\/authorize\?response_type=id_token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*/);
    });      

    it('verifies _getNavigateUrl() returns the correct value when tenant is non-blank, rootContext is undefined, scope is not truthy, and responseType is truthy', function() {
        adal.config.tenant = 'contoso';
        adal.config.rootContext = undefined;
        adal.config.scope = '';
        adal.config.responseType = 'id_token token';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/contoso\/oauth2\/authorize\?response_type=id_token%20token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*/);
    });    

    it('verifies _getNavigateUrl() returns the correct value when tenant is non-blank, rootContext is undefined, scope is truthy, and responseType is not truthy', function() {
        adal.config.tenant = 'contoso';
        adal.config.rootContext = undefined;
        adal.config.scope = 'openid';
        adal.config.responseType = '';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/contoso\/oauth2\/authorize\?response_type=id_token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*&scope=openid/);
    });

    it('verifies _getNavigateUrl() returns the correct value when tenant is non-blank, rootContext is undefined, and scope and responseType are truthy', function() {
        adal.config.tenant = 'contoso';
        adal.config.rootContext = undefined;
        adal.config.scope = 'openid';
        adal.config.responseType = 'id_token token';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/contoso\/oauth2\/authorize\?response_type=id_token%20token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*&scope=openid/);
    });

    it('verifies _getNavigateUrl() returns the correct value when tenant is non-blank, rootContext is blank, and scope and responseType are not truthy', function() {
        adal.config.tenant = 'contoso';
        adal.config.rootContext = '';
        adal.config.scope = '';
        adal.config.responseType = '';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/contoso\/authorize\?response_type=id_token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*/);
    });

    it('verifies _getNavigateUrl() returns the correct value when tenant is non-blank, rootContext is blank, scope is not truthy, and responseType is truthy', function() {
        adal.config.tenant = 'contoso';
        adal.config.rootContext = '';
        adal.config.scope = '';
        adal.config.responseType = 'id_token token';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/contoso\/authorize\?response_type=id_token%20token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*/);
    });    

    it('verifies _getNavigateUrl() returns the correct value when tenant is non-blank, rootContext is blank, scope is truthy, and responseType is not truthy', function() {
        adal.config.tenant = 'contoso';
        adal.config.rootContext = '';
        adal.config.scope = 'openid';
        adal.config.responseType = '';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/contoso\/authorize\?response_type=id_token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*&scope=openid/);
    });       

    it('verifies _getNavigateUrl() returns the correct value when tenant is non-blank, rootContext is blank, and scope and responseType are truthy', function() {
        adal.config.tenant = 'contoso';
        adal.config.rootContext = '';
        adal.config.scope = 'openid';
        adal.config.responseType = 'id_token token';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/contoso\/authorize\?response_type=id_token%20token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*&scope=openid/);
    });       

    it('verifies _getNavigateUrl() returns the correct value when tenant and rootContext are non-blank, and scope and responseType are not truthy', function() {
        adal.config.tenant = 'contoso';
        adal.config.rootContext = 'another_context';
        adal.config.scope = '';
        adal.config.responseType = '';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/contoso\/another_context\/authorize\?response_type=id_token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*/);
    });     

    it('verifies _getNavigateUrl() returns the correct value when tenant and rootContext are non-blank, scope is not truthy, and responseType is truthy', function() {
        adal.config.tenant = 'contoso';
        adal.config.rootContext = 'another_context';
        adal.config.scope = '';
        adal.config.responseType = 'id_token token';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/contoso\/another_context\/authorize\?response_type=id_token%20token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*/);
    }); 

    it('verifies _getNavigateUrl() returns the correct value when tenant and rootContext are non-blank, scope is truthy, and responseType is not truthy', function() {
        adal.config.tenant = 'contoso';
        adal.config.rootContext = 'another_context';
        adal.config.scope = 'openid';
        adal.config.responseType = '';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/contoso\/another_context\/authorize\?response_type=id_token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*&scope=openid/);
    }); 

    it('verifies _getNavigateUrl() returns the correct value when tenant and rootContext are non-blank, and scope and responseType are truthy', function() {
        adal.config.tenant = 'contoso';
        adal.config.rootContext = 'another_context';
        adal.config.scope = 'openid';
        adal.config.responseType = 'id_token token';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/contoso\/another_context\/authorize\?response_type=id_token%20token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*&scope=openid/);
    }); 

    it('verifies _getNavigateUrl() returns the correct value when tenant is blank, rootContext is non-blank, and scope and responseType are not truthy', function() {
        adal.config.tenant = '';
        adal.config.rootContext = 'another_context';
        adal.config.scope = '';
        adal.config.responseType = '';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/another_context\/authorize\?response_type=id_token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*/);
    });     

    it('verifies _getNavigateUrl() returns the correct value when tenant is blank, rootContext is non-blank, scope is not truthy, and responseType is truthy', function() {
        adal.config.tenant = '';
        adal.config.rootContext = 'another_context';
        adal.config.scope = '';
        adal.config.responseType = 'id_token token';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/another_context\/authorize\?response_type=id_token%20token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*/);
    });    

    it('verifies _getNavigateUrl() returns the correct value when tenant is blank, rootContext is non-blank, scope is truthy, and responseType is not truthy', function() {
        adal.config.tenant = '';
        adal.config.rootContext = 'another_context';
        adal.config.scope = 'openid';
        adal.config.responseType = '';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/another_context\/authorize\?response_type=id_token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*&scope=openid/);
    });  

    it('verifies _getNavigateUrl() returns the correct value when tenant is blank, rootContext is non-blank, and scope and responseType are truthy', function() {
        adal.config.tenant = '';
        adal.config.rootContext = 'another_context';
        adal.config.scope = 'openid';
        adal.config.responseType = 'id_token token';
        adal._initResponseType();
        adal.config.clientId = 'the_client_id';
        adal.config.redirectUri = 'the_redirect_uri';
        adal.config.state = 'the_state';
        adal.config.correlationId = 'the_correlation_id';
        expect(adal._getNavigateUrl(adal.config.responseType, '')).toMatch(/https:\/\/login\.microsoftonline\.com\/another_context\/authorize\?response_type=id_token%20token&client_id=the_client_id&redirect_uri=the_redirect_uri&state=the_state&client-request-id=the_correlation_id.*&scope=openid/);
    });  

    it('verifies _createUser() returns null when an aud claim is not contained within the id_token', function() {
        var TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjVUa0d0S1JrZ2FpZXpFWTJFc0xDMmdPTGpBNCJ9.eyJhdWQiOiJlOWE1YThiNi04YWY3LTQ3MTktOTgyMS0wZGVlZjI1NWY2OGUiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLXBwZS5uZXQvNTJkNGIwNzItOTQ3MC00OWZiLTg3MjEtYmMzYTFjOTkxMmExLyIsImlhdCI6MTQxMTk1OTAwMCwibmJmIjoxNDExOTU5MDAwLCJleHAiOjE0MTE5NjI5MDAsInZlciI6IjEuMCIsInRpZCI6IjUyZDRiMDcyLTk0NzAtNDlmYi04NzIxLWJjM2ExYzk5MTJhMSIsImFtciI6WyJwd2QiXSwib2lkIjoiZmEzYzVmYTctN2Q5OC00Zjk3LWJmYzQtZGJkM2E0YTAyNDMxIiwidXBuIjoidXNlckBvYXV0aGltcGxpY2l0LmNjc2N0cC5uZXQiLCJ1bmlxdWVfbmFtZSI6InVzZXJAb2F1dGhpbXBsaWNpdC5jY3NjdHAubmV0Iiwic3ViIjoiWTdUbXhFY09IUzI0NGFHa3RjbWpicnNrdk5tU1I4WHo5XzZmbVc2NXloZyIsImZhbWlseV9uYW1lIjoiYSIsImdpdmVuX25hbWUiOiJ1c2VyIiwibm9uY2UiOiI4MGZmYTkwYS1jYjc0LTRkMGYtYTRhYy1hZTFmOTNlMzJmZTAiLCJwd2RfZXhwIjoiNTc3OTkxMCIsInB3ZF91cmwiOiJodHRwczovL3BvcnRhbC5taWNyb3NvZnRvbmxpbmUuY29tL0NoYW5nZVBhc3N3b3JkLmFzcHgifQ.eyJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLXBwZS5uZXQvNTJkNGIwNzItOTQ3MC00OWZiLTg3MjEtYmMzYTFjOTkxMmExLyIsImlhdCI6MTQxMTk1OTAwMCwibmJmIjoxNDExOTU5MDAwLCJleHAiOjE0MTE5NjI5MDAsInZlciI6IjEuMCIsInRpZCI6IjUyZDRiMDcyLTk0NzAtNDlmYi04NzIxLWJjM2ExYzk5MTJhMSIsImFtciI6WyJwd2QiXSwib2lkIjoiZmEzYzVmYTctN2Q5OC00Zjk3LWJmYzQtZGJkM2E0YTAyNDMxIiwidXBuIjoidXNlckBvYXV0aGltcGxpY2l0LmNjc2N0cC5uZXQiLCJ1bmlxdWVfbmFtZSI6InVzZXJAb2F1dGhpbXBsaWNpdC5jY3NjdHAubmV0Iiwic3ViIjoiWTdUbXhFY09IUzI0NGFHa3RjbWpicnNrdk5tU1I4WHo5XzZmbVc2NXloZyIsImZhbWlseV9uYW1lIjoiYSIsImdpdmVuX25hbWUiOiJ1c2VyIiwibm9uY2UiOiI4MGZmYTkwYS1jYjc0LTRkMGYtYTRhYy1hZTFmOTNlMzJmZTAiLCJwd2RfZXhwIjoiNTc3OTkxMCIsInB3ZF91cmwiOiJodHRwczovL3BvcnRhbC5taWNyb3NvZnRvbmxpbmUuY29tL0NoYW5nZVBhc3N3b3JkLmFzcHgifQ==";
        expect(adal._createUser(TOKEN)).toBe(null);
    });

    it('verifies _createUser() returns user object with userName matching the upn contained within the id_token when a single aud claim matching the clientId is present', function() {
        adal.config.clientId = 'e9a5a8b6-8af7-4719-9821-0deef255f68e';
        expect(adal._createUser(IDTOKEN_MOCK).userName).toBe('user@oauthimplicit.ccsctp.net');
    });

    it('verifies _createUser() returns null when an unmatching single aud claim is contained within the id_token', function() {
        adal.config.clientId = 'not-a-match';
        expect(adal._createUser(IDTOKEN_MOCK)).toBe(null);
    });

    it('verifies _createUser returns user object with userName matching the upn contained within the id_token when an aud claim array is present and a matching azp claim is present', function() {
        adal.config.clientId = 'e9a5a8b6-8af7-4719-9821-0deef255f68e';
        var TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjVUa0d0S1JrZ2FpZXpFWTJFc0xDMmdPTGpBNCJ9.eyJhdWQiOlsiZTlhNWE4YjYtOGFmNy00NzE5LTk4MjEtMGRlZWYyNTVmNjhlIl0sImF6cCI6ImU5YTVhOGI2LThhZjctNDcxOS05ODIxLTBkZWVmMjU1ZjY4ZSIsImlzcyI6Imh0dHBzOi8vc3RzLndpbmRvd3MtcHBlLm5ldC81MmQ0YjA3Mi05NDcwLTQ5ZmItODcyMS1iYzNhMWM5OTEyYTEvIiwiaWF0IjoxNDExOTU5MDAwLCJuYmYiOjE0MTE5NTkwMDAsImV4cCI6MTQxMTk2MjkwMCwidmVyIjoiMS4wIiwidGlkIjoiNTJkNGIwNzItOTQ3MC00OWZiLTg3MjEtYmMzYTFjOTkxMmExIiwiYW1yIjpbInB3ZCJdLCJvaWQiOiJmYTNjNWZhNy03ZDk4LTRmOTctYmZjNC1kYmQzYTRhMDI0MzEiLCJ1cG4iOiJ1c2VyQG9hdXRoaW1wbGljaXQuY2NzY3RwLm5ldCIsInVuaXF1ZV9uYW1lIjoidXNlckBvYXV0aGltcGxpY2l0LmNjc2N0cC5uZXQiLCJzdWIiOiJZN1RteEVjT0hTMjQ0YUdrdGNtamJyc2t2Tm1TUjhYejlfNmZtVzY1eWhnIiwiZmFtaWx5X25hbWUiOiJhIiwiZ2l2ZW5fbmFtZSI6InVzZXIiLCJub25jZSI6IjgwZmZhOTBhLWNiNzQtNGQwZi1hNGFjLWFlMWY5M2UzMmZlMCIsInB3ZF9leHAiOiI1Nzc5OTEwIiwicHdkX3VybCI6Imh0dHBzOi8vcG9ydGFsLm1pY3Jvc29mdG9ubGluZS5jb20vQ2hhbmdlUGFzc3dvcmQuYXNweCJ9.WHsl8TH1rQ3dQbRkV0TS6GBVAxzNOpG3nGG6mpEBCwAOCbyW6qRsSoo4qq8I5IGyerDf2cvcS-zzatHEROpRC9dcpwkRm6ta5dFZuouFyZ_QiYVKSMwfzEC_FI-6p7eT8gY6FbV51bp-Ah_WKJqEmaXv-lqjIpgsMGeWDgZRlB9cPODXosBq-PEk0q27Be-_A-KefQacJuWTX2eEhECLyuAu-ETVJb7s19jQrs_LJXz_ISib4DdTKPa7XTBDJlVGdCI18ctB67XwGmGi8MevkeKqFI8dkykTxeJ0MXMmEQbE6Fw-gxmP7uJYbZ61Jqwsw24zMDMeXatk2VWMBPCuhA';
        expect(adal._createUser(TOKEN).userName).toBe('user@oauthimplicit.ccsctp.net');
    });

    it('verifies _createUser returns null when the id_token contains an matching aud claim within an aud claim array but without a matching azp claim', function() {
        adal.config.clientId = 'e9a5a8b6-8af7-4719-9821-0deef255f68e';
        var TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjVUa0d0S1JrZ2FpZXpFWTJFc0xDMmdPTGpBNCJ9.eyJhdWQiOlsiZTlhNWE4YjYtOGFmNy00NzE5LTk4MjEtMGRlZWYyNTVmNjhlIl0sImF6cCI6Im5vdC1hLW1hdGNoIiwiaXNzIjoiaHR0cHM6Ly9zdHMud2luZG93cy1wcGUubmV0LzUyZDRiMDcyLTk0NzAtNDlmYi04NzIxLWJjM2ExYzk5MTJhMS8iLCJpYXQiOjE0MTE5NTkwMDAsIm5iZiI6MTQxMTk1OTAwMCwiZXhwIjoxNDExOTYyOTAwLCJ2ZXIiOiIxLjAiLCJ0aWQiOiI1MmQ0YjA3Mi05NDcwLTQ5ZmItODcyMS1iYzNhMWM5OTEyYTEiLCJhbXIiOlsicHdkIl0sIm9pZCI6ImZhM2M1ZmE3LTdkOTgtNGY5Ny1iZmM0LWRiZDNhNGEwMjQzMSIsInVwbiI6InVzZXJAb2F1dGhpbXBsaWNpdC5jY3NjdHAubmV0IiwidW5pcXVlX25hbWUiOiJ1c2VyQG9hdXRoaW1wbGljaXQuY2NzY3RwLm5ldCIsInN1YiI6Ilk3VG14RWNPSFMyNDRhR2t0Y21qYnJza3ZObVNSOFh6OV82Zm1XNjV5aGciLCJmYW1pbHlfbmFtZSI6ImEiLCJnaXZlbl9uYW1lIjoidXNlciIsIm5vbmNlIjoiODBmZmE5MGEtY2I3NC00ZDBmLWE0YWMtYWUxZjkzZTMyZmUwIiwicHdkX2V4cCI6IjU3Nzk5MTAiLCJwd2RfdXJsIjoiaHR0cHM6Ly9wb3J0YWwubWljcm9zb2Z0b25saW5lLmNvbS9DaGFuZ2VQYXNzd29yZC5hc3B4In0=.WHsl8TH1rQ3dQbRkV0TS6GBVAxzNOpG3nGG6mpEBCwAOCbyW6qRsSoo4qq8I5IGyerDf2cvcS-zzatHEROpRC9dcpwkRm6ta5dFZuouFyZ_QiYVKSMwfzEC_FI-6p7eT8gY6FbV51bp-Ah_WKJqEmaXv-lqjIpgsMGeWDgZRlB9cPODXosBq-PEk0q27Be-_A-KefQacJuWTX2eEhECLyuAu-ETVJb7s19jQrs_LJXz_ISib4DdTKPa7XTBDJlVGdCI18ctB67XwGmGi8MevkeKqFI8dkykTxeJ0MXMmEQbE6Fw-gxmP7uJYbZ61Jqwsw24zMDMeXatk2VWMBPCuhA';
        expect(adal._createUser(TOKEN)).toBe(null);
    });

    it('verifies _createUser returns user object with userName matching the email claim contained within the id_token when no upn claim is present and a single aud claim matchint the clientId is present', function() {
        adal.config.clientId = 'e9a5a8b6-8af7-4719-9821-0deef255f68e';
        var TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjVUa0d0S1JrZ2FpZXpFWTJFc0xDMmdPTGpBNCJ9.eyJhdWQiOiJlOWE1YThiNi04YWY3LTQ3MTktOTgyMS0wZGVlZjI1NWY2OGUiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLXBwZS5uZXQvNTJkNGIwNzItOTQ3MC00OWZiLTg3MjEtYmMzYTFjOTkxMmExLyIsImlhdCI6MTQxMTk1OTAwMCwibmJmIjoxNDExOTU5MDAwLCJleHAiOjE0MTE5NjI5MDAsInZlciI6IjEuMCIsInRpZCI6IjUyZDRiMDcyLTk0NzAtNDlmYi04NzIxLWJjM2ExYzk5MTJhMSIsImFtciI6WyJwd2QiXSwib2lkIjoiZmEzYzVmYTctN2Q5OC00Zjk3LWJmYzQtZGJkM2E0YTAyNDMxIiwiZW1haWwiOiJ1c2VyQG9hdXRoaW1wbGljaXQuY2NzY3RwLm5ldCIsInVuaXF1ZV9uYW1lIjoidXNlckBvYXV0aGltcGxpY2l0LmNjc2N0cC5uZXQiLCJzdWIiOiJZN1RteEVjT0hTMjQ0YUdrdGNtamJyc2t2Tm1TUjhYejlfNmZtVzY1eWhnIiwiZmFtaWx5X25hbWUiOiJhIiwiZ2l2ZW5fbmFtZSI6InVzZXIiLCJub25jZSI6IjgwZmZhOTBhLWNiNzQtNGQwZi1hNGFjLWFlMWY5M2UzMmZlMCIsInB3ZF9leHAiOiI1Nzc5OTEwIiwicHdkX3VybCI6Imh0dHBzOi8vcG9ydGFsLm1pY3Jvc29mdG9ubGluZS5jb20vQ2hhbmdlUGFzc3dvcmQuYXNweCJ9.WHsl8TH1rQ3dQbRkV0TS6GBVAxzNOpG3nGG6mpEBCwAOCbyW6qRsSoo4qq8I5IGyerDf2cvcS-zzatHEROpRC9dcpwkRm6ta5dFZuouFyZ_QiYVKSMwfzEC_FI-6p7eT8gY6FbV51bp-Ah_WKJqEmaXv-lqjIpgsMGeWDgZRlB9cPODXosBq-PEk0q27Be-_A-KefQacJuWTX2eEhECLyuAu-ETVJb7s19jQrs_LJXz_ISib4DdTKPa7XTBDJlVGdCI18ctB67XwGmGi8MevkeKqFI8dkykTxeJ0MXMmEQbE6Fw-gxmP7uJYbZ61Jqwsw24zMDMeXatk2VWMBPCuhA'; 
        expect(adal._createUser(TOKEN).userName).toBe('user@oauthimplicit.ccsctp.net');
    });

    it('verifies _createUser returns user object with userName matching the sub claim contained within the id_token when no upn and no email claim are present and a single aud claim matchint the clientId is present', function() {
        adal.config.clientId = 'e9a5a8b6-8af7-4719-9821-0deef255f68e';
        var TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjVUa0d0S1JrZ2FpZXpFWTJFc0xDMmdPTGpBNCJ9.eyJhdWQiOiJlOWE1YThiNi04YWY3LTQ3MTktOTgyMS0wZGVlZjI1NWY2OGUiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLXBwZS5uZXQvNTJkNGIwNzItOTQ3MC00OWZiLTg3MjEtYmMzYTFjOTkxMmExLyIsImlhdCI6MTQxMTk1OTAwMCwibmJmIjoxNDExOTU5MDAwLCJleHAiOjE0MTE5NjI5MDAsInZlciI6IjEuMCIsInRpZCI6IjUyZDRiMDcyLTk0NzAtNDlmYi04NzIxLWJjM2ExYzk5MTJhMSIsImFtciI6WyJwd2QiXSwib2lkIjoiZmEzYzVmYTctN2Q5OC00Zjk3LWJmYzQtZGJkM2E0YTAyNDMxIiwidW5pcXVlX25hbWUiOiJ1c2VyQG9hdXRoaW1wbGljaXQuY2NzY3RwLm5ldCIsInN1YiI6Ilk3VG14RWNPSFMyNDRhR2t0Y21qYnJza3ZObVNSOFh6OV82Zm1XNjV5aGciLCJmYW1pbHlfbmFtZSI6ImEiLCJnaXZlbl9uYW1lIjoidXNlciIsIm5vbmNlIjoiODBmZmE5MGEtY2I3NC00ZDBmLWE0YWMtYWUxZjkzZTMyZmUwIiwicHdkX2V4cCI6IjU3Nzk5MTAiLCJwd2RfdXJsIjoiaHR0cHM6Ly9wb3J0YWwubWljcm9zb2Z0b25saW5lLmNvbS9DaGFuZ2VQYXNzd29yZC5hc3B4In0=.WHsl8TH1rQ3dQbRkV0TS6GBVAxzNOpG3nGG6mpEBCwAOCbyW6qRsSoo4qq8I5IGyerDf2cvcS-zzatHEROpRC9dcpwkRm6ta5dFZuouFyZ_QiYVKSMwfzEC_FI-6p7eT8gY6FbV51bp-Ah_WKJqEmaXv-lqjIpgsMGeWDgZRlB9cPODXosBq-PEk0q27Be-_A-KefQacJuWTX2eEhECLyuAu-ETVJb7s19jQrs_LJXz_ISib4DdTKPa7XTBDJlVGdCI18ctB67XwGmGi8MevkeKqFI8dkykTxeJ0MXMmEQbE6Fw-gxmP7uJYbZ61Jqwsw24zMDMeXatk2VWMBPCuhA'; 
        expect(adal._createUser(TOKEN).userName).toBe('Y7TmxEcOHS244aGktcmjbrskvNmSR8Xz9_6fmW65yhg');
    });

    it('verifies that isCallback returns false if both the fragment and search portions of the URL are blank', function() {
        expect(adal.isCallback(undefined, undefined)).toBe(false);
    });
    
    it('verifies that isCallback returns true if the fragment portion of the URL contains an id_token and the search portion is blank', function() {
        var hash = '#/' + VALID_URLFRAGMENT;
        expect(adal.isCallback(hash, undefined)).toBe(true);
    });

    it('verifies that isCallback returns true if the fragment portion of the URL is blank and the search portion contains an id_token', function() {
        var search = '?id_token=eyJ4NXQiOiJObUptT0dVeE16WmxZak0yWkRSaE5UWmxZVEExWXpkaFpUUmlPV0UwTldJMk0ySm1PVGMxWkEiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImF1ZCI6WyJoUDdwa3JXYUJQa2NPTERaVmJsel9JZ2VtVmthIl0sImF6cCI6ImhQN3BrcldhQlBrY09MRFpWYmx6X0lnZW1Wa2EiLCJhdXRoX3RpbWUiOjE0NzU1MjI4MDksImlzcyI6Imh0dHBzOlwvXC9sb2NhbGhvc3Q6OTQ0M1wvb2F1dGgyXC90b2tlbiIsInNuIjoiV29vZHdhcmQiLCJnaXZlbl9uYW1lIjoiRGF2aWQiLCJleHAiOjE0NzU1MjMxMDksIm5vbmNlIjoiNWE3MWM5ZmYtYjI1YS00YzE1LWEzNjgtNzdmODgwZWRkOWI2IiwiaWF0IjoxNDc1NTIyODA5fQ.B5KAglX92PPppP66yMkyzD1LA7qdWhrQWqYEOzJ0uFB_ZN8_u7G7Pp0qBy0Uilbh6AS0go64pzX5sxU72psHr6z2xVMJYm8-zjTb1GDVP3thUlZ1nEK-esUjSBLDnN1qKmMINtX82S3KIpAlehB1nZ94kbOHCoZ9v_k1rnTiWRA&state=6777d1e8-6014-403d-ac0c-297dec5cc514';
        expect(adal.isCallback(undefined, search)).toBe(true);
    });

    it('verifies that isCallback returns true if the fragment portion of the URL contains a token and the search portion is blank', function() {
        var hash = '#/access_token=4dce1d4c-3828-3873-bdda-9b2ba2726ac4&state=1120063b-8c7b-4fac-a121-a0e7e4ccb270&token_type=Bearer&expires_in=197&session_state=a41ac575b3d4c1b50acee40499a7efc1d46485913bd8520b13eebec6a657da3e.Vxrih14RiYpyTIs-X21-Pg';
         expect(adal.isCallback(hash, undefined)).toBe(true);
   });

    it('verifies that isCallback returns true if the fragment portion of the URL contains both a token and an id_token (after embedded question mark) and the search portion is blank', function() {
        var hash = '#/access_token=eda1a60f-4dbd-3b8c-bfce-60d3980040a5&id_token=eyJ4NXQiOiJObUptT0dVeE16WmxZak0yWkRSaE5UWmxZVEExWXpkaFpUUmlPV0UwTldJMk0ySm1PVGMxWkEiLCJhbGciOiJSUzI1NiJ9.eyJhdF9oYXNoIjoiQUI4Si1WaHlvbWxseTJBbktvN2dVUSIsInN1YiI6ImFkbWluIiwiYXVkIjpbImhQN3BrcldhQlBrY09MRFpWYmx6X0lnZW1Wa2EiXSwiYXpwIjoiaFA3cGtyV2FCUGtjT0xEWlZibHpfSWdlbVZrYSIsImF1dGhfdGltZSI6MTQ3NTUyMjUyMCwiaXNzIjoiaHR0cHM6XC9cL2xvY2FsaG9zdDo5NDQzXC9vYXV0aDJcL3Rva2VuIiwic24iOiJXb29kd2FyZCIsImdpdmVuX25hbWUiOiJEYXZpZCIsImV4cCI6MTQ3NTUyMjgyMCwibm9uY2UiOiI1NTRkMjE5Ny0yYTQzLTQzMGUtOGJmNy1kMjk5MTIxNjE5MDEiLCJpYXQiOjE0NzU1MjI1MjB9.WrTgmLsBuP6BG1v1aBs4dp3ONYEtuzlUySsG4ImpAVIBg9BJv_nc9NPDSK_IMxiKi7sHwJWzCzNLHUbOkmmZxTqIQt7KEs_Kx2ZBlf_Yvb_YPyAcUasBlX4BzHLq0nOAqax43fgholLLXPA4WZmBkDVw6piquPQ45uCJ8_Myezs&state=e60a53f8-fadc-477a-b51d-64e7c31b06e9&token_type=Bearer&expires_in=300&session_state=8cbc061a22547adff4c5f88a80de8999129997b8ff7c7c66c870a43d6d2a2d6a.enxHcp7nDHTPhFPWaY-l4g';
         expect(adal.isCallback(hash, undefined)).toBe(true);
   });

    it('verifies that _getParameters returns an empty object if both the fragment and search portions of the URL are blank', function() {
        expect(Object.getOwnPropertyNames(adal._getParameters(undefined, undefined)).length).toBe(0);
    });

    it('verifies that _getParameters returns an object containing the id_token when the fragment portion of the URL is blank and the search portion of the URL contains the id_token', function() {
        var TOKEN = 'eyJ4NXQiOiJObUptT0dVeE16WmxZak0yWkRSaE5UWmxZVEExWXpkaFpUUmlPV0UwTldJMk0ySm1PVGMxWkEiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImF1ZCI6WyJoUDdwa3JXYUJQa2NPTERaVmJsel9JZ2VtVmthIl0sImF6cCI6ImhQN3BrcldhQlBrY09MRFpWYmx6X0lnZW1Wa2EiLCJhdXRoX3RpbWUiOjE0NzU1MjI4MDksImlzcyI6Imh0dHBzOlwvXC9sb2NhbGhvc3Q6OTQ0M1wvb2F1dGgyXC90b2tlbiIsInNuIjoiV29vZHdhcmQiLCJnaXZlbl9uYW1lIjoiRGF2aWQiLCJleHAiOjE0NzU1MjMxMDksIm5vbmNlIjoiNWE3MWM5ZmYtYjI1YS00YzE1LWEzNjgtNzdmODgwZWRkOWI2IiwiaWF0IjoxNDc1NTIyODA5fQ.B5KAglX92PPppP66yMkyzD1LA7qdWhrQWqYEOzJ0uFB_ZN8_u7G7Pp0qBy0Uilbh6AS0go64pzX5sxU72psHr6z2xVMJYm8-zjTb1GDVP3thUlZ1nEK-esUjSBLDnN1qKmMINtX82S3KIpAlehB1nZ94kbOHCoZ9v_k1rnTiWRA';
        var search = '?id_token=' + TOKEN + '&state=6777d1e8-6014-403d-ac0c-297dec5cc514';
        expect(adal._getParameters(undefined, search).id_token).toBe(TOKEN);
    });

    it('verifies that _getParameters returns an object containing the token when the fragment porion of the URL contains the access_token and the search portion of the URL is blank', function() {
        var TOKEN = '4dce1d4c-3828-3873-bdda-9b2ba2726ac4';
        var hash = '#/access_token=' + TOKEN + '&state=1120063b-8c7b-4fac-a121-a0e7e4ccb270&token_type=Bearer&expires_in=197&session_state=a41ac575b3d4c1b50acee40499a7efc1d46485913bd8520b13eebec6a657da3e.Vxrih14RiYpyTIs-X21-Pg';
        expect(adal._getParameters(hash, undefined).access_token).toBe(TOKEN);
    });

    it('verifies that _getParameters returns an object containing the token when the fragment portion of the URL contains the id_token and the search portion of the URL is blank.', function() {
        var hash = '#/' + VALID_URLFRAGMENT;
        expect(adal._getParameters(hash, undefined).id_token).toBe(IDTOKEN_MOCK);
    });

    it('', function() {
        var ID_TOKEN = 'eyJ4NXQiOiJObUptT0dVeE16WmxZak0yWkRSaE5UWmxZVEExWXpkaFpUUmlPV0UwTldJMk0ySm1PVGMxWkEiLCJhbGciOiJSUzI1NiJ9.eyJhdF9oYXNoIjoiQUI4Si1WaHlvbWxseTJBbktvN2dVUSIsInN1YiI6ImFkbWluIiwiYXVkIjpbImhQN3BrcldhQlBrY09MRFpWYmx6X0lnZW1Wa2EiXSwiYXpwIjoiaFA3cGtyV2FCUGtjT0xEWlZibHpfSWdlbVZrYSIsImF1dGhfdGltZSI6MTQ3NTUyMjUyMCwiaXNzIjoiaHR0cHM6XC9cL2xvY2FsaG9zdDo5NDQzXC9vYXV0aDJcL3Rva2VuIiwic24iOiJXb29kd2FyZCIsImdpdmVuX25hbWUiOiJEYXZpZCIsImV4cCI6MTQ3NTUyMjgyMCwibm9uY2UiOiI1NTRkMjE5Ny0yYTQzLTQzMGUtOGJmNy1kMjk5MTIxNjE5MDEiLCJpYXQiOjE0NzU1MjI1MjB9.WrTgmLsBuP6BG1v1aBs4dp3ONYEtuzlUySsG4ImpAVIBg9BJv_nc9NPDSK_IMxiKi7sHwJWzCzNLHUbOkmmZxTqIQt7KEs_Kx2ZBlf_Yvb_YPyAcUasBlX4BzHLq0nOAqax43fgholLLXPA4WZmBkDVw6piquPQ45uCJ8_Myezs';
        var ACCESS_TOKEN = 'eda1a60f-4dbd-3b8c-bfce-60d3980040a5';
        var hash = '#/access_token=' + ACCESS_TOKEN + '&id_token=' + ID_TOKEN + '&state=e60a53f8-fadc-477a-b51d-64e7c31b06e9&token_type=Bearer&expires_in=300&session_state=8cbc061a22547adff4c5f88a80de8999129997b8ff7c7c66c870a43d6d2a2d6a.enxHcp7nDHTPhFPWaY-l4g';
        var parameters = adal._getParameters(hash, undefined);
        expect(parameters.id_token).toBe(ID_TOKEN);
        expect(parameters.access_token).toBe(ACCESS_TOKEN);
    });

    // TODO angular intercepptor
    // TODO angular authenticationService
});
