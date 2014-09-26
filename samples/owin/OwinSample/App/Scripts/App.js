'use strict';
var app = angular.module('adalDemo', ['ngRoute', 'AdalAngular']);

app.config(['$httpProvider', '$routeProvider', 'adalAuthenticationServiceProvider', function ($httpProvider, $routeProvider, adalAuthenticationServiceProvider) {

    $routeProvider.when("/home", {
        controller: "homeController",
        templateUrl: "/App/Views/landingPage.html"
    }).
    when("/login", {
        controller: "homeController",
        templateUrl: "/App/Views/login.html"
    }).
    when("/todoList", {
        controller: "todoListController",
        templateUrl: "/App/Views/todoList.html",
        requireADLogin: true
    }).
    when("/todoList/detail/:param", {
        controller: "todoDetailController",
        templateUrl: "/App/Views/todoDetail.html"
    }).
    otherwise({ redirectTo: "/home" });

    // endpoint to resource mapping(optional)
    var endpoints = {
        "/api/Values": "b6a68585-5287-45b2-ba82-383ba1f60932",
    };

    adalAuthenticationServiceProvider.init(
        {
            // Config to specify endpoints and similar for your app
            tenant: "52d4b072-9470-49fb-8721-bc3a1c9912a1",
            clientId: "e9a5a8b6-8af7-4719-9821-0deef255f68e",
            loginResource: "b6a68585-5287-45b2-ba82-383ba1f60932",
            instance: "https://login.windows-ppe.net/",
            //localLoginUrl: "/login",  // optional
            //redirectUri : "your site", optional
            endpoints: endpoints  // optional
        },
        $httpProvider   // pass http provider to inject request interceptor to attach tokens
        );
}]);