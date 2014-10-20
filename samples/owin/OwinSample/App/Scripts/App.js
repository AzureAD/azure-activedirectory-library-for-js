//----------------------------------------------------------------------
// Copyright (c) Microsoft Open Technologies, Inc.
// All Rights Reserved
// Apache License 2.0
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//----------------------------------------------------------------------

'use strict';
var app = angular.module('adalDemo', ['ngRoute', 'AdalAngular']);

app.config(['$httpProvider', '$routeProvider', 'adalAuthenticationServiceProvider', function ($httpProvider, $routeProvider, adalAuthenticationServiceProvider) {

    $routeProvider.when('/home', {
        controller: 'homeController',
        templateUrl: '/App/Views/landingPage.html'
    }).
    when('/login', {
        controller: 'homeController',
        templateUrl: '/App/Views/login.html'
    }).
    when('/todoList', {
        controller: 'todoListController',
        templateUrl: '/App/Views/todoList.html',
        requireADLogin: true
    }).
    when('/todoList/detail/:param', {
        controller: 'todoDetailController',
        templateUrl: '/App/Views/todoDetail.html'
    }).
    when('/todoList/new', {
        controller: 'todoDetailController',
        templateUrl: '/App/Views/todoNew.html'
    }).
        when('/contactList', {
            controller: 'contactController',
            templateUrl: '/App/Views/contact.html'
        }).
        
    otherwise({ redirectTo: '/home' });

    // endpoint to resource mapping(optional)
    var endpoints = {
        'http://adaljscors.azurewebsites.net/api/': 'be9ce842-47f2-456e-96c1-5a180c765a28',
    };

    adalAuthenticationServiceProvider.init(
        {
            // Config to specify endpoints and similar for your app
            tenant: '52d4b072-9470-49fb-8721-bc3a1c9912a1',
            clientId: '44d0ebf6-0eef-4186-89c2-7edce2fb3964',
            instance: 'https://login.windows-ppe.net/',
            //redirectUri : 'your site', optional
            endpoints: endpoints  // optional
        },
        $httpProvider   // pass http provider to inject request interceptor to attach tokens
        );
}]);