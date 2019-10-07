"use strict";
exports.__esModule = true;
var axios_1 = require("axios");
function flareLog(message, isError) {
    if (isError === void 0) { isError = false; }
    var formattedMessage = 'flare-webpack-plugin-sourcemap: ' + message;
    if (isError) {
        console.error(formattedMessage);
        return;
    }
    console.log(formattedMessage);
}
var FlareWebpackPluginSourcemap = /** @class */ (function () {
    function FlareWebpackPluginSourcemap(_a) {
        var key = _a.key, apiEndpoint = _a.apiEndpoint, runInDevelopment = _a.runInDevelopment;
        this.key = key;
        this.apiEndpoint = apiEndpoint || 'https://flareapp.io/api/sourcemaps';
        this.runInDevelopment = runInDevelopment || false;
    }
    FlareWebpackPluginSourcemap.prototype.apply = function (compiler) {
        var _this = this;
        if (!this.verifyOptions(compiler)) {
            return;
        }
        compiler.hooks.afterEmit.tapPromise('FlareWebpackPluginSourcemap', function (compilation) {
            flareLog('\nUploading sourcemaps to Flare');
            return _this.sendSourcemaps(compilation)
                .then(function () {
                flareLog('Successfully uploaded sourcemaps to Flare.');
            })["catch"](function () {
                flareLog("Something went wrong while uploading sourcemaps to Flare. Errors may have been outputted above.", true);
            });
        });
    };
    FlareWebpackPluginSourcemap.prototype.verifyOptions = function (compiler) {
        if (!this.key) {
            flareLog('No Flare project key was provided, not uploading sourcemaps to Flare.', true);
            return false;
        }
        if (!this.runInDevelopment && compiler.options.mode === 'development') {
            flareLog('Running webpack in development mode, not uploading sourcemaps to Flare.');
            return false;
        }
        return true;
    };
    FlareWebpackPluginSourcemap.prototype.sendSourcemaps = function (compilation) {
        var sourcemaps = this.getSourcemaps(compilation);
        if (!sourcemaps.length) {
            flareLog('No sourcemap files were found. Make sure sourcemaps are being generated!', true);
            return Promise.reject();
        }
        return this.uploadSourcemaps(sourcemaps)
            .then(function () { return Promise.resolve(); })["catch"](function (err) {
            flareLog(err, true);
            throw new Error();
        });
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
            return axios_1["default"]
                .post(_this.apiEndpoint, {
                key: _this.key,
                version_id: 'test_version',
                relative_filename: sourcemap.filename,
                sourcemap: sourcemap.content
            })["catch"](function (error) {
                flareLog(error.response.status + ": " + error.response.data.message, true);
                throw error;
            });
        }));
    };
    return FlareWebpackPluginSourcemap;
}());
module.exports = FlareWebpackPluginSourcemap;
