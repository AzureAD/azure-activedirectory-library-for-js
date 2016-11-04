exports.config = {
  framework: 'jasmine',
  seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: ['tests/e2eTestsSpec.js'],
  capabilities: {
    browserName: 'firefox'
  },
  directConnect: true
}