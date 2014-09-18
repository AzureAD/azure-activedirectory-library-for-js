var jasmine = require('jasmine-node');

var Adal = require('../../../lib/adal.js');
 
describe("Adal", function () {
    var adal;
    var testPage = "this is a song";

    beforeEach(function () {
        adal = new Adal();        
    });


    it("set start page", function () {
	adal.setStartPage(testPage);
        expect(adal.startPage).toEqual(testPage);        
    });    
});

env = jasmine.getEnv().execute();