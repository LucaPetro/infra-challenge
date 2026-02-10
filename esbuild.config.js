const path = require('path');
const esbuildTsc = require('esbuild-plugin-tsc')

module.exports = () => ({
  nodePaths: [path.resolve(__dirname, 'node_modules')],
  external: [
    '@nestjs/microservices',
    '@nestjs/websockets',
    'cache-manager',
    '@aws-sdk/*',
    '@nestjs/common',
    '@nestjs/typeorm',
    '@nestjs/core',
    'reflect-metadata',
    'rxjs',
    'class-transformer',
    'class-validator',
    '@codegenie/serverless-express',
    'nestjs-pino',
    'pg-native',
    'pg'
  ],

  plugins: [
    esbuildTsc({
      force: true,
      tsconfigPath: './inventory/tsconfig.json'
    })
  ],

  /** @see {@link https://esbuild.github.io/api/#minify} */
  minify: false,

  /** @see {@link https://esbuild.github.io/api/#source-maps} */
  sourcemap: true,

  /** @see {@link https://esbuild.github.io/api/#alias} */
  // alias: {
  //   'class-transformer': path.resolve(__dirname, 'node_modules/class-transformer'),
  //   'class-validator': path.resolve(__dirname, 'node_modules/class-validator'),
  //   'class-transformer/storage': 'class-transformer/cjs/storage',  
  // },

  /** @see {@link https://esbuild.github.io/api/#define} */
  define: {
    'process.env.ENVIRONMENT': JSON.stringify('production'),
    'process.env.NODE_ENV': JSON.stringify('production'),
  },

  /** @see {@link https://github.com/floydspace/serverless-esbuild#options} */
  // outputFileExtension: '.mjs',

  platform: 'node',
  target: 'node24',
  keepNames: true
})