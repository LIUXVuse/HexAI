// _worker.js - Modified for Bazi Analysis using Deepseek API

// Helper function to format response for frontend (Simplified)
function formatResponse(content, role = "assistant", finish_reason = "stop") {
  const finalContent = typeof content === 'string' ? content : '(无效的回應内容)';
  return {
    choices: [
      {
        message: { role, content: finalContent },
        finish_reason,
      },
    ],
  };
}

// --- Deepseek Interaction --- (No changes needed in the function itself initially)
async function callDeepseek(apiKey, messages) {
    const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
    console.log("[Worker Deepseek] Calling Deepseek API...");

    // The system prompt is now part of the 'messages' passed in
    console.log("[Worker Deepseek DEBUG] Messages being sent (including system prompt):", JSON.stringify(messages, null, 2));

    const payload = {
        model: "deepseek-chat", // Use the desired Deepseek model
        messages: messages,
        stream: false // Keep non-streaming for this use case for simplicity
    };

    const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
    });

    console.log(`[Worker Deepseek] Received response status from Deepseek: ${response.status}`);

    if (!response.ok) {
        let errorBody = "(Failed to read Deepseek error body)";
        try { errorBody = await response.text(); } catch (e) { /* ignore */ }
        console.error(`[Worker Deepseek] Deepseek API Error: ${response.status}. Body: ${errorBody}`);
        // Throw an error with a user-friendly message if possible
        let userError = `Deepseek API 請求失敗 (狀態碼: ${response.status})。`;
        if (errorBody.includes("insufficient_quota")) {
            userError = "Deepseek API 額度不足，請檢查您的帳戶。";
        }
        throw new Error(userError);
    }

    const result = await response.json();
    console.log("[Worker Deepseek DEBUG] Parsed Deepseek JSON result:", JSON.stringify(result).substring(0, 500) + '...');

    // Extract the actual response content
     if (result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
         return result.choices[0].message.content;
     } else {
         console.warn("[Worker Deepseek DEBUG] Could not find expected content in Deepseek JSON response.");
         throw new Error("Deepseek 回應格式不符預期，無法提取分析結果。");
     }
}


/**
 * Handles Bazi analysis requests.
 */
