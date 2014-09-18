'use strict';
app.controller('TodoListController', ['$scope', '$location', 'TodoService', function ($scope, $location, TodoService) {

    $scope.TodoList = null;
    $scope.Populate = function () {
        TodoService.getItems().then(function (results) {
            $scope.TodoList = results;  
        })
    };

}]);