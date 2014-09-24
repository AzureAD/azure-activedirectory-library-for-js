'use strict';
app.controller('homeController', ['$scope', '$location', 'adalAuthenticationService', function ($scope, $location, adalAuthenticationService) {
    // this is referencing adal module to do login

    //userInfo is defined at the $rootscope with adalAngular module
    $scope.testMessage = "";
    $scope.init = function () {
        $scope.testMessage = "";
    };

    $scope.logout = function () {
        adalAuthenticationService.logOut();
    };

    $scope.login = function () {
        adalAuthenticationService.login();
    };

    // optional
    $scope.$on("adal:loginSuccess", function () {
        $scope.testMessage = "loginSuccess";
    });

    // optional
    $scope.$on("adal:loginFailure", function () {
        $scope.testMessage = "loginFailure";
        $location.path("/login");
    });

    // optional
    $scope.$on("adal:notAuthorized", function (event, rejection, forResource) {
        $scope.testMessage = "It is not Authorized for resource:" + forResource;
    });

  
}]);