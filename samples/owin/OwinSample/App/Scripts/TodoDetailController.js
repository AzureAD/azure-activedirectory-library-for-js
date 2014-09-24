'use strict';
app.controller('todoDetailController', ['$scope', '$location', 'todoService', function ($scope, $location, todoService) {

    $scope.TodoList = null;
    $scope.Populate = function () {
        todoService.getItems().then(function (results) {
            $scope.TodoList = results;  
        })
    };

}]);