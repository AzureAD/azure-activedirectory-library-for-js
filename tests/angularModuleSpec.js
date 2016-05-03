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

'use strict';
 
describe('TaskCtl', function () {
    var scope, $httpBackend, adalServiceProvider, rootScope, controller, q, window;

    //mock Application to allow us to inject our own dependencies
    beforeEach(angular.mock.module('TestApplication'));

    //mock the controller for the same reason and include $rootScope and $controller
    beforeEach(angular.mock.inject(function (_adalAuthenticationService_, _$rootScope_, _$controller_, _$httpBackend_, _$q_, _$window_) {
        adalServiceProvider = _adalAuthenticationService_;
        rootScope = _$rootScope_;
        controller = _$controller_;
        $httpBackend = _$httpBackend_;
        q = _$q_;
        window = _$window_;

        //create an empty scope
        scope = rootScope.$new();
        adalServiceProvider.userInfo = { userName: 'UserVerify', isAuthenticated: true };
       
        adalServiceProvider.getCachedToken = function (resource) {
            console.log('Requesting token for resource:' + resource);
            if (resource === 'resource1') {
                return 'Token3434';
            }

            if (resource === 'resource2') {
                return 'Token123';
            }

            if (resource === adalServiceProvider.config.loginResource) {
                return 'Token456'; 
            }

            return '';
        };

        adalServiceProvider.acquireToken = function (resource) {
            console.log('acquire token for resource:' + resource);
            var token = '';
            if (resource === 'resource1') {
                token = 'RenewToken3434';
            }

            if (resource === 'resource2') {
                token = 'RenewToken123';
            }

            if (resource === adalServiceProvider.config.loginResource) {
                token = 'RenewToken456';
            }
            return q.when(token);
        };

        controller('TaskCtl', { $scope: scope, adalAuthenticationService: adalServiceProvider });
    }));

    it('assigns user', function () {
        expect(scope.user.userName).toBe('UserVerify');
        expect(scope.user.isAuthenticated).toBe(true);
    });

    it('send tokens for webapi call in endpoints list', function () {
        $httpBackend.expectGET('/api/Todo/5', function (headers) {
            return headers.Authorization === 'Bearer Token3434';
        }).respond(200, { id: 5, name: 'TODOItem1' });
        scope.taskCall();
        $httpBackend.flush();

        var task = scope.task;
        expect(task.name).toBe('TODOItem1');
    });

    it('send tokens for webapi call in endpoints list', function () {
        $httpBackend.expectGET('/anotherApi/Item/13', function (headers) {
            console.log('headers test' + headers.Authorization);
            return headers.Authorization === 'Bearer Token123';
        }).respond(200, { id: 5, itemName: 'ItemWithoutAuth' });
        scope.itemCall();
        $httpBackend.flush();

        var task = scope.item;
        expect(task.itemName).toBe('ItemWithoutAuth');
    });

    it('send tokens for webapi call in endpoints list', function () {
        $httpBackend.expectGET('https://testapi.com/', function (headers) {
            return headers.Authorization === 'Bearer Token3434';
        }).respond(200);
        scope.taskCall3();
        $httpBackend.flush();
    });

    it('does not send tokens for webapi(https) call not in endpoints list', function () {
       $httpBackend.expectGET('https://test.com/', function (headers) {
          return headers.hasOwnProperty('Authorization') === false;
       }).respond(200);
       scope.taskCall2();
       $httpBackend.flush();
    });

    it('does not send tokens for webapi(http) call not in endpoint list', function () {
        $httpBackend.expectGET('http://testwebapi.com/', function (headers) {
            return headers.hasOwnProperty('Authorization') === false;
        }).respond(200);
        scope.taskCall6();
        $httpBackend.flush();    
    });

    it ('send tokens for app backend call not in endpoints list', function () {
        $httpBackend.expectGET('/someapi/item', function (headers) {
            return headers.Authorization === 'Bearer Token456'
        }).respond(200);
        scope.taskCall4();
        $httpBackend.flush();
    });

    it('send tokens for app backend call', function () {
        $httpBackend.expectGET('https://myapp.com/someapi/item', function (headers) {
            return headers.Authorization === 'Bearer Token456'
        }).respond(200);
        scope.taskCall5();
        $httpBackend.flush();
    });

    it('renews tokens for app backend', function () {
        // This makes adal to try renewing the token since no token is returned from cache
        adalServiceProvider.getCachedToken = function () {
            return '';
        };
        $httpBackend.expectGET('https://myapp.com/someapi/item', function (headers) {
            return headers.Authorization === 'Bearer RenewToken456';
        }).respond(200, { id: 5, name: 'TODOItem2' });
        scope.taskCall5();
        $httpBackend.flush();

        var task = scope.task;
        expect(task.name).toBe('TODOItem2');
    });

    it('renews tokens for webapi in endpoint list', function () {
        adalServiceProvider.getCachedToken = function () {
            return '';
        };
        $httpBackend.expectGET('/anotherApi/Item/13', function (headers) {
            console.log('headers test' + headers.Authorization);
            return headers.Authorization === 'Bearer RenewToken123';
        }).respond(200, { id: 5, itemName: 'ItemWithoutAuth' });
        scope.itemCall();
        $httpBackend.flush();

        var task = scope.item;
        expect(task.itemName).toBe('ItemWithoutAuth');
    });

    it('renews tokens for webapi in endpoint list', function () {
        adalServiceProvider.getCachedToken = function () {
            return '';
        };
        $httpBackend.expectGET('https://testapi.com/', function (headers) {
            return headers.Authorization === 'Bearer RenewToken3434';
        }).respond(200);
        scope.taskCall3();
        $httpBackend.flush();
    });

    it('tests errorResponse broadcast when login is in progress', function () {
        adalServiceProvider.getCachedToken = function () {
            return '';
        };
        adalServiceProvider.loginInProgress = function () {
            return true;
        };
        spyOn(rootScope, '$broadcast').andCallThrough();
        $httpBackend.expectGET('https://myapp.com/someapi/item', function (headers) {
            return headers.Authorization === 'Bearer Token456'
        }).respond(200);

        rootScope.$on('adal:errorResponse', function (event, message) {
            expect(event.name).toBe('adal:errorResponse');
            expect(message).toBe('login in progress, cancelling the request');
        });
        scope.taskCall5();
        rootScope.$apply();
        expect(rootScope.$broadcast).toHaveBeenCalledWith('adal:errorResponse', 'login in progress, cancelling the request');
    });

    it('tests stateMismatch broadcast when state does not match', function () {
        window.parent.AuthenticationContext = function () {
            return {
                callback: function () { },
                _renewStates: { }
            };
        };
        window.location.hash = 'id_token=sample&state=4343';
        spyOn(rootScope, '$broadcast').andCallThrough();
        rootScope.$on('adal:stateMismatch', function (event, message) {
            expect(event.name).toBe('adal:stateMismatch');
            expect(message).toBe('Invalid_state. state: 4343');
        });
        rootScope.$apply();
        expect(rootScope.$broadcast).toHaveBeenCalled();
    });
});
