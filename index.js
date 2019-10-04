"use strict";
exports.__esModule = true;
var axios_1 = require("axios");
var FlareWebpackPluginSourcemap = /** @class */ (function () {
    function FlareWebpackPluginSourcemap(_a) {
        var key = _a.key, apiEndpoint = _a.apiEndpoint;
        this.key = key;
        this.apiEndpoint = apiEndpoint || 'https://flareapp.io/api/sourcemaps';
    }
    FlareWebpackPluginSourcemap.prototype.apply = function (compiler) {
        var _this = this;
        compiler.hooks.afterEmit.tapPromise('FlareWebpackPluginSourcemap', function (compilation) {
            return _this.sendSourcemaps(compilation);
        });
    };
    FlareWebpackPluginSourcemap.prototype.sendSourcemaps = function (compilation) {
        var sourcemaps = this.getSourcemaps(compilation);
        return this.uploadSourcemaps(sourcemaps).then(function () { return Promise.resolve(); });
    };
    FlareWebpackPluginSourcemap.prototype.getSourcemaps = function (compilation) {
        return compilation
            .getStats()
            .toJson()
            .chunks.reduce(function (sourcemaps, currentChunk) {
            var filename = currentChunk.files.find(function (file) { return /\.js$/.test(file); });
            var sourcemapUrl = currentChunk.files.find(function (file) { return /\.js\.map$/.test(file); });
            if (filename && sourcemapUrl) {
                var content = compilation.assets[sourcemapUrl].source();
                sourcemaps = sourcemaps.concat([{ filename: filename, content: content }]);
            }
            return sourcemaps;
        }, []);
    };
    FlareWebpackPluginSourcemap.prototype.uploadSourcemaps = function (sourcemaps) {
        var _this = this;
        return Promise.all(sourcemaps.map(function (sourcemap) {
            axios_1["default"]
                .post(_this.apiEndpoint, {
                key: _this.key,
                version_id: 'test_version',
                relative_filename: sourcemap.filename,
                sourcemap: sourcemap.content
            })["catch"](function (err) {
                console.error(err);
                // TODO: catch some response statuses & display error messages for these (401, …)
            });
        }));
    };
    return FlareWebpackPluginSourcemap;
}());
module.exports = FlareWebpackPluginSourcemap;
