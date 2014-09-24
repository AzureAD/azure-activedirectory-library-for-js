'use strict';
app.controller('todoListController', ['$scope', '$location', 'todoService', function ($scope, $location, todoService) {
    $scope.error = "";
    $scope.loadingMsg = "Loading...";
    $scope.TodoList = null;
    $scope.Populate = function () {
        todoService.getItems().success(function (results) {
            $scope.TodoList = results;
            $scope.loadingMsg = "";
        }).error(function (err) {
            $scope.error = err;
            $scope.loadingMsg = "";
        })
    };

}]);