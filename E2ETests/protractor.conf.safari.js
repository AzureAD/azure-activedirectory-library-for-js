exports.config = {
    framework: 'jasmine',
    'seleniumAddress': 'http://hub-cloud.browserstack.com/wd/hub',
    specs: ['tests/e2eTestsSpec.js'],
    capabilities: {
        'acceptSslCerts': true,
        'browserstack.user': 'xxx',
        'browserstack.key': 'xxx',
        'os': 'OS X',
        'os_version': 'Yosemite',
        'browserName': 'Safari',
        'browser_version': '8.0',
        'resolution': '1024x768',
        'browserstack.safari.enablePopups': true,
        'project': 'adalJs',
        'build': 'adalJsSafariR'
    },
}