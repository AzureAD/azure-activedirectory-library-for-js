exports.config = {
	seleniumAddress:'http://localhost:4444/wd/hub',
	specs: ['tests/e2eTestsSpec.js'],
	firefoxPath: 'C:\Program Files (x86)\Mozilla Firefox\firefox',
	onPrepare: function(){
		browser.driver.manage().window().setPosition(0,0);
		browser.driver.manage().window().setSize(1280,720);
	},
	capabilities: {
	    'browserName': 'chrome',
	    "loggingPrefs": { "driver": "INFO", "server": "OFF", "browser": "FINE" }
	},
}