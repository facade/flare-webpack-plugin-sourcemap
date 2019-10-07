"use strict";
exports.__esModule = true;
var axios_1 = require("axios");
var zlib = require('zlib');
function flareLog(message, isError) {
    if (isError === void 0) { isError = false; }
    var formattedMessage = 'flare-webpack-plugin-sourcemap: ' + message;
    if (isError) {
        console.error('\n' + formattedMessage + '\n');
        return;
    }
    console.log('\n' + formattedMessage + '\n');
}
var FlareWebpackPluginSourcemap = /** @class */ (function () {
    function FlareWebpackPluginSourcemap(_a) {
        var key = _a.key, apiEndpoint = _a.apiEndpoint, runInDevelopment = _a.runInDevelopment, failBuildOnError = _a.failBuildOnError;
        this.key = key;
        this.apiEndpoint = apiEndpoint || 'https://flareapp.io/api/sourcemaps';
        this.runInDevelopment = runInDevelopment || false;
        this.failBuildOnError = failBuildOnError || false;
    }
    FlareWebpackPluginSourcemap.prototype.apply = function (compiler) {
        var _this = this;
        if (!this.verifyOptions(compiler)) {
            return;
        }
        compiler.hooks.afterEmit.tapPromise('FlareWebpackPluginSourcemap', function (compilation) {
            flareLog('Uploading sourcemaps to Flare');
            return _this.sendSourcemaps(compilation)
                .then(function () {
                flareLog('Successfully uploaded sourcemaps to Flare.');
            })["catch"](function () {
                var errorMessage = "\n\n---\nSomething went wrong while uploading sourcemaps to Flare.\nErrors may have been outputted above.\n---\n";
                if (_this.failBuildOnError) {
                    throw new Error(errorMessage);
                }
                flareLog(errorMessage, true);
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
        var _this = this;
        return new Promise(function (resolve, reject) {
            var sourcemaps = _this.getSourcemaps(compilation);
            if (!sourcemaps.length) {
                flareLog('No sourcemap files were found. Make sure sourcemaps are being generated!', true);
                return reject();
            }
            Promise.all(sourcemaps.map(function (sourcemap) { return _this.uploadSourcemap(sourcemap); }))
                .then(function () { return resolve(); })["catch"](function (err) {
                flareLog(err, true);
                return reject();
            });
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
    FlareWebpackPluginSourcemap.prototype.uploadSourcemap = function (sourcemap) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            zlib.deflate(sourcemap.content, function (error, buffer) {
                if (error) {
                    console.error('Something went wrong while compressing the sourcemap content:');
                    reject(error);
                }
                var gzippedSourcemap = buffer.toString();
                axios_1["default"]
                    .post(_this.apiEndpoint, {
                    key: _this.key,
                    version_id: 'test_version',
                    relative_filename: sourcemap.filename,
                    sourcemap: gzippedSourcemap
                })
                    .then(function () { return resolve(); })["catch"](function (error) {
                    flareLog(error.response.status + ": " + error.response.data.message, true);
                    return reject(error);
                });
            });
        });
    };
    return FlareWebpackPluginSourcemap;
}());
module.exports = FlareWebpackPluginSourcemap;
