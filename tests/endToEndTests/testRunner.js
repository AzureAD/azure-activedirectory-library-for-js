var exec = require('child_process').exec;
var fs = require('fs');

var configurationFiles = [
    "protractor.conf.chrome.js",
    "protractor.conf.firefox.js",
    "protractor.conf.ie.js",
    "protractor.conf.safari.js",
    "protractor.conf.androidNexus5.js",
    "protractor.conf.edge.js",
];

var i = 0;

var runProtractorConfiguration = function () {
    console.log("Running " + configurationFiles[i]);
    var testCommand = 'node protractorTestWrapper.js ' + configurationFiles[i];
    exec(testCommand,
        function (error, stdout, stderr) {
            console.log("Completed " + configurationFiles[i]);
            fs.writeFileSync("output-" + configurationFiles[i], stdout);
            i++;
            if (i < configurationFiles.length) {
                runProtractorConfiguration();
            }
        });
}

runProtractorConfiguration();