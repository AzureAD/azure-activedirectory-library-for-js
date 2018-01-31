
module.exports = {
    entry: "./src/index.ts",
    output: {
        path: __dirname,
        filename: "dist/index.js",
        libraryTarget: 'umd', // !!
        // Name of the generated global.
        library: 'adaljs'
    },

    resolve: {

        /*
         * An array of extensions that should be used to resolve modules.
         *
         * See: http://webpack.github.io/docs/configuration.html#resolve-extensions
         */
        extensions: ['.ts', '.js', '.json'],

    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader'
            }
        ]
    }
};