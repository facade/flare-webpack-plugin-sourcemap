const FlareWebpackPlugin = require('./index').FlareWebpackPlugin;
/* const FlareWebpackPlugin = require('./webpackPlugin').FlareWebpackPlugin; */
const mix = require('laravel-mix');

class FlareMixPlugin {
    constructor(config) {
        this.config = config;
    }

    webpackPlugins() {
        return new FlareWebpackPlugin(this.config);
    }
}

mix.extend('flare', new FlareMixPlugin());
