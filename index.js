"use strict";
exports.__esModule = true;
var webpack = require("webpack");
var zlib = require("zlib");
var axios_1 = require("axios");
var util_1 = require("./util");
var FlareWebpackPluginSourcemap = /** @class */ (function () {
    function FlareWebpackPluginSourcemap(_a) {
        var key = _a.key, _b = _a.apiEndpoint, apiEndpoint = _b === void 0 ? 'https://flareapp.io/api/sourcemaps' : _b, _c = _a.runInDevelopment, runInDevelopment = _c === void 0 ? false : _c, _d = _a.versionId, versionId = _d === void 0 ? util_1.uuidv4() : _d, _e = _a.addGitInfo, addGitInfo = _e === void 0 ? false : _e;
        this.key = key;
        this.apiEndpoint = apiEndpoint;
        this.runInDevelopment = runInDevelopment;
        this.versionId = versionId;
        this.addGitInfo = addGitInfo;
    }
    FlareWebpackPluginSourcemap.prototype.apply = function (compiler) {
        var _this = this;
        if (!this.verifyOptions(compiler)) {
            return;
        }
        new webpack.DefinePlugin({
            FLARE_SOURCEMAP_VERSION: JSON.stringify(this.versionId),
            FLARE_GIT_INFO: this.addGitInfo ? JSON.stringify(util_1.getGitInfo(compiler.options.context)) : {}
        }).apply(compiler);
        compiler.hooks.afterEmit.tapPromise('GetSourcemapsAndUploadToFlare', function (compilation) {
            util_1.flareLog('Uploading sourcemaps to Flare');
            return _this.sendSourcemaps(compilation)
                .then(function () {
                util_1.flareLog('Successfully uploaded sourcemaps to Flare.');
            })["catch"](function (error) {
                var errorMessage = 'Something went wrong while uploading sourcemaps to Flare. ' +
                    'Additional information may have been outputted above.';
                compilation.errors.push("flare-webpack-plugin-sourcemap: " + error);
                compilation.errors.push("flare-webpack-plugin-sourcemap: " + errorMessage);
                util_1.flareLog(errorMessage);
            });
        });
    };
    FlareWebpackPluginSourcemap.prototype.verifyOptions = function (compiler) {
        if (!this.key) {
            util_1.flareLog('No Flare project key was provided, not uploading sourcemaps to Flare.', true);
            return false;
        }
        if (!this.runInDevelopment && compiler.options.mode === 'development') {
            util_1.flareLog('Running webpack in development mode, not uploading sourcemaps to Flare.');
            return false;
        }
        return true;
    };
    FlareWebpackPluginSourcemap.prototype.sendSourcemaps = function (compilation) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var sourcemaps = _this.getSourcemaps(compilation);
            if (!sourcemaps.length) {
                util_1.flareLog('No sourcemap files were found. Make sure sourcemaps are being generated!', true);
                return reject();
            }
            Promise.all(sourcemaps.map(function (sourcemap) { return _this.uploadSourcemap(sourcemap); }))
                .then(function () { return resolve(); })["catch"](function (error) {
                util_1.flareLog(error, true);
                return reject(error);
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
            var base64GzipSourcemap = zlib.deflateRawSync(sourcemap.content).toString('base64');
            axios_1["default"]
                .post(_this.apiEndpoint, {
                key: _this.key,
                version_id: _this.versionId,
                relative_filename: sourcemap.filename,
                sourcemap: base64GzipSourcemap
            })
                .then(function () { return resolve(); })["catch"](function (error) {
                util_1.flareLog(error.response.status + ": " + error.response.data.message, true);
                return reject(error);
            });
        });
    };
    return FlareWebpackPluginSourcemap;
}());
module.exports = FlareWebpackPluginSourcemap;
