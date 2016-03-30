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
var AdalModule = require('../../../lib/adal.js');

describe('Adal', function () {
    var adal;
    var window = {
        location: {
            hash: '#hash',
            href: 'href',
            replace: function (val) {
            }
        },
        localStorage: {},
        sessionStorage: {},
        atob: atobHelper
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
        src: 'start'
    };

    var documentMock = {
        getElementById: function () {
            return frameMock;
        }
    };
    var angularMock = {};
    var conf = { loginResource: 'default resource', tenant: 'testtenant', clientId: 'e9a5a8b6-8af7-4719-9821-0deef255f68e' };
    var testPage = 'this is a song';
    var STORAGE_PREFIX = 'adal';
    var STORAGE_ACCESS_TOKEN_KEY = STORAGE_PREFIX + '.access.token.key';
    var STORAGE_EXPIRATION_KEY = STORAGE_PREFIX + '.expiration.key';
    var STORAGE_TOKEN_KEYS = STORAGE_PREFIX + '.token.keys';
    var RESOURCE1 = 'token.resource1';
    var SECONDS_TO_EXPIRE = 3600;
    var DEFAULT_INSTANCE = "https://login.microsoftonline.com/";
    var IDTOKEN_MOCK = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjVUa0d0S1JrZ2FpZXpFWTJFc0xDMmdPTGpBNCJ9.eyJhdWQiOiJlOWE1YThiNi04YWY3LTQ3MTktOTgyMS0wZGVlZjI1NWY2OGUiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLXBwZS5uZXQvNTJkNGIwNzItOTQ3MC00OWZiLTg3MjEtYmMzYTFjOTkxMmExLyIsImlhdCI6MTQxMTk1OTAwMCwibmJmIjoxNDExOTU5MDAwLCJleHAiOjE0MTE5NjI5MDAsInZlciI6IjEuMCIsInRpZCI6IjUyZDRiMDcyLTk0NzAtNDlmYi04NzIxLWJjM2ExYzk5MTJhMSIsImFtciI6WyJwd2QiXSwib2lkIjoiZmEzYzVmYTctN2Q5OC00Zjk3LWJmYzQtZGJkM2E0YTAyNDMxIiwidXBuIjoidXNlckBvYXV0aGltcGxpY2l0LmNjc2N0cC5uZXQiLCJ1bmlxdWVfbmFtZSI6InVzZXJAb2F1dGhpbXBsaWNpdC5jY3NjdHAubmV0Iiwic3ViIjoiWTdUbXhFY09IUzI0NGFHa3RjbWpicnNrdk5tU1I4WHo5XzZmbVc2NXloZyIsImZhbWlseV9uYW1lIjoiYSIsImdpdmVuX25hbWUiOiJ1c2VyIiwibm9uY2UiOiI4MGZmYTkwYS1jYjc0LTRkMGYtYTRhYy1hZTFmOTNlMzJmZTAiLCJwd2RfZXhwIjoiNTc3OTkxMCIsInB3ZF91cmwiOiJodHRwczovL3BvcnRhbC5taWNyb3NvZnRvbmxpbmUuY29tL0NoYW5nZVBhc3N3b3JkLmFzcHgifQ.WHsl8TH1rQ3dQbRkV0TS6GBVAxzNOpG3nGG6mpEBCwAOCbyW6qRsSoo4qq8I5IGyerDf2cvcS-zzatHEROpRC9dcpwkRm6ta5dFZuouFyZ_QiYVKSMwfzEC_FI-6p7eT8gY6FbV51bp-Ah_WKJqEmaXv-lqjIpgsMGeWDgZRlB9cPODXosBq-PEk0q27Be-_A-KefQacJuWTX2eEhECLyuAu-ETVJb7s19jQrs_LJXz_ISib4DdTKPa7XTBDJlVGdCI18ctB67XwGmGi8MevkeKqFI8dkykTxeJ0MXMmEQbE6Fw-gxmP7uJYbZ61Jqwsw24zMDMeXatk2VWMBPCuhA';
    var storageFake = function () {
        var store = {};
        return {
            getItem: function (key) {
                return store[key];
            },
            setItem: function (key, value) {
                if (typeof value != 'undefined') {
                    store[key] = value + '';
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
    });
     
    it('gets specific resource for defined endpoint mapping', function () {
        adal.config.endpoints = { 'a': 'resource for a' };
        expect(adal.getResourceForEndpoint('a')).toBe('resource for a');
        expect(adal.getResourceForEndpoint('b')).toBe(adal.config.loginResource);
    });

    it('gets default resource for empty endpoint mapping', function () {
        adal.config.endpoints = null;
        expect(adal.getResourceForEndpoint('a')).toBe('default resource');
        expect(adal.getResourceForEndpoint('b')).toBe('default resource');
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
        console.log('instance:' + adal.instance);
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
        adal._user = { userName: 'test@testuser.com' };
        adal.acquireToken(RESOURCE1, callback);
        expect(adal.callback).toBe(callback);
        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.LOGIN_REQUEST)).toBe('');
        expect(adal._renewStates.length).toBe(1);
        // Wait for initial timeout load
        console.log('Waiting for initial timeout');
        waits(2000);

        runs(function () {
            console.log('Frame src:' + frameMock.src);
            expect(frameMock.src).toBe(DEFAULT_INSTANCE + conf.tenant + '/oauth2/authorize?response_type=token&client_id=client&resource=' + RESOURCE1 + '&redirect_uri=contoso_site&state=33333333-3333-4333-b333-333333333333%7Ctoken.resource1'
                + '&client-request-id=33333333-3333-4333-b333-333333333333' + adal._addLibMetadata() + '&prompt=none&login_hint=test%40testuser.com&domain_hint=testuser.com&nonce=33333333-3333-4333-b333-333333333333');
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
        var callback2 = function(valErr, valToken){
            err2 = valErr;
            token2 = valToken;
        };
        
        adal._renewStates = [];
        adal._user = { userName: 'test@testuser.com' };
        adal.acquireToken(RESOURCE1, callback);
        //Simulate second acquire i.e. second service call from Angular.
        adal.acquireToken(RESOURCE1, callback2);
        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.LOGIN_REQUEST)).toBe('');
        expect(adal._renewStates.length).toBe(1);
        // Wait for initial timeout load
        console.log('Waiting for initial timeout');
        waits(2000);
 
        runs(function () {
            console.log('Frame src:' + frameMock.src);
            expect(frameMock.src).toBe(DEFAULT_INSTANCE + conf.tenant + '/oauth2/authorize?response_type=token&client_id=client&resource=' + RESOURCE1 + '&redirect_uri=contoso_site&state=33333333-3333-4333-b333-333333333333%7Ctoken.resource1'
                + '&client-request-id=33333333-3333-4333-b333-333333333333' + adal._addLibMetadata() + '&prompt=none&login_hint=test%40testuser.com&domain_hint=testuser.com&nonce=33333333-3333-4333-b333-333333333333');
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
        expect(storageFake.getItem(adal.CONSTANTS.STORAGE.EXPIRATION_KEY + 'loginResource1')).toBe(mathMock.round(1) + 3589 + '');
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
        console.log('test extract idtoken done');
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

    it ('test decode with no padding', function () {
        expect(adal._decode('ZGVjb2RlIHRlc3Rz')).toBe('decode tests');
    });

    it ('test decode with one = padding', function () {
        expect(adal._decode('ZWNvZGUgdGVzdHM=')).toBe('ecode tests');        
    });

    it ('test decode with two == padding', function () {
        expect(adal._decode('Y29kZSB0ZXN0cw==')).toBe('code tests');        
    })

    it ('test decode throw error', function () {
        try{
           adal._decode('YW55I');
        } catch(e) {
            expect(e.message).toBe('The token to be decoded is not correctly encoded.');
        }
    });

    it ('test get resource for endpoint from app backend', function () {
        adal.config.redirectUri = 'https://host.com/page';
        expect(adal.getResourceForEndpoint('https://host.com')).toBe(adal.config.loginResource);
        expect(adal.getResourceForEndpoint('https://host.com/a/b')).toBe(adal.config.loginResource);
        expect(adal.getResourceForEndpoint('https://host.com/page/')).toBe(adal.config.loginResource);
        expect(adal.getResourceForEndpoint('https://notapp.com/page/')).toBe(null);
        expect(adal.getResourceForEndpoint('/api/todo')).toBe(adal.config.loginResource);
    });

    it ('test host extraction', function () {
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

    // TODO angular intercepptor
   
    // TODO angular authenticaitonService
});