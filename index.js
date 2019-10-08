"use strict";
exports.__esModule = true;
var zlib = require("zlib");
var axios_1 = require("axios");
var util_1 = require("./util");
var FlareWebpackPluginSourcemap = /** @class */ (function () {
    function FlareWebpackPluginSourcemap(_a) {
        var key = _a.key, _b = _a.apiEndpoint, apiEndpoint = _b === void 0 ? 'https://flareapp.io/api/sourcemaps' : _b, _c = _a.runInDevelopment, runInDevelopment = _c === void 0 ? false : _c, _d = _a.versionId, versionId = _d === void 0 ? '' : _d;
        this.key = key;
        this.apiEndpoint = apiEndpoint;
        this.runInDevelopment = runInDevelopment;
        this.versionId = versionId;
    }
    FlareWebpackPluginSourcemap.prototype.apply = function (compiler) {
        var _this = this;
        if (!this.verifyOptions(compiler)) {
            return;
        }
        /* compiler.hooks.compilation.tap('InjectFlareEnvVariables', compilation => {
            const gitInfo = getGitInfo();
            // this.versionId

            // TODO: set git info & versionId in ENV variables (environment might be the incorrect hook, maybe beforeCompile, idk.)
            // https://github.com/webpack/webpack/blob/master/lib/DefinePlugin.js?source=cc
        }); */
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
                version_id: 'test_version',
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
