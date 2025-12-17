import { r as require_token_util } from './chunk-YP34EWWK.mjs';
import { _ as __commonJS, r as require_token_error } from './index.mjs';
import '@mastra/core/evals/scoreTraces';
import './index2.mjs';
import '@mastra/core/mastra';
import '@mastra/libsql';
import '@mastra/core/agent';
import '@mastra/memory';
import './tools/b4da184b-c8d0-4644-bd9e-958f8af51ae2.mjs';
import '@mastra/core/tools';
import 'zod';
import './tools/aed65319-01f6-40fe-a263-8d29822d61c9.mjs';
import './tools/9743a6c0-887f-4694-a419-5baa6c1336cd.mjs';
import './tools/f77c6fd7-b753-423b-9e16-25bf45909d37.mjs';
import './tools/642883aa-9e5b-47b8-a162-ecfcefc62062.mjs';
import 'fs';
import 'path';
import 'url';
import './tools/d6a90b68-f5d0-4617-b935-0817f3e39613.mjs';
import './tools/13cb3865-76ef-4c5d-895d-601a1ced1085.mjs';
import './tools/60e767b6-a2e9-4af6-8ad3-f194508ffc0f.mjs';
import './tools/6b88e06a-0ee6-4c99-ab6f-acbae57057bd.mjs';
import './tools/dc8c5950-810c-4c08-b93a-b492570e3dd8.mjs';
import './tools/1e41e65e-23b2-43f9-ab43-745f4a31aa77.mjs';
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
