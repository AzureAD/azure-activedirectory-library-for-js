'use strict';
var AdalOauthConfig = {
    // TODO add defaults
    // Config to specify endpoints and similar for your app
    tenant: "52d4b072-9470-49fb-8721-bc3a1c9912a1",
    client_id: "e9a5a8b6-8af7-4719-9821-0deef255f68e",
    redirect_uri: "http://localhost:49724/ADALJSCallback.html",
    resource: "b6a68585-5287-45b2-ba82-383ba1f60932",
    endpoint: "https://login.windows-ppe.net/",
    post_logout_redirect_uri: "http://localhost:49724/mySPA.html"
};

var app = angular.module('bull', ['ngRoute', 'AdalAngular']);

app.config(function ($routeProvider) {

    $routeProvider.when("/home", {
        controller: "HomeController",
        templateUrl: "/App/Views/Home.html"
    });

    $routeProvider.when("/TodoList", {
        controller: "TodoListController",
        templateUrl: "/App/Views/TodoList.html"
    });
    
    $routeProvider.when("/TodoList/Detail/:param", {
        controller: "TodoDetailController",
        templateUrl: "/App/Views/TodoDetail.html"
    });

    $routeProvider.otherwise({ redirectTo: "/home" });
});


// ======= These are added to manage login ===================
app.config(function ($httpProvider) {
    // Http call interceptor
    // Optional adal token interceptor is used here to intercept http request/response
    $httpProvider.interceptors.push('TokenInterceptor');
});
