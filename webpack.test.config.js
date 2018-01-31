/**
 * Webpack Plugins
 */
const LoaderOptionsPlugin = require('webpack/lib/LoaderOptionsPlugin');

module.exports = function () {
    return {

        devtool: 'inline-source-map',

        resolve: {
            extensions: ['.ts', '.js']
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    loader: 'awesome-typescript-loader',
                    query: {
                        sourceMap: false,
                        inlineSourceMap: true,
                        compilerOptions: {
                            removeComments: true

                        }
                    }
                },
                {
                    enforce: 'post',
                    test: /\.(js|ts)$/,
                    loader: 'istanbul-instrumenter-loader',
                    exclude: [
                        /\.(e2e|spec)\.ts$/,
                        /node_modules/
                    ]
                }
            ],
        },
        /**
         * Add additional plugins to the compiler.
         *
         * See: http://webpack.github.io/docs/configuration.html#plugins
         */
        plugins: [

            /**
             * Plugin LoaderOptionsPlugin (experimental)
             *
             * See: https://gist.github.com/sokra/27b24881210b56bbaff7
             */
            new LoaderOptionsPlugin({
                debug: true,
                options: {}
            })
        ],
        stats: {
            colors: true,
            reasons: true
        }
    }
};