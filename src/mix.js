const mix = require('laravel-mix');
import FlareWebpackPlugin from './index';

/* class FlareMixPlugin {
    constructor(config) {
        this.config = config;
    }

    webpackPlugins() {
        return new FlareWebpackPlugin(this.config);
    }
}

mix.extend('flare', new FlareMixPlugin()); */

mix.extend(
    'flare',
    new (class {
        register(val) {
            console.log('mix.foo() was called with ' + val);
        }

        dependencies() {}

        webpackRules() {}

        webpackPlugins() {}

        // ...
    })()
);
