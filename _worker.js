// _worker.js - Modified for testing dependency resolution with lodash-es

// --- Import the accurate Bazi library (COMMENTED OUT FOR TEST) ---
import { BaziCalculator } from 'bazi-calculator-by-alvamind';

// --- Import lodash-es for testing ---
// import { get } from 'lodash-es'; // Import a function from lodash-es

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

    // --- Time Handling --- //
    let hour = null;
    let birthTimeValue = time;
    if (birthTimeValue && /^(?:[01]\d|2[0-3])(?:[0-5]\d)$/.test(birthTimeValue)) {
       const hourDigits = parseInt(birthTimeValue.substring(0, 2));
       hour = hourDigits; // Use the hour number (0-23)
    } else {
        birthTimeValue = null;
    }
    console.log(`[Worker Logic] Using Time: Year=${year}, Month=${month}, Day=${day}, Hour=${hour === null ? 'Unknown' : hour}`);

    // --- Get Environment Variables --- //
    const { DEEPSEEK_API_KEY } = env;
    console.log(`[Worker ENV DEBUG] DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY ? 'Loaded' : 'MISSING!'}`);

    if (!DEEPSEEK_API_KEY) {
        console.error("[Worker ENV] DEEPSEEK_API_KEY is missing.");
        return new Response(JSON.stringify({ error: "後端 Deepseek API 金鑰未設定" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    // --- Calculate Bazi Pillars using the accurate library --- //
    let baziString = "八字計算失敗"; // Default error message
    try {
        console.log(`[Worker Logic] Calculating Bazi using bazi-calculator-by-alvamind...`);
        const calculator = new BaziCalculator(
            parseInt(year),
            parseInt(month),
            parseInt(day),
            hour
        );
        const pillars = calculator.calculatePillars();
        if (!pillars || !pillars.year || !pillars.month || !pillars.day) {
            throw new Error("八字函式庫未能回傳有效的年月日時柱。");
        }
        baziString = `年柱：${pillars.year.chinese}，月柱：${pillars.month.chinese}，日柱：${pillars.day.chinese}`;
        if (pillars.time && pillars.time.chinese) {
            baziString += `，時柱：${pillars.time.chinese}`;
        } else {
            baziString += "（時辰未知）";
        }
        console.log("[Worker Logic DEBUG] Calculated Bazi Pillars using library:", pillars); // Log raw result
    } catch (calcError) {
         console.error("[Worker Logic] Error during Bazi calculation library execution:", calcError);
         // Add more specific error logging if possible
         if (calcError.stack) {
             console.error("[Worker Logic DEBUG] Bazi Calc Error Stack:", calcError.stack);
         }
         return new Response(JSON.stringify(formatResponse(`八字排盤計算失敗：${calcError.message}`, "assistant", "error")), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // --- Use lodash-es function (REMOVED) ---
    // const testObj = { a: { b: 1 } };
    // const lodashResult = get(testObj, 'a.b', 'default');
    // console.log("[Worker Logic DEBUG] Lodash get result (for import test):", lodashResult);

    // --- Construct Bazi String for Prompt --- //
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
    if (birthTimeValue && shichenMap[birthTimeValue]) {
        timeStringForPrompt = shichenMap[birthTimeValue];
    } else if (birthTimeValue) {
        timeStringForPrompt = `大約 ${birthTimeValue.substring(0, 2)} 時 ${birthTimeValue.substring(2)} 分`;
    }

    // --- Updated System Prompt --- //
    const systemPrompt = `你是一位帶點神秘氣質又友善的命理小助手🔮，精通繁體中文和四柱八字解讀。你的任務是根據我提供的使用者八字資訊，用溫馨有趣、偶爾帶點小幽默的語氣，分析他們的八字五行，並推薦開運水晶手串。

**使用者基本資料** (僅供參考，主要依據下方已計算出的八字分析)：
*   西元生日：${year} 年 ${month} 月 ${day} 日
*   出生時辰：${timeStringForPrompt}
${location ? `*   出生地點：${location}
`: ''}
**已精確算出的四柱八字** (請以此為準進行解讀)：
*   **${baziString}**

請**根據以上提供的精確四柱八字**，按照以下魔法步驟進行分析，並用自然流暢的文字和溫馨可愛的 emoji ✨🌸💎 來呈現結果，避免使用生硬的 '###' 標題和過多的 '**' 粗體：

1.  基於提供的八字 **${baziString}**，用淺顯易懂的方式，點出命盤中五行（金木水火土）的數量和大致強弱情況。**請使用列表方式呈現**，例如：
    *   🌳 木：[數量] 個 - [簡短描述，如：像森林般茂盛]
    *   🔥 火：[數量] 個 - [簡短描述，如：溫暖的小火苗]
    *   ⛰️ 土：[數量] 個 - [簡短描述]
    *   💧 水：[數量] 個 - [簡短描述]
    *   ⚙️ 金：[數量] 個 - [簡短描述，如：有點害羞呢 / 閃閃發光]
2.  根據子平八字理論（基於提供的八字），找出命盤中最需要「呼喚」或「補充」的那個五行能量。直接告訴使用者是哪個。
3.  針對需要補充的五行，就像推薦好朋友一樣，推薦 3 到 5 種主要的水晶手串材質。假如缺失1種五行就推薦3-5種、假如缺失2種五行就根據缺失的2種五行做分別的推薦3-5種與混和推薦也是推薦2-4種。要說明這個材質屬於哪種五行，以及為什麼它很棒（例如：黃水晶是土系小可愛，可以帶來穩定力量；草莓晶是火系小太陽，能點燃熱情🔥）。
4.  最後，用溫暖鼓勵的語氣做個總結，提醒這些建議是增加生活情趣和信心的參考，並送上祝福。

請將分析結果和建議整合為一段自然、溫馨且帶點神秘感的完整回覆，記得多用點可愛的 emoji 喔！`;

    // Prepare messages for Deepseek
    const messagesForDeepseek = [
        { role: "system", content: systemPrompt },
        // No separate user message needed as context is in system prompt
    ];

    console.log(`[Worker Logic] Constructed System Prompt for Deepseek (length: ${systemPrompt.length})`);

    // --- Call Deepseek API --- //
    try {
        console.log("[Worker Logic] Calling Deepseek for Bazi interpretation...");
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