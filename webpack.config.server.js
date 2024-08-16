//const webpack = require('webpack')
const path = require('path')
const nodeExternals = require('webpack-node-externals')
const StartServerPlugin  = require('start-server-webpack-plugin')
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');


module.exports = {
    entry: [
        //'webpack/hot/poll?1000',
        './src/server/index'
    ],
    watch: true,
    //target: 'node',
    externals: [nodeExternals()],
    module: {
        rules: [{
            test: /\.js?$/,
            use: 'babel-loader',
            exclude: /node_modules/
        }]
    },
    plugins: [
        /*new StartServerPlugin('server.js'),
        new webpack.NamedModulesPlugin(),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoEmitOnErrorsPlugin(),
        new webpack.DefinePlugin({
            "process.env": {
                "BUILD_TARGET": JSON.stringify('server')
            }
        }),*/
        new RunScriptWebpackPlugin({
            name: 'server.js',
        }),
    ],
    output: {
        path: path.join(__dirname, 'prod/server'),
        filename: 'server.js'
    }
}