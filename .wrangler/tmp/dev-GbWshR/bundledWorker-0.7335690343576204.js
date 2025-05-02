var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/pages-Bw2X71/bundledWorker-0.7335690343576204.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
function formatResponse(content, role = "assistant", finish_reason = "stop") {
  const finalContent = typeof content === "string" ? content : "(\u65E0\u6548\u7684\u56DE\u61C9\u5185\u5BB9)";
  return {
    choices: [
      {
        message: { role, content: finalContent },
        finish_reason
      }
    ]
  };
}
__name(formatResponse, "formatResponse");
__name2(formatResponse, "formatResponse");
async function callDeepseek(apiKey, messages) {
  const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
  console.log("[Worker Deepseek] Calling Deepseek API...");
  console.log("[Worker Deepseek DEBUG] Messages being sent (including system prompt):", JSON.stringify(messages, null, 2));
  const payload = {
    model: "deepseek-chat",
    // Use the desired Deepseek model
    messages,
    stream: false
    // Keep non-streaming for this use case for simplicity
  };
  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
  console.log(`[Worker Deepseek] Received response status from Deepseek: ${response.status}`);
  if (!response.ok) {
    let errorBody = "(Failed to read Deepseek error body)";
    try {
      errorBody = await response.text();
    } catch (e) {
    }
    console.error(`[Worker Deepseek] Deepseek API Error: ${response.status}. Body: ${errorBody}`);
    let userError = `Deepseek API \u8ACB\u6C42\u5931\u6557 (\u72C0\u614B\u78BC: ${response.status})\u3002`;
    if (errorBody.includes("insufficient_quota")) {
      userError = "Deepseek API \u984D\u5EA6\u4E0D\u8DB3\uFF0C\u8ACB\u6AA2\u67E5\u60A8\u7684\u5E33\u6236\u3002";
    }
    throw new Error(userError);
  }
  const result = await response.json();
  console.log("[Worker Deepseek DEBUG] Parsed Deepseek JSON result:", JSON.stringify(result).substring(0, 500) + "...");
  if (result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
    return result.choices[0].message.content;
  } else {
    console.warn("[Worker Deepseek DEBUG] Could not find expected content in Deepseek JSON response.");
    throw new Error("Deepseek \u56DE\u61C9\u683C\u5F0F\u4E0D\u7B26\u9810\u671F\uFF0C\u7121\u6CD5\u63D0\u53D6\u5206\u6790\u7D50\u679C\u3002");
  }
}
__name(callDeepseek, "callDeepseek");
__name2(callDeepseek, "callDeepseek");
async function handleAnalysisRequest(request, env) {
  console.log("[Worker Request] Entering handleAnalysisRequest...");
  let requestBody;
  try {
    requestBody = await request.json();
    console.log("[Worker Request DEBUG] Parsed request body:", requestBody);
  } catch (e) {
    console.error("[Worker Request] Invalid JSON in request body:", e);
    return new Response(JSON.stringify({ error: "\u65E0\u6548\u7684 JSON \u8BF7\u6C42\u4F53" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const { year, month, day, time, location } = requestBody;
  if (!year || !month || !day) {
    console.error("[Worker Request] Missing required fields (year, month, day).", requestBody);
    return new Response(JSON.stringify({ error: "\u7F3A\u5C11\u5FC5\u586B\u6B04\u4F4D\uFF1A\u897F\u5143\u5E74\u3001\u6708\u3001\u65E5\u3002" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (isNaN(parseInt(year)) || parseInt(year) < 1900 || parseInt(year) > (/* @__PURE__ */ new Date()).getFullYear() + 1) {
    return new Response(JSON.stringify({ error: "\u7121\u6548\u7684\u897F\u5143\u5E74\u4EFD\u3002" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (isNaN(parseInt(month)) || parseInt(month) < 1 || parseInt(month) > 12) {
    return new Response(JSON.stringify({ error: "\u7121\u6548\u7684\u6708\u4EFD\u3002" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (isNaN(parseInt(day)) || parseInt(day) < 1 || parseInt(day) > 31) {
    return new Response(JSON.stringify({ error: "\u7121\u6548\u7684\u65E5\u671F\u3002" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (time && !/^(?:[01]\d|2[0-3])(?:[0-5]\d)$/.test(time)) {
    return new Response(JSON.stringify({ error: "\u7121\u6548\u7684\u6642\u9593\u683C\u5F0F\uFF0C\u8ACB\u4F7F\u7528 HHMM (\u4F8B\u5982 1430)\u3002" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const { DEEPSEEK_API_KEY } = env;
  console.log(`[Worker ENV DEBUG] DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY ? "Loaded" : "MISSING!"}`);
  if (!DEEPSEEK_API_KEY) {
    console.error("[Worker ENV] DEEPSEEK_API_KEY is missing.");
    return new Response(JSON.stringify({ error: "\u5F8C\u7AEF Deepseek API \u91D1\u9470\u672A\u8A2D\u5B9A" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const shichenMap = {
    "2300": "\u5B50\u6642 (23:00 - 00:59)",
    "0100": "\u4E11\u6642 (01:00 - 02:59)",
    "0300": "\u5BC5\u6642 (03:00 - 04:59)",
    "0500": "\u536F\u6642 (05:00 - 06:59)",
    "0700": "\u8FB0\u6642 (07:00 - 08:59)",
    "0900": "\u5DF3\u6642 (09:00 - 10:59)",
    "1100": "\u5348\u6642 (11:00 - 12:59)",
    "1300": "\u672A\u6642 (13:00 - 14:59)",
    "1500": "\u7533\u6642 (15:00 - 16:59)",
    "1700": "\u9149\u6642 (17:00 - 18:59)",
    "1900": "\u620C\u6642 (19:00 - 20:59)",
    "2100": "\u4EA5\u6642 (21:00 - 22:59)"
  };
  let timeStringForPrompt = "(\u6642\u8FB0\u672A\u77E5)";
  if (time && shichenMap[time]) {
    timeStringForPrompt = shichenMap[time];
  } else if (time) {
    timeStringForPrompt = `\u5927\u7D04 ${time.substring(0, 2)} \u6642 ${time.substring(2)} \u5206`;
  }
  const systemPrompt = `\u4F60\u662F\u4E00\u4F4D\u7CBE\u901A\u7E41\u9AD4\u4E2D\u6587\u7684\u56DB\u67F1\u516B\u5B57\u547D\u7406\u5E2B\u3002\u4F60\u7684\u4EFB\u52D9\u662F\u6839\u64DA\u4F7F\u7528\u8005\u63D0\u4F9B\u7684\u897F\u5143\u51FA\u751F\u5E74\u6708\u65E5\u6642\u8FB0\u548C\u5730\u9EDE\uFF08\u5982\u679C\u63D0\u4F9B\uFF09\uFF0C\u9032\u884C\u8A73\u7D30\u7684\u516B\u5B57\u4E94\u884C\u5206\u6790\uFF0C\u4E26\u63A8\u85A6\u9069\u5408\u7684\u624B\u4E32\u3002\u8ACB\u9075\u5FAA\u4EE5\u4E0B\u6B65\u9A5F\uFF1A
1.  \u6839\u64DA\u897F\u5143 ${year} \u5E74 ${month} \u6708 ${day} \u65E5 ${timeStringForPrompt}${location ? `\uFF0C\u51FA\u751F\u5730\u9EDE ${location}` : ""}\uFF0C\u63A8\u7B97\u51FA\u7CBE\u78BA\u7684\u8FB2\u66C6\u65E5\u671F\u548C\u5C0D\u61C9\u7684\u6642\u8FB0\u5929\u5E72\u5730\u652F\u3002
2.  \u6392\u51FA\u5B8C\u6574\u7684\u56DB\u67F1\u5E72\u652F\uFF08\u5E74\u67F1\u3001\u6708\u67F1\u3001\u65E5\u67F1\u3001\u6642\u67F1\uFF09\u3002\u5982\u679C\u6642\u8FB0\u672A\u77E5\uFF0C\u8ACB\u57FA\u65BC\u5E74\u6708\u65E5\u4E09\u67F1\u9032\u884C\u5206\u6790\uFF0C\u4E26\u8AAA\u660E\u7F3A\u5C11\u6642\u67F1\u53EF\u80FD\u5C0D\u7CBE\u78BA\u5EA6\u7522\u751F\u5F71\u97FF\u3002
3.  \u5206\u6790\u547D\u76E4\u4E2D\u5929\u5E72\u5730\u652F\u5C0D\u61C9\u7684\u4E94\u884C\uFF08\u91D1\u3001\u6728\u3001\u6C34\u3001\u706B\u3001\u571F\uFF09\u53CA\u5176\u6578\u91CF\u548C\u65FA\u8870\u60C5\u6CC1\u3002
4.  \u7D9C\u5408\u5224\u65B7\u6B64\u547D\u76E4\u4E2D\u6700\u9700\u8981\u88DC\u5145\u7684\u4E94\u884C\u662F\u54EA\u4E00\u500B\uFF08\u901A\u5E38\u662F\u6578\u91CF\u6700\u5C11\u6216\u76F8\u5C0D\u6700\u5F31\u7684\u90A3\u500B\uFF09\u3002\u660E\u78BA\u6307\u51FA\u9700\u8981\u88DC\u5145\u7684\u4E94\u884C\u540D\u7A31\u3002
5.  \u91DD\u5C0D\u9700\u8981\u88DC\u5145\u7684\u4E94\u884C\uFF0C\u63A8\u85A6 3 \u5230 5 \u7A2E\u4E3B\u8981\u7684\u6C34\u6676\u6216\u624B\u4E32\u73E0\u6750\u8CEA\uFF0C\u4E26\u7C21\u8981\u8AAA\u660E\u8A72\u6750\u8CEA\u5C6C\u65BC\u54EA\u7A2E\u4E94\u884C\u4EE5\u53CA\u70BA\u4F55\u9069\u5408\uFF08\u4F8B\u5982\uFF1A\u9EC3\u6C34\u6676\u5C6C\u571F\uFF0C\u9069\u5408\u88DC\u571F\uFF1B\u7DA0\u5E7D\u9748\u5C6C\u6728\uFF0C\u9069\u5408\u88DC\u6728\uFF09\u3002
6.  \u6574\u500B\u56DE\u7B54\u8ACB\u4F7F\u7528\u6EAB\u548C\u3001\u5C08\u696D\u3001\u6613\u65BC\u7406\u89E3\u7684\u8A9E\u6C23\uFF0C\u4E26\u4EE5\u7E41\u9AD4\u4E2D\u6587\u5448\u73FE\u3002
7.  \u5C07\u6700\u7D42\u7684\u5206\u6790\u7D50\u679C\u548C\u5EFA\u8B70\u6574\u5408\u70BA\u4E00\u500B\u5B8C\u6574\u7684\u56DE\u7B54\u3002`;
  const messagesForDeepseek = [
    { role: "system", content: systemPrompt }
    // User message is implicit in the system prompt now
  ];
  console.log(`[Worker Logic] Constructed System Prompt for Deepseek (length: ${systemPrompt.length})`);
  try {
    console.log("[Worker Logic] Calling Deepseek for Bazi analysis...");
    const deepseekAnswer = await callDeepseek(DEEPSEEK_API_KEY, messagesForDeepseek);
    console.log(`[Worker Logic DEBUG] Received Deepseek analysis (length: ${deepseekAnswer.length})`);
    const formattedResponse = formatResponse(deepseekAnswer);
    console.log("[Worker Logic DEBUG] Sending formatted Deepseek response to client.");
    return new Response(JSON.stringify(formattedResponse), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[Worker Logic] FATAL Error during Deepseek API call or processing:", e);
    if (e.stack) console.error("[Worker Logic DEBUG] Error Stack:", e.stack);
    const errorMsg = "\u8655\u7406\u8ACB\u6C42\u6642\u767C\u751F\u5167\u90E8\u932F\u8AA4 (Worker)";
    const errorDetail = e.message || "Unknown error";
    const errorResponse = formatResponse(`\u5206\u6790\u5931\u6557\uFF1A${errorDetail}`, "assistant", "error");
    return new Response(JSON.stringify(errorResponse), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
__name(handleAnalysisRequest, "handleAnalysisRequest");
__name2(handleAnalysisRequest, "handleAnalysisRequest");
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;
    console.log(`[Worker Entry] Request: ${method} ${pathname}`);
    if (pathname === "/api/analyze" && method === "POST") {
      return handleAnalysisRequest(request, env);
    }
    if (method === "GET") {
      try {
        return env.ASSETS.fetch(request);
      } catch (e) {
        if (e.message.includes("Could not find asset")) {
          console.error(`[Worker Static] Asset not found for path: ${pathname}`, e);
          if (pathname === "/") {
            console.warn("[Worker Static] Root path '/' not found, attempting to serve '/index.html'");
            try {
              let newRequest = new Request(new URL("/index.html", request.url), request);
              return await env.ASSETS.fetch(newRequest);
            } catch (nestedError) {
              console.error("[Worker Static] Failed to serve '/index.html' as fallback for root.", nestedError);
              return new Response("\u627E\u4E0D\u5230\u4E3B\u8981\u9801\u9762 (index.html)", { status: 404 });
            }
          }
          return new Response("\u8CC7\u6E90\u672A\u627E\u5230 (Not Found)", { status: 404 });
        } else {
          console.error(`[Worker Static] Error fetching asset: ${pathname}`, e);
          return new Response("\u7121\u6CD5\u8B80\u53D6\u975C\u614B\u8CC7\u6E90", { status: 500 });
        }
      }
    }
    console.warn(`[Worker Entry] Method ${method} not allowed for path '${pathname}'.`);
    return new Response("\u65B9\u6CD5\u4E0D\u5141\u8A31 (Method Not Allowed)", { status: 405 });
  }
};
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// C:/Users/PONY/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// C:/Users/PONY/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-fNr1VJ/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// C:/Users/PONY/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-fNr1VJ/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=bundledWorker-0.7335690343576204.js.map
