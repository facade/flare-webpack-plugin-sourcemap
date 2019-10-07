import webpack = require('webpack');
import zlib = require('zlib');
import axios, { AxiosError } from 'axios';
import { getGitInfo, flareLog } from './util';

type PluginOptions = {
    key: string;
    apiEndpoint?: string;
    runInDevelopment: boolean;
    failBuildOnError: boolean;
    versionId?: string;
};

type Sourcemap = {
    filename: string;
    content: string;
};

class FlareWebpackPluginSourcemap {
    key: PluginOptions['key'];
    apiEndpoint: PluginOptions['apiEndpoint'];
    runInDevelopment: PluginOptions['runInDevelopment'];
    failBuildOnError: PluginOptions['failBuildOnError'];
    versionId: PluginOptions['versionId'];

    constructor({
        key,
        apiEndpoint = 'https://flareapp.io/api/sourcemaps',
        runInDevelopment = false,
        failBuildOnError = true,
        versionId = '', // TODO: generate uuid and package it into the build as an env variable
    }: PluginOptions) {
        this.key = key;
        this.apiEndpoint = apiEndpoint;
        this.runInDevelopment = runInDevelopment;
        this.failBuildOnError = failBuildOnError;
        this.versionId = versionId;
    }

    apply(compiler: webpack.Compiler) {
        if (!this.verifyOptions(compiler)) {
            return;
        }

        compiler.hooks.compilation.tap('', compilation => {
            const gitInfo = getGitInfo();
            // this.versionId

            // TODO: set git info & versionId in ENV variables (environment might be the incorrect hook, maybe beforeCompile, idk.)
            // https://github.com/webpack/webpack/blob/master/lib/DefinePlugin.js?source=cc
        });

        compiler.hooks.afterEmit.tapPromise('FlareWebpackPluginSourcemap', compilation => {
            flareLog('Uploading sourcemaps to Flare');

            return this.sendSourcemaps(compilation)
                .then(() => {
                    flareLog('Successfully uploaded sourcemaps to Flare.');
                })
                .catch(() => {
                    const errorMessage = `\n\n---\nSomething went wrong while uploading sourcemaps to Flare.\nErrors may have been outputted above.\n---\n`;

                    if (this.failBuildOnError) {
                        throw new Error(errorMessage);
                    }

                    flareLog(errorMessage, true);
                });
        });
    }

    verifyOptions(compiler): boolean {
        if (!this.key) {
            flareLog('No Flare project key was provided, not uploading sourcemaps to Flare.', true);
            return false;
        }

        if (!this.runInDevelopment && compiler.options.mode === 'development') {
            flareLog('Running webpack in development mode, not uploading sourcemaps to Flare.');
            return false;
        }

        return true;
    }

    sendSourcemaps(compilation: webpack.compilation.Compilation): Promise<void> {
        return new Promise((resolve, reject) => {
            const sourcemaps = this.getSourcemaps(compilation);

            if (!sourcemaps.length) {
                flareLog('No sourcemap files were found. Make sure sourcemaps are being generated!', true);

                return reject();
            }

            Promise.all(sourcemaps.map(sourcemap => this.uploadSourcemap(sourcemap)))
                .then(() => resolve())
                .catch(err => {
                    flareLog(err, true);

                    return reject();
                });
        });
    }

    getSourcemaps(compilation: webpack.compilation.Compilation): Array<Sourcemap> {
        return compilation
            .getStats()
            .toJson()
            .chunks.reduce(
                (sourcemaps, currentChunk) => {
                    const filename = currentChunk.files.find(file => /\.js$/.test(file));
                    const sourcemapUrl = currentChunk.files.find(file => /\.js\.map$/.test(file));

                    if (filename && sourcemapUrl) {
                        const content = compilation.assets[sourcemapUrl].source();

                        sourcemaps = [...sourcemaps, { filename, content }];
                    }

                    return sourcemaps;
                },
                [] as Array<Sourcemap>
            );
    }

    uploadSourcemap(sourcemap: Sourcemap): Promise<void> {
        return new Promise((resolve, reject) => {
            zlib.deflate(sourcemap.content, (error, buffer) => {
                if (error) {
                    console.error('Something went wrong while compressing the sourcemap content:');
                    reject(error);
                }

                const gzippedSourcemap = buffer.toString();

                axios
                    .post(this.apiEndpoint, {
                        key: this.key,
                        version_id: 'test_version',
                        relative_filename: sourcemap.filename,
                        sourcemap: gzippedSourcemap,
                    })
                    .then(() => resolve())
                    .catch((error: AxiosError) => {
                        flareLog(`${error.response.status}: ${error.response.data.message}`, true);

                        return reject(error);
                    });
            });
        });
    }
}

module.exports = FlareWebpackPluginSourcemap;
