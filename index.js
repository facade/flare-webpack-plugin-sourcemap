"use strict";
exports.__esModule = true;
var FlareWebpackPluginSourcemap = /** @class */ (function () {
    function FlareWebpackPluginSourcemap(_a) {
        var key = _a.key, apiEndpoint = _a.apiEndpoint;
        this.key = key;
        this.apiEndpoint = apiEndpoint || 'https://flareapp.io/api/reports';
    }
    FlareWebpackPluginSourcemap.prototype.apply = function (compiler) {
        var _this = this;
        compiler.hooks.afterEmit.tapPromise('FlareWebpackPluginSourcemap', function () { return _this.afterEmit(); });
    };
    FlareWebpackPluginSourcemap.prototype.afterEmit = function () {
        var _this = this;
        return new Promise(function (resolve) {
            console.log(_this.key, _this.apiEndpoint);
            resolve();
        });
    };
    return FlareWebpackPluginSourcemap;
}());
module.exports = FlareWebpackPluginSourcemap;
