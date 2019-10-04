import webpack = require('webpack');

type PluginOptions = {
    key: string;
    apiEndpoint: string;
};

class FlareWebpackPluginSourcemap {
    key: PluginOptions['key'];
    apiEndpoint: PluginOptions['apiEndpoint'];

    constructor({ key, apiEndpoint }: PluginOptions) {
        this.key = key;
        this.apiEndpoint = apiEndpoint || 'https://flareapp.io/api/reports';
    }

    apply(compiler: webpack.Compiler) {
        compiler.hooks.afterEmit.tapPromise('FlareWebpackPluginSourcemap', () => this.afterEmit());
    }

    afterEmit() {
        return new Promise(resolve => {
            console.log(this.key, this.apiEndpoint);
            resolve();
        });
    }
}

module.exports = FlareWebpackPluginSourcemap;