async function handleAnalysisRequest(request, env) {
    console.log("[Worker Request] Entering handleAnalysisRequest...");
    let requestBody;
    try {
        requestBody = await request.json();
        console.log("[Worker Request DEBUG] Parsed request body:", requestBody);
    } catch (e) {
        console.error("[Worker Request] Invalid JSON in request body:", e);
        return new Response(JSON.stringify({ error: "无效的 JSON 请求体" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // --- Extract and Validate Input Data --- //
    const { year, month, day, time, location } = requestBody;

    if (!year || !month || !day) {
        console.error("[Worker Request] Missing required fields (year, month, day).", requestBody);
        return new Response(JSON.stringify({ error: "缺少必填欄位：西元年、月、日。" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Basic validation (can be more sophisticated)
    if (isNaN(parseInt(year)) || parseInt(year) < 1900 || parseInt(year) > new Date().getFullYear() + 1) {
        return new Response(JSON.stringify({ error: "無效的西元年份。" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
     if (isNaN(parseInt(month)) || parseInt(month) < 1 || parseInt(month) > 12) {
        return new Response(JSON.stringify({ error: "無效的月份。" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (isNaN(parseInt(day)) || parseInt(day) < 1 || parseInt(day) > 31) { // Basic check, could improve based on month/year
        return new Response(JSON.stringify({ error: "無效的日期。" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    // Optional validation for time format (HHMM)
    if (time && !/^(?:[01]\d|2[0-3])(?:[0-5]\d)$/.test(time)) {
         return new Response(JSON.stringify({ error: "無效的時間格式，請使用 HHMM (例如 1430)。" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }


    // --- Get Environment Variables --- //
    const { DEEPSEEK_API_KEY } = env;
    console.log(`[Worker ENV DEBUG] DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY ? 'Loaded' : 'MISSING!'}`);

    if (!DEEPSEEK_API_KEY) {
        console.error("[Worker ENV] DEEPSEEK_API_KEY is missing.");
        return new Response(JSON.stringify({ error: "後端 Deepseek API 金鑰未設定" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    // --- Construct the Prompt for Deepseek --- //
    // Map HHMM time values to Shichen (時辰) names and ranges for the prompt
    const shichenMap = {
        "2300": "子時 (23:00 - 00:59)",
        "0100": "丑時 (01:00 - 02:59)",
        "0300": "寅時 (03:00 - 04:59)",
        "0500": "卯時 (05:00 - 06:59)",
        "0700": "辰時 (07:00 - 08:59)",
        "0900": "巳時 (09:00 - 10:59)",
        "1100": "午時 (11:00 - 12:59)",
        "1300": "未時 (13:00 - 14:59)",
        "1500": "申時 (15:00 - 16:59)",
        "1700": "酉時 (17:00 - 18:59)",
        "1900": "戌時 (19:00 - 20:59)",
        "2100": "亥時 (21:00 - 22:59)"
    };

    // Construct time string for the prompt
    let timeStringForPrompt = "(時辰未知)";
    if (time && shichenMap[time]) {
        timeStringForPrompt = shichenMap[time];
    } else if (time) {
        // Fallback if time value is somehow not in the map (shouldn't happen with select)
        timeStringForPrompt = `大約 ${time.substring(0, 2)} 時 ${time.substring(2)} 分`;
    }

    const systemPrompt = `你是一位精通繁體中文的四柱八字命理師。你的任務是根據使用者提供的西元出生年月日時辰和地點（如果提供），進行詳細的八字五行分析，並推薦適合的手串。請遵循以下步驟：
1.  根據西元 ${year} 年 ${month} 月 ${day} 日 ${timeStringForPrompt}${location ? `，出生地點 ${location}` : ''}，推算出精確的農曆日期和對應的時辰天干地支。
2.  排出完整的四柱干支（年柱、月柱、日柱、時柱）。如果時辰未知，請基於年月日三柱進行分析，並說明缺少時柱可能對精確度產生影響。
3.  分析命盤中天干地支對應的五行（金、木、水、火、土）及其數量和旺衰情況。
4.  綜合判斷此命盤中最需要補充的五行是哪一個（通常是數量最少或相對最弱的那個）。明確指出需要補充的五行名稱。
5.  針對需要補充的五行，推薦 3 到 5 種主要的水晶或手串珠材質，並簡要說明該材質屬於哪種五行以及為何適合（例如：黃水晶屬土，適合補土；綠幽靈屬木，適合補木）。
6.  整個回答請使用溫和、專業、易於理解的語氣，並以繁體中文呈現。
7.  將最終的分析結果和建議整合為一個完整的回答。`;

    // Prepare messages for Deepseek
    const messagesForDeepseek = [
        { role: "system", content: systemPrompt },
        // User message is implicit in the system prompt now
    ];

    console.log(`[Worker Logic] Constructed System Prompt for Deepseek (length: ${systemPrompt.length})`);

    // --- Call Deepseek API --- //
    try {
        console.log("[Worker Logic] Calling Deepseek for Bazi analysis...");
        const deepseekAnswer = await callDeepseek(DEEPSEEK_API_KEY, messagesForDeepseek);

        // Format and return Deepseek response
        console.log(`[Worker Logic DEBUG] Received Deepseek analysis (length: ${deepseekAnswer.length})`);
        const formattedResponse = formatResponse(deepseekAnswer);
        console.log("[Worker Logic DEBUG] Sending formatted Deepseek response to client.");
        return new Response(JSON.stringify(formattedResponse), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (e) {
        console.error("[Worker Logic] FATAL Error during Deepseek API call or processing:", e);
        if (e.stack) console.error("[Worker Logic DEBUG] Error Stack:", e.stack);
        const errorMsg = "處理請求時發生內部錯誤 (Worker)";
        const errorDetail = e.message || "Unknown error"; // Use the error message from callDeepseek
        // Return error in the same format as successful response for consistency
        const errorResponse = formatResponse(`分析失敗：${errorDetail}`, "assistant", "error");
        return new Response(JSON.stringify(errorResponse), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

// _worker.js entry point
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    console.log(`[Worker Entry] Request: ${method} ${pathname}`);

    // API route for analysis
    if (pathname === "/api/analyze" && method === "POST") {
        return handleAnalysisRequest(request, env);
    }

    // Static assets route (serving index.html etc.)
    if (method === "GET") {
        try {
            // Use the default asset handling provided by Pages
            // No need to explicitly check env.ASSETS if using standard Pages build output
            // Assuming index.html and other assets are in the build output directory
            return env.ASSETS.fetch(request);
        } catch (e) {
            // Basic error handling for asset fetching
             if (e.message.includes("Could not find asset")) {
                  console.error(`[Worker Static] Asset not found for path: ${pathname}`, e);
                  // Specifically check for root path and serve index.html if not found by default routing
                  if (pathname === '/' ) {
                      console.warn("[Worker Static] Root path '/' not found, attempting to serve '/index.html'");
                      try {
                          let newRequest = new Request(new URL('/index.html', request.url), request);
                          return await env.ASSETS.fetch(newRequest);
                      } catch (nestedError) {
                           console.error("[Worker Static] Failed to serve '/index.html' as fallback for root.", nestedError);
                           return new Response("找不到主要頁面 (index.html)", { status: 404 });
                      }
                  }
                  return new Response("資源未找到 (Not Found)", { status: 404 });
             } else {
                 console.error(`[Worker Static] Error fetching asset: ${pathname}`, e);
                 return new Response("無法讀取靜態資源", { status: 500 });
             }
        }
    }

    // Other methods
    console.warn(`[Worker Entry] Method ${method} not allowed for path '${pathname}'.`);
    return new Response("方法不允許 (Method Not Allowed)", { status: 405 });
  },
};