import { Compiler, DefinePlugin, compilation } from 'webpack';
import { deflateRawSync } from 'zlib';
import { AxiosError } from 'axios';
import fs = require('fs');
const { default: axios } = require('axios'); // Temporary replacement for `import * as axios from 'axios';` while https://github.com/axios/axios/issues/1975 isn't in a release
import { flareLog, uuidv4, removeQuery } from './util';

type PluginOptions = {
    key: string;
    apiEndpoint: string;
    runInDevelopment: boolean;
    versionId: string;
};

type Sourcemap = {
    filename: string;
    content: string;
};

class FlareWebpackPluginSourcemap {
    key: PluginOptions['key'];
    apiEndpoint: PluginOptions['apiEndpoint'];
    runInDevelopment: PluginOptions['runInDevelopment'];
    versionId: PluginOptions['versionId'];

    constructor({
        key,
        apiEndpoint = 'https://flareapp.io/api/sourcemaps',
        runInDevelopment = false,
        versionId = uuidv4(),
    }: PluginOptions) {
        this.key = key;
        this.apiEndpoint = apiEndpoint;
        this.runInDevelopment = runInDevelopment;
        this.versionId = versionId;
    }

    apply(compiler: Compiler) {
        new DefinePlugin({
            FLARE_JS_KEY: JSON.stringify(this.key),
            FLARE_SOURCEMAP_VERSION: JSON.stringify(this.versionId),
        }).apply(compiler);

        const isWebpack3 = !compiler.hooks;

        const plugin = (compilation: compilation.Compilation) => {
            if (!this.verifyOptions(compiler, compilation)) {
                if (isWebpack3) {
                    return;
                }

                return Promise.reject();
            }

            flareLog('Uploading sourcemaps to Flare');

            return this.sendSourcemaps(compilation)
                .then(() => {
                    flareLog('Successfully uploaded sourcemaps to Flare.');
                })
                .catch((error: string) => {
                    compilation.warnings.push(`@flareapp/flare-webpack-plugin-sourcemap: ${error}`);
                });
        };

        if (isWebpack3) {
            compiler.plugin('after-emit', plugin);
            return;
        }

        // webpack >=4
        compiler.hooks.afterEmit.tapPromise('GetSourcemapsAndUploadToFlare', plugin as () => Promise<any>);
    }

    verifyOptions(compiler: Compiler, compilation: compilation.Compilation): boolean {
        if (!this.key) {
            compilation.warnings.push('No Flare project key was provided, not uploading sourcemaps to Flare.', true);
            return false;
        }

        if (
            (!this.runInDevelopment && compiler.options.mode === 'development') ||
            process.env.NODE_ENV === 'development'
        ) {
            flareLog('Running webpack in development mode, not uploading sourcemaps to Flare.');
            return false;
        }

        if (compiler.options.watch) {
            flareLog('Running webpack in watch mode, not uploading sourcemaps to Flare.');
            return false;
        }

        return true;
    }

    sendSourcemaps(compilation: compilation.Compilation): Promise<void> {
        return new Promise((resolve, reject) => {
            const sourcemaps = this.getSourcemaps(compilation);

            if (!sourcemaps.length) {
                return reject(
                    'No sourcemap files were found. Make sure sourcemaps are being generated by adding this line to your webpack config: devtool: "hidden-source-map"'
                );
            }

            Promise.all(sourcemaps.map(sourcemap => this.uploadSourcemap(sourcemap)))
                .then(() => resolve())
                .catch((error: Error) => reject(error.message));
        });
    }

    getSourcemaps(compilation: compilation.Compilation): Array<Sourcemap> {
        const chunks = compilation.getStats().toJson().chunks;
        const compiler = compilation.compiler;
        const outputPath = compilation.getPath(compiler.outputPath, {});

        if (!chunks) {
            return [];
        }

        return chunks.reduce((sourcemaps, currentChunk) => {
            const filename = currentChunk.files.find(file => /\.js/.test(file));
            const sourcemapUrl = currentChunk.files.find(file => /\.js\.map/.test(file));

            if (filename && sourcemapUrl) {
                const sourcemapLocation = removeQuery(compiler.outputFileSystem.join(outputPath, sourcemapUrl));

                try {
                    const content = fs.readFileSync(sourcemapLocation, 'utf8');
                    sourcemaps = [...sourcemaps, { filename: removeQuery(filename), content }];
                } catch (error) {
                    console.error('Error reading sourcemap file', sourcemapLocation, ': ', error);
                }
            }

            return sourcemaps;
        }, [] as Array<Sourcemap>);
    }

    uploadSourcemap(sourcemap: Sourcemap): Promise<void> {
        return new Promise((resolve, reject) => {
            const base64GzipSourcemap = deflateRawSync(sourcemap.content).toString('base64');

            axios
                .post(this.apiEndpoint, {
                    key: this.key,
                    version_id: this.versionId,
                    relative_filename: sourcemap.filename,
                    sourcemap: base64GzipSourcemap,
                })
                .then(() => resolve())
                .catch((error: AxiosError) => {
                    if (!error || !error.response) {
                        return reject('An unknown error occurred while uploading the sourcemaps to Flare.');
                    }

                    if (error.response.status && error.response.data.message && error.response.data.errors) {
                        flareLog(
                            `${error.response.status}: ${error.response.data.message}, ${JSON.stringify(
                                error.response.data.errors
                            )}`,
                            true
                        );
                    }

                    return reject(error);
                });
        });
    }
}

module.exports = FlareWebpackPluginSourcemap;
