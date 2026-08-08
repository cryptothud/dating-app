// Vercel entry-point shim.
// NestJS is compiled with tsc (emitDecoratorMetadata: true) to dist/ by the buildCommand.
// This plain-JS file loads the compiled handler at runtime, bypassing esbuild's
// decorator limitation — no decorators live in this file, only in dist/.
const handlerModule = '../dist/serverless'
const { default: handler } = require(handlerModule)
module.exports = handler
