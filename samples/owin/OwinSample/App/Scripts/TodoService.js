'use strict';
app.factory('todoService', ['$http', function ($http) {
    var serviceFactory = {};

    var _getItems = function () {
        return $http.get('/api/Values');
    };

    var _getItem = function (id) {
        return $http.get('/api/Values/' + id);
    };

    serviceFactory.getItems = _getItems;
    serviceFactory.getItem = _getItem;

    return serviceFactory;
}]);