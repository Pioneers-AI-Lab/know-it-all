import { r as require_token_util } from './chunk-YP34EWWK.mjs';
import { _ as __commonJS, r as require_token_error } from './index.mjs';
import '@mastra/core/evals/scoreTraces';
import './index2.mjs';
import '@mastra/core/mastra';
import '@mastra/libsql';
import '@mastra/core/agent';
import '@mastra/memory';
import './tools/c6624bbb-e77b-40be-bdf5-edb983c0bc23.mjs';
import '@mastra/core/tools';
import 'zod';
import './tools/b3451a70-0920-4e5b-95ba-cc72541e9ff6.mjs';
import './tools/9b0bb18a-30a4-4868-805a-367d88f1a492.mjs';
import './tools/e63b6e35-d0a6-4859-b3aa-e2f4f6f824aa.mjs';
import './tools/112df47d-a03d-48a7-b77b-8c58354d9e08.mjs';
import 'fs';
import 'path';
import 'url';
import './tools/16ca8126-45c0-4782-82f6-b0a367bdf5a0.mjs';
import './tools/d1755d12-6d6a-4e3c-a589-b4ad495f20d8.mjs';
import './tools/53a022e3-b462-4a61-b6ac-c2359722dcb5.mjs';
import './tools/3ab41eef-05b1-4931-b527-daf71cdc7a29.mjs';
import './tools/88cac526-862e-43c6-bee5-70b88194845b.mjs';
import './tools/1376488f-92ea-42d4-b9af-b1400d1f55f7.mjs';
import './tools/bed0da49-7b8d-4874-9632-681a335feede.mjs';
import './tools/a15bb39b-f08f-415d-9290-f5e661f61697.mjs';
import '@mastra/core/server';
import '@slack/web-api';
import 'crypto';
import 'fs/promises';
import 'https';
import 'path/posix';
import 'http';
import 'http2';
import 'stream';
import '@mastra/core/utils/zod-to-json';
import '@mastra/core/error';
import '@mastra/core/utils';
import '@mastra/core/a2a';
import 'stream/web';
import '@mastra/core/memory';
import 'zod/v4';
import 'zod/v3';
import 'child_process';
import 'module';
import 'util';
import '@mastra/core/llm';
import 'os';
import '@mastra/core/workflows';
import '@mastra/core/request-context';
import 'buffer';
import './tools.mjs';

// ../../node_modules/.pnpm/@vercel+oidc@3.0.5/node_modules/@vercel/oidc/dist/token.js
var require_token = __commonJS({
  "../../node_modules/.pnpm/@vercel+oidc@3.0.5/node_modules/@vercel/oidc/dist/token.js"(exports, module) {
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var token_exports = {};
    __export(token_exports, {
      refreshToken: () => refreshToken
    });
    module.exports = __toCommonJS(token_exports);
    var import_token_error = require_token_error();
    var import_token_util = require_token_util();
    async function refreshToken() {
      const { projectId, teamId } = (0, import_token_util.findProjectInfo)();
      let maybeToken = (0, import_token_util.loadToken)(projectId);
      if (!maybeToken || (0, import_token_util.isExpired)((0, import_token_util.getTokenPayload)(maybeToken.token))) {
        const authToken = (0, import_token_util.getVercelCliToken)();
        if (!authToken) {
          throw new import_token_error.VercelOidcTokenError(
            "Failed to refresh OIDC token: login to vercel cli"
          );
        }
        if (!projectId) {
          throw new import_token_error.VercelOidcTokenError(
            "Failed to refresh OIDC token: project id not found"
          );
        }
        maybeToken = await (0, import_token_util.getVercelOidcToken)(authToken, projectId, teamId);
        if (!maybeToken) {
          throw new import_token_error.VercelOidcTokenError("Failed to refresh OIDC token");
        }
        (0, import_token_util.saveToken)(maybeToken, projectId);
      }
      process.env.VERCEL_OIDC_TOKEN = maybeToken.token;
      return;
    }
  }
});
var tokenGVZ7HRD7 = require_token();

export { tokenGVZ7HRD7 as default };
