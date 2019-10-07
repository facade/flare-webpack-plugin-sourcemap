import webpack = require('webpack');
import axios, { AxiosError } from 'axios';

type PluginOptions = {
    key: string;
    apiEndpoint: string;
    runInDevelopment: boolean;
};

type Sourcemap = {
    filename: string;
    content: string;
};

function flareLog(message: string, isError: boolean = false) {
    const formattedMessage = 'flare-webpack-plugin-sourcemap: ' + message;

    if (isError) {
        console.error(formattedMessage);
        return;
    }

    console.log(formattedMessage);
}

class FlareWebpackPluginSourcemap {
    key: PluginOptions['key'];
    apiEndpoint: PluginOptions['apiEndpoint'];
    runInDevelopment: PluginOptions['runInDevelopment'];

    constructor({ key, apiEndpoint, runInDevelopment }: PluginOptions) {
        this.key = key;
        this.apiEndpoint = apiEndpoint || 'https://flareapp.io/api/sourcemaps';
        this.runInDevelopment = runInDevelopment || false;
    }

    apply(compiler: webpack.Compiler) {
        if (!this.verifyOptions(compiler)) {
            return;
        }

        compiler.hooks.afterEmit.tapPromise('FlareWebpackPluginSourcemap', compilation => {
            flareLog('\nUploading sourcemaps to Flare');

            return this.sendSourcemaps(compilation)
                .then(() => {
                    flareLog('Successfully uploaded sourcemaps to Flare.');
                })
                .catch(() => {
                    flareLog(
                        `Something went wrong while uploading sourcemaps to Flare. Errors may have been outputted above.`,
                        true
                    );
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
        const sourcemaps = this.getSourcemaps(compilation);

        if (!sourcemaps.length) {
            flareLog('No sourcemap files were found. Make sure sourcemaps are being generated!', true);

            return Promise.reject();
        }

        return this.uploadSourcemaps(sourcemaps)
            .then(() => Promise.resolve())
            .catch(err => {
                flareLog(err, true);
                throw new Error();
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

    uploadSourcemaps(sourcemaps: Array<Sourcemap>) {
        return Promise.all(
            sourcemaps.map(sourcemap =>
                axios
                    .post(this.apiEndpoint, {
                        key: this.key,
                        version_id: 'test_version',
                        relative_filename: sourcemap.filename,
                        sourcemap: sourcemap.content, // TODO: gzip the string (https://www.npmjs.com/package/node-gzip)
                    })
                    .catch((error: AxiosError) => {
                        flareLog(`${error.response.status}: ${error.response.data.message}`, true);

                        throw error;
                    })
            )
        );
    }
}

module.exports = FlareWebpackPluginSourcemap;
