var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/pages-Bw2X71/bundledWorker-0.7335690343576204.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var heavenlyStems = ["\u7532", "\u4E59", "\u4E19", "\u4E01", "\u620A", "\u5DF1", "\u5E9A", "\u8F9B", "\u58EC", "\u7678"];
var earthlyBranches = ["\u5B50", "\u4E11", "\u5BC5", "\u536F", "\u8FB0", "\u5DF3", "\u5348", "\u672A", "\u7533", "\u9149", "\u620C", "\u4EA5"];
function calculateBazi(year, month, day, hour = null) {
  const yearOffset = (year - 1984) % 60;
  const yearStemIndex = yearOffset % 10;
  const yearBranchIndex = yearOffset % 12;
  const yearPillar = heavenlyStems[yearStemIndex] + earthlyBranches[yearBranchIndex];
  const monthStemIndex = (yearStemIndex % 5 * 2 + (month - 1)) % 10;
  const monthBranchIndex = (month + 1) % 12;
  const monthPillar = heavenlyStems[monthStemIndex] + earthlyBranches[monthBranchIndex];
  const totalDays = (year - 1900) * 365 + Math.floor((year - 1900) / 4) + day;
  const dayStemIndex = (totalDays + 4) % 10;
  const dayBranchIndex = (totalDays + 10) % 12;
  const dayPillar = heavenlyStems[dayStemIndex] + earthlyBranches[dayBranchIndex];
  let hourPillar = null;
  if (hour !== null) {
    const hourNum = Math.floor(hour / 2);
    const hourBranchIndex = hourNum;
    const hourStemStartOffset = [0, 2, 4, 6, 8];
    const dayStemGroup = Math.floor(dayStemIndex / 2);
    const hourStemBase = hourStemStartOffset[dayStemGroup];
    const hourStemIndex = (hourStemBase + hourBranchIndex) % 10;
    hourPillar = heavenlyStems[hourStemIndex] + earthlyBranches[hourBranchIndex];
  }
  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar
    // Will be null if hour is not provided
  };
}
__name(calculateBazi, "calculateBazi");
__name2(calculateBazi, "calculateBazi");
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
  let hour = null;
  let birthTimeValue = time;
  if (birthTimeValue && /^(?:[01]\d|2[0-3])(?:[0-5]\d)$/.test(birthTimeValue)) {
    const hourDigits = parseInt(birthTimeValue.substring(0, 2));
    hour = hourDigits;
    if (hour === 23) {
    }
  } else {
    birthTimeValue = null;
  }
  const { DEEPSEEK_API_KEY } = env;
  console.log(`[Worker ENV DEBUG] DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY ? "Loaded" : "MISSING!"}`);
  if (!DEEPSEEK_API_KEY) {
    console.error("[Worker ENV] DEEPSEEK_API_KEY is missing.");
    return new Response(JSON.stringify({ error: "\u5F8C\u7AEF Deepseek API \u91D1\u9470\u672A\u8A2D\u5B9A" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  console.log(`[Worker Logic] Calculating Bazi for: ${year}-${month}-${day} ${hour !== null ? `Hour: ${hour}` : "(Hour unknown)"}`);
  const baziResult = calculateBazi(parseInt(year), parseInt(month), parseInt(day), hour);
  console.log("[Worker Logic DEBUG] Calculated Bazi Pillars:", baziResult);
  let baziString = `\u5E74\u67F1\uFF1A${baziResult.yearPillar}\uFF0C\u6708\u67F1\uFF1A${baziResult.monthPillar}\uFF0C\u65E5\u67F1\uFF1A${baziResult.dayPillar}`;
  if (baziResult.hourPillar) {
    baziString += `\uFF0C\u6642\u67F1\uFF1A${baziResult.hourPillar}`;
  } else {
    baziString += "\uFF08\u6642\u8FB0\u672A\u77E5\uFF09";
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
  if (birthTimeValue && shichenMap[birthTimeValue]) {
    timeStringForPrompt = shichenMap[birthTimeValue];
  } else if (birthTimeValue) {
    timeStringForPrompt = `\u5927\u7D04 ${birthTimeValue.substring(0, 2)} \u6642 ${birthTimeValue.substring(2)} \u5206`;
  }
  const systemPrompt = `\u4F60\u662F\u4E00\u4F4D\u5E36\u9EDE\u795E\u79D8\u6C23\u8CEA\u53C8\u53CB\u5584\u7684\u547D\u7406\u5C0F\u52A9\u624B\u{1F52E}\uFF0C\u7CBE\u901A\u7E41\u9AD4\u4E2D\u6587\u548C\u56DB\u67F1\u516B\u5B57\u89E3\u8B80\u3002\u4F60\u7684\u4EFB\u52D9\u662F\u6839\u64DA\u6211\u63D0\u4F9B\u7684\u4F7F\u7528\u8005\u516B\u5B57\u8CC7\u8A0A\uFF0C\u7528\u6EAB\u99A8\u6709\u8DA3\u3001\u5076\u723E\u5E36\u9EDE\u5C0F\u5E7D\u9ED8\u7684\u8A9E\u6C23\uFF0C\u5206\u6790\u4ED6\u5011\u7684\u516B\u5B57\u4E94\u884C\uFF0C\u4E26\u63A8\u85A6\u958B\u904B\u6C34\u6676\u624B\u4E32\u3002

**\u4F7F\u7528\u8005\u57FA\u672C\u8CC7\u6599** (\u50C5\u4F9B\u53C3\u8003\uFF0C\u4E3B\u8981\u4F9D\u64DA\u4E0B\u65B9\u516B\u5B57\u5206\u6790)\uFF1A
*   \u897F\u5143\u751F\u65E5\uFF1A${year} \u5E74 ${month} \u6708 ${day} \u65E5
*   \u51FA\u751F\u6642\u8FB0\uFF1A${timeStringForPrompt}
${location ? `*   \u51FA\u751F\u5730\u9EDE\uFF1A${location}
` : ""}
**\u5DF2\u7B97\u51FA\u7684\u56DB\u67F1\u516B\u5B57**\uFF1A
*   **${baziString}**

\u8ACB**\u6839\u64DA\u4EE5\u4E0A\u63D0\u4F9B\u7684\u56DB\u67F1\u516B\u5B57**\uFF0C\u6309\u7167\u4EE5\u4E0B\u9B54\u6CD5\u6B65\u9A5F\u9032\u884C\u5206\u6790\uFF0C\u4E26\u7528\u81EA\u7136\u6D41\u66A2\u7684\u6587\u5B57\u548C\u6EAB\u99A8\u53EF\u611B\u7684 emoji \u2728\u{1F338}\u{1F48E} \u4F86\u5448\u73FE\u7D50\u679C\uFF0C\u907F\u514D\u4F7F\u7528\u751F\u786C\u7684 '###' \u6A19\u984C\u548C\u904E\u591A\u7684 '**' \u7C97\u9AD4\uFF1A

1.  \u57FA\u65BC\u63D0\u4F9B\u7684\u516B\u5B57 **${baziString}**\uFF0C\u7528\u6DFA\u986F\u6613\u61C2\u7684\u65B9\u5F0F\uFF0C\u9EDE\u51FA\u547D\u76E4\u4E2D\u4E94\u884C\uFF08\u91D1\u6728\u6C34\u706B\u571F\uFF09\u7684\u6578\u91CF\u548C\u5927\u81F4\u5F37\u5F31\u60C5\u6CC1\u3002**\u8ACB\u4F7F\u7528\u5217\u8868\u65B9\u5F0F\u5448\u73FE**\uFF0C\u4F8B\u5982\uFF1A
    *   \u{1F333} \u6728\uFF1A[\u6578\u91CF] \u500B - [\u7C21\u77ED\u63CF\u8FF0\uFF0C\u5982\uFF1A\u50CF\u68EE\u6797\u822C\u8302\u76DB]
    *   \u{1F525} \u706B\uFF1A[\u6578\u91CF] \u500B - [\u7C21\u77ED\u63CF\u8FF0\uFF0C\u5982\uFF1A\u6EAB\u6696\u7684\u5C0F\u706B\u82D7]
    *   \u26F0\uFE0F \u571F\uFF1A[\u6578\u91CF] \u500B - [\u7C21\u77ED\u63CF\u8FF0]
    *   \u{1F4A7} \u6C34\uFF1A[\u6578\u91CF] \u500B - [\u7C21\u77ED\u63CF\u8FF0]
    *   \u2699\uFE0F \u91D1\uFF1A[\u6578\u91CF] \u500B - [\u7C21\u77ED\u63CF\u8FF0\uFF0C\u5982\uFF1A\u6709\u9EDE\u5BB3\u7F9E\u5462 / \u9583\u9583\u767C\u5149]
2.  \u6839\u64DA\u5B50\u5E73\u516B\u5B57\u7406\u8AD6\uFF0C\u627E\u51FA\u547D\u76E4\u4E2D\u6700\u9700\u8981\u300C\u547C\u559A\u300D\u6216\u300C\u88DC\u5145\u300D\u7684\u90A3\u500B\u4E94\u884C\u80FD\u91CF\u3002\u76F4\u63A5\u544A\u8A34\u4F7F\u7528\u8005\u662F\u54EA\u500B\u3002
3.  \u91DD\u5C0D\u9700\u8981\u88DC\u5145\u7684\u4E94\u884C\uFF0C\u5C31\u50CF\u63A8\u85A6\u597D\u670B\u53CB\u4E00\u6A23\uFF0C\u63A8\u85A6 3 \u5230 5 \u7A2E\u4E3B\u8981\u7684\u6C34\u6676\u624B\u4E32\u6750\u8CEA\u3002\u5047\u5982\u7F3A\u59311\u7A2E\u4E94\u884C\u5C31\u63A8\u85A63-5\u7A2E\u3001\u5047\u5982\u7F3A\u59312\u7A2E\u4E94\u884C\u5C31\u6839\u64DA\u7F3A\u5931\u76842\u7A2E\u4E94\u884C\u505A\u5206\u5225\u7684\u63A8\u85A63-5\u7A2E\u8207\u6DF7\u548C\u63A8\u85A6\u4E5F\u662F\u63A8\u85A62-4\u7A2E
\u3002\u8981\u8AAA\u660E\u9019\u500B\u6750\u8CEA\u5C6C\u65BC\u54EA\u7A2E\u4E94\u884C\uFF0C\u4EE5\u53CA\u70BA\u4EC0\u9EBC\u5B83\u5F88\u68D2\uFF08\u4F8B\u5982\uFF1A\u9EC3\u6C34\u6676\u662F\u571F\u7CFB\u5C0F\u53EF\u611B\uFF0C\u53EF\u4EE5\u5E36\u4F86\u7A69\u5B9A\u529B\u91CF\uFF1B\u8349\u8393\u6676\u662F\u706B\u7CFB\u5C0F\u592A\u967D\uFF0C\u80FD\u9EDE\u71C3\u71B1\u60C5\u{1F525}\uFF09\u3002
4.  \u6700\u5F8C\uFF0C\u7528\u6EAB\u6696\u9F13\u52F5\u7684\u8A9E\u6C23\u505A\u500B\u7E3D\u7D50\uFF0C\u63D0\u9192\u9019\u4E9B\u5EFA\u8B70\u662F\u589E\u52A0\u751F\u6D3B\u60C5\u8DA3\u548C\u4FE1\u5FC3\u7684\u53C3\u8003\uFF0C\u4E26\u9001\u4E0A\u795D\u798F\u3002

\u8ACB\u5C07\u5206\u6790\u7D50\u679C\u548C\u5EFA\u8B70\u6574\u5408\u70BA\u4E00\u6BB5\u81EA\u7136\u3001\u6EAB\u99A8\u4E14\u5E36\u9EDE\u795E\u79D8\u611F\u7684\u5B8C\u6574\u56DE\u8986\uFF0C\u8A18\u5F97\u591A\u7528\u9EDE\u53EF\u611B\u7684 emoji \u5594\uFF01`;
  const messagesForDeepseek = [
    { role: "system", content: systemPrompt }
    // No separate user message needed as context is in system prompt
  ];
  console.log(`[Worker Logic] Constructed System Prompt for Deepseek (length: ${systemPrompt.length})`);
  try {
    console.log("[Worker Logic] Calling Deepseek for Bazi interpretation...");
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
