// _worker.js - Modified for Bazi Analysis using Deepseek API with backend Bazi calculation

// --- Bazi Calculation Logic (Simplified Example) ---
const heavenlyStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const earthlyBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const zodiac = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];

// Placeholder/Simplified function for Bazi calculation.
// NOTE: This is a basic example and might not be astronomically precise, especially for edge cases.
// A production system would need a robust, well-tested library.
function calculateBazi(year, month, day, hour = null) {
    // Basic validation is assumed to be done before calling this function

    // --- Year Pillar --- (Simplified - based on year number modulo)
    const yearOffset = (year - 1984) % 60; // 1984 is 甲子 year
    const yearStemIndex = yearOffset % 10;
    const yearBranchIndex = yearOffset % 12;
    const yearPillar = heavenlyStems[yearStemIndex] + earthlyBranches[yearBranchIndex];

    // --- Month Pillar --- (Highly Simplified - Placeholder Logic) ---
    // Accurate calculation depends on Solar Terms (節氣), which is complex.
    // Using a very basic placeholder based on month number.
    // DO NOT USE THIS IN PRODUCTION for accurate Month Pillar.
    const monthStemIndex = ((yearStemIndex % 5) * 2 + (month - 1)) % 10; // Simplified formula
    const monthBranchIndex = (month + 1) % 12; //寅 starts month 1, so offset (index 2)
    const monthPillar = heavenlyStems[monthStemIndex] + earthlyBranches[monthBranchIndex];

    // --- Day Pillar --- (Highly Simplified - Placeholder Logic) ---
    // Accurate calculation requires complex day counting from a reference point.
    // Using a placeholder based on day number. VERY INACCURATE.
    // DO NOT USE THIS IN PRODUCTION for accurate Day Pillar.
    const totalDays = (year - 1900) * 365 + Math.floor((year - 1900) / 4) + day; // Rough estimate
    const dayStemIndex = (totalDays + 4) % 10; // Example offset
    const dayBranchIndex = (totalDays + 10) % 12; // Example offset
    const dayPillar = heavenlyStems[dayStemIndex] + earthlyBranches[dayBranchIndex];

    // --- Hour Pillar --- (Simplified based on Day Stem)
    let hourPillar = null;
    if (hour !== null) {
        const hourNum = Math.floor(hour / 2); // Convert HHMM to 2-hour block index (0-11)
        const hourBranchIndex = hourNum;
        // Hour Stem depends on Day Stem (甲己起甲子, 乙庚起丙子, ...)
        const hourStemStartOffset = [0, 2, 4, 6, 8]; // 甲, 丙, 戊, 庚, 壬
        const dayStemGroup = Math.floor(dayStemIndex / 2); // 0 for 甲/乙, 1 for 丙/丁 etc.
        const hourStemBase = hourStemStartOffset[dayStemGroup];
        const hourStemIndex = (hourStemBase + hourBranchIndex) % 10;
        hourPillar = heavenlyStems[hourStemIndex] + earthlyBranches[hourBranchIndex];
    }

    return {
        yearPillar,
        monthPillar,
        dayPillar,
        hourPillar // Will be null if hour is not provided
    };
}
// --- End of Bazi Calculation Logic ---


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
    let birthTimeValue = time; // Assuming time is passed as '2300', '0100' etc. or null
    if (birthTimeValue && /^(?:[01]\d|2[0-3])(?:[0-5]\d)$/.test(birthTimeValue)) {
       // Convert HHMM string (like '2300' or '0100' from select) to hour index for calculation
       const hourDigits = parseInt(birthTimeValue.substring(0, 2));
       hour = hourDigits;
       // Adjust for 子時 spanning across midnight if needed by the library/logic
       if (hour === 23) { /* Potentially handle late rat hour if logic requires */ }
    } else {
        birthTimeValue = null; // Clear invalid time format if any
    }

    // --- Get Environment Variables --- //
    const { DEEPSEEK_API_KEY } = env;
    console.log(`[Worker ENV DEBUG] DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY ? 'Loaded' : 'MISSING!'}`);

    if (!DEEPSEEK_API_KEY) {
        console.error("[Worker ENV] DEEPSEEK_API_KEY is missing.");
        return new Response(JSON.stringify({ error: "後端 Deepseek API 金鑰未設定" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    // --- Calculate Bazi Pillars --- //
    console.log(`[Worker Logic] Calculating Bazi for: ${year}-${month}-${day} ${hour !== null ? `Hour: ${hour}`: '(Hour unknown)'}`);
    const baziResult = calculateBazi(parseInt(year), parseInt(month), parseInt(day), hour);
    console.log("[Worker Logic DEBUG] Calculated Bazi Pillars:", baziResult);

    // --- Construct Bazi String for Prompt --- //
    let baziString = `年柱：${baziResult.yearPillar}，月柱：${baziResult.monthPillar}，日柱：${baziResult.dayPillar}`;
    if (baziResult.hourPillar) {
        baziString += `，時柱：${baziResult.hourPillar}`;
    } else {
        baziString += "（時辰未知）";
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
    if (birthTimeValue && shichenMap[birthTimeValue]) {
        timeStringForPrompt = shichenMap[birthTimeValue];
    } else if (birthTimeValue) {
        timeStringForPrompt = `大約 ${birthTimeValue.substring(0, 2)} 時 ${birthTimeValue.substring(2)} 分`;
    }

    // --- Updated System Prompt --- //
    const systemPrompt = `你是一位帶點神秘氣質又友善的命理小助手🔮，精通繁體中文和四柱八字解讀。你的任務是根據我提供的使用者八字資訊，用溫馨有趣、偶爾帶點小幽默的語氣，分析他們的八字五行，並推薦開運水晶手串。

**使用者基本資料** (僅供參考，主要依據下方八字分析)：
*   西元生日：${year} 年 ${month} 月 ${day} 日
*   出生時辰：${timeStringForPrompt}
${location ? `*   出生地點：${location}\n`: ''}
**已算出的四柱八字**：
*   **${baziString}**

請**根據以上提供的四柱八字**，按照以下魔法步驟進行分析，並用自然流暢的文字和溫馨可愛的 emoji ✨🌸💎 來呈現結果，避免使用生硬的 '###' 標題和過多的 '**' 粗體：

1.  基於提供的八字 **${baziString}**，用淺顯易懂的方式，點出命盤中五行（金木水火土）的數量和大致強弱情況，不用太學術化。
2.  根據子平八字理論，找出命盤中最需要「呼喚」或「補充」的那個五行能量。直接告訴使用者是哪個。
3.  針對需要補充的五行，就像推薦好朋友一樣，推薦 3 到 5 種主要的水晶手串材質。假如缺失1種五行就推薦3-5種、假如缺失2種五行就根據缺失的2種五行做分別的推薦3-5種與混和推薦也是推薦2-4種
。要說明這個材質屬於哪種五行，以及為什麼它很棒（例如：黃水晶是土系小可愛，可以帶來穩定力量；草莓晶是火系小太陽，能點燃熱情🔥）。
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