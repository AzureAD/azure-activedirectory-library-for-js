//----------------------------------------------------------------------
// @preserve Copyright (c) Microsoft Open Technologies, Inc.
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

'use strict';
// Test app
var app = angular.module('TestApplication', ['ngResource', 'ngRoute', 'AdalAngular']);

app.config(['$httpProvider', '$routeProvider', 'adalAuthenticationServiceProvider', function ($httpProvider, $routeProvider, adalAuthenticationServiceProvider) {

    $routeProvider.
    when('/todoList', {
        controller: 'todoListController',
        templateUrl: '/App/Views/todoList.html',
        requireADLogin: true
    }).
    otherwise({ redirectTo: '/home' });

    var endpoints = {
        '/api/Todo/': 'resource1',
	'/anotherApi/Item/': 'resource2'
    };

    adalAuthenticationServiceProvider.init(
        {
            tenant: 'tenantid123',
            clientId: 'clientid123',
            loginResource: 'loginResource123',
            endpoints: endpoints  // optional
        },
        $httpProvider   // pass http provider to inject request interceptor to attach tokens
        );
}]);

app.factory('ItemFactory', ['$http', function ($http) {
    var serviceFactory = {};
    var _getItem = function (id) {
        return $http.get('/anotherApi/Item/' + id);
    };
    serviceFactory.getItem = _getItem;
    return serviceFactory;
}]);

app.factory('TaskFactory', ['$http', function ($http) {
    var serviceFactory = {};
    var _getItem = function (id) {
        return $http.get('/api/Todo/' + id);
    };
    serviceFactory.getItem = _getItem;
    return serviceFactory;
}]);

app.controller('WidgetCtl', function ($scope, WidgetFactory) {
    $scope.text = 'Hello Test!';

    $scope.widget = WidgetFactory.get();
});

app.controller('TaskCtl', ['$scope', '$location', 'adalAuthenticationService', 'TaskFactory', 'ItemFactory', function ($scope, $location, adalAuthenticationService, TaskFactory, ItemFactory) {

    $scope.taskCall = function () {
        TaskFactory.getItem(5).success(function (data) {
            $scope.task = data;
        }).error(function (err) {
            $scope.error = err;
            $scope.loadingMsg = "";
        });
    }

    $scope.itemCall = function () {
        ItemFactory.getItem(13).success(function (data) {
            $scope.item = data;
        }).error(function (err) {
            $scope.error = err;
            $scope.loadingMsg = "";
        });
    }

    $scope.user = adalAuthenticationService.userInfo;
}]);
