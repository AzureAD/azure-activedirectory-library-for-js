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
    var scope, $httpBackend, adalServiceProvider, rootScope, controller;

    //mock Application to allow us to inject our own dependencies
    beforeEach(angular.mock.module('TestApplication'));

    //mock the controller for the same reason and include $rootScope and $controller
    beforeEach(angular.mock.inject(function (_adalAuthenticationService_, _$rootScope_, _$controller_, _$httpBackend_) {
        adalServiceProvider = _adalAuthenticationService_;
        rootScope = _$rootScope_;
        controller = _$controller_;
        $httpBackend = _$httpBackend_;
         
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


            return '';
        };

        controller('TaskCtl', { $scope: scope, adalAuthenticationService: adalServiceProvider });
    }));

    it('assigns user', function () {
        expect(scope.user.userName).toBe('UserVerify');
        expect(scope.user.isAuthenticated).toBe(true);
    });

    it('injects tokens for webapi call for given endpoint', function () {
        $httpBackend.expectGET('/api/Todo/5', function (headers) {
            return headers.Authorization === 'Bearer Token3434';
        }).respond(200, { id: 5, name: 'TODOItem1' });
        scope.taskCall();
        $httpBackend.flush();

        var task = scope.task;
        expect(task.name).toBe('TODOItem1');
    });

    it('does not sent tokens for other webapi calls', function () {
        $httpBackend.expectGET('/anotherApi/Item/13', function (headers) {
            console.log('headers test' + headers.Authorization);
            return headers.Authorization === 'Bearer Token123';
        }).respond(200, { id: 5, itemName: 'ItemWithoutAuth' });
        scope.itemCall();
        $httpBackend.flush();

        var task = scope.item;
        expect(task.itemName).toBe('ItemWithoutAuth');
    });

});