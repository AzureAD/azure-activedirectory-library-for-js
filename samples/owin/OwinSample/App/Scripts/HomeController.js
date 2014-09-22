'use strict';
app.controller('HomeController', ['$scope', '$location', 'TokenService', function ($scope, $location, TokenService) {
    // this is referencing adal module to do login
    $scope.adalAuthData = TokenService.oauthData;
    $scope.testMessage = "";
    $scope.logout = function () {
        TokenService.logOut();
    };

    $scope.login = function () {
        TokenService.login();
    };

    $scope.clearCache = function () {
        TokenService.clearCache();
    };

    $scope.renew = function () {
        // test renew for default resource
        TokenService.acquireToken().then(
            function (token) {
                $scope.testMessage = "It received token";
            }, function (err) {
                $scope.testMessage = " Renew error:" + err;
            });
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