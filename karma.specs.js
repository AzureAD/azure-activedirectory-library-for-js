var testsContext = require.context('./src', true, /\.spec\.ts/);

testsContext.keys().forEach(testsContext);