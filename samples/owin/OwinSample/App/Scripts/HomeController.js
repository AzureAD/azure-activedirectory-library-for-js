'use strict';
app.controller('HomeController', ['$scope', '$location', 'AuthenticationService', function ($scope, $location, AuthenticationService) {
    // this is referencing adal module to do login
    //$scope.adalAuthData = AuthenticationService.userInfo;
    $scope.testMessage = "";
    $scope.logout = function () {
        AuthenticationService.logOut();
    };

    $scope.login = function () {
        AuthenticationService.login();
    };

    $scope.$on("adal:loginSuccess", function () {
        console.log("scope gets event login sucsses");
        $scope.testMessage = "loginSuccess";
        $location.path("/home");
    });

    $scope.$on("adal:loginFailure", function () {
        console.log("scope gets event loginFailure");
        $scope.testMessage = "loginFailure";
        $location.path("/login");
    });

    $scope.$on("adal:notAuthorized", function (event, rejection, forResource) {
        console.log("scope gets event loginFailure");
        $scope.testMessage = "It is not Authorized for resource:" + forResource;

    });

    $scope.init = function () {
        $scope.testMessage = "";
    };

}]);