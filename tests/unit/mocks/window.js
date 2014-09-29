var events = require('events');
var eventEmitter = new events.EventEmitter();
var document = {};
module.exports = function(config) {
   var _hash = config.hash;
    return {
        location: {
            reload: function() {
            },
            hash: function(newHash) {
                return _hash ;
            } 
        }
  };
};