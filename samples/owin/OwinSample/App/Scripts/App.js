'use strict';
var app = angular.module('bull', ['ngRoute', 'AdalAngular']);

app.config(function ($routeProvider, AuthenticationServiceProvider) {

    $routeProvider.when("/home", {
        controller: "HomeController",
        templateUrl: "/App/Views/Home.html"
    });

    $routeProvider.when("/login", {
        controller: "HomeController",
        templateUrl: "/App/Views/Login.html"
    });

    $routeProvider.when("/TodoList", {
        controller: "TodoListController",
        templateUrl: "/App/Views/TodoList.html",
        requireADLogin: true
    });

    $routeProvider.when("/TodoList/Detail/:param", {
        controller: "TodoDetailController",
        templateUrl: "/App/Views/TodoDetail.html"
    });

    $routeProvider.otherwise({ redirectTo: "/home" });

    // endpoint to resource mapping(optional)
    var endpoints = {
        "/api/Values": "b6a68585-5287-45b2-ba82-383ba1f60932",        
    };

    AuthenticationServiceProvider.init(
        {
            // Config to specify endpoints and similar for your app
            tenant: "52d4b072-9470-49fb-8721-bc3a1c9912a1",
            client_id: "e9a5a8b6-8af7-4719-9821-0deef255f68e",
            loginResource: "b6a68585-5287-45b2-ba82-383ba1f60932",
            instance: "https://login.windows-ppe.net/",
            //localLoginUrl: "/login",  // optional
            endpoints: endpoints  // optional
        });
});

// ======= These are added to manage login ===================
app.config(function ($httpProvider) {
    // Http call interceptor
    // Optional adal token interceptor is used here to intercept http request/response
    $httpProvider.interceptors.push('ProtectedResourceInterceptor');
});
