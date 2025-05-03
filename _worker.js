/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8788/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		// API 請求路由
		if (url.pathname === '/api/interpret' && request.method === 'POST') {
			return handleApiRequest(request, env);
		}

		// 處理靜態文件請求 (例如 index.html)
		if (url.pathname === '/' || url.pathname === '/index.html') {
			// 這裡我們假設 index.html 是根目錄下的主要文件
			// 在實際的 Cloudflare Pages 項目中，靜態文件通常由平台自動處理
			// 這個 fetch 主要是為了本地開發 (wrangler pages dev) 或純 Worker 部署時能返回 HTML
			// 如果你的 index.html 和 js 文件是通過 Pages 的 Git 集成部署的，這部分可能不需要，
			// 但保留它對於本地測試 `wrangler pages dev .` 或純 Worker 部署是有幫助的。

			// --- 開始: 返回 index.html --- //
			// 重要：在 Cloudflare Pages 中，你不需要手動提供 index.html
			// 這裡只是一個示例，假設你需要從 Worker 返回 HTML
			// 你需要將 index.html 的內容放在這裡或從 KV/R2 讀取
			// --- 為了簡化，我們只返回一個基本提示 --- //
			// return new Response("請訪問實際的 Cloudflare Pages 部署地址查看前端頁面", { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

			// --- 實際返回 index.html 的示例 (如果需要) ---
			// import indexHtml from './index.html'; // 需要配置打包工具支持
			// return new Response(indexHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

            // 在 Cloudflare Pages 的 `_worker.js` 中，env.ASSETS.fetch 可以用來獲取靜態資源
            try {
                 // 嘗試從 Pages 的靜態資源中獲取 index.html
                 return env.ASSETS.fetch(request);
            } catch (e) {
                 console.error("Failed to fetch from env.ASSETS:", e);
                 // 如果 ASSETS 不可用（例如純 Worker 部署），返回備用信息
                 return new Response('找不到前端資源。請確保項目已正確部署。_worker.js', { status: 404 });
            }
		}

        // --- 新增：處理 JS 文件請求 (用於本地開發或純 Worker) ---
         if (url.pathname === '/lunar.js' || url.pathname === '/calendar.js') {
             try {
                 return env.ASSETS.fetch(request);
             } catch (e) {
                 console.error("Failed to fetch JS from env.ASSETS:", e);
                 return new Response(`/* Resource ${url.pathname} not found */`, { status: 404, headers: { 'Content-Type': 'application/javascript' } });
             }
         }

		// 對於其他未匹配的路徑，返回 404
		return new Response('路徑未找到', { status: 404 });
	},
};

async function handleApiRequest(request, env) {
	// 檢查 API Key 是否設置
	if (!env.DEEPSEEK_API_KEY) {
		return new Response(JSON.stringify({ error: { message: 'DeepSeek API 金鑰未設定' } }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let requestData;
	try {
		requestData = await request.json();
	} catch (e) {
		return new Response(JSON.stringify({ error: { message: '請求 Body 解析失敗，請確認格式為 JSON' } }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// 從請求中獲取前端已格式化的 prompt
	const userPrompt = requestData.prompt;

	if (!userPrompt || typeof userPrompt !== 'string') {
		return new Response(JSON.stringify({ error: { message: '請求中缺少有效的 prompt 字符串' } }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	console.log("Received prompt for DeepSeek:", userPrompt);

	// DeepSeek API Endpoint
	const apiEndpoint = 'https://api.deepseek.com/chat/completions';

	// 構建發送給 DeepSeek 的請求體
	const deepseekPayload = {
		model: 'deepseek-chat', // 或者選擇其他合適的模型
		messages: [
			{ role: 'system', content: '你是一個精通三傳占卜和中華術數的專家。請根據使用者提供的占卜結果（包含三傳、五行關係、額外分析等）`並結合使用者可能提出的具體問題`，進行詳細、專業且易於理解的解讀。如果使用者沒有提問，則進行通用的卦象綜合解讀。請始終使用繁體中文回答。' },
			{ role: 'user', content: userPrompt } // 將前端生成的 prompt 直接傳給 user role
		],
		stream: false, // 設置為 false 以獲取完整的回應
	};

	try {
		// 發送請求到 DeepSeek API
		const deepseekResponse = await fetch(apiEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
			},
			body: JSON.stringify(deepseekPayload),
		});

		// 檢查 DeepSeek API 的回應狀態
		if (!deepseekResponse.ok) {
			const errorBody = await deepseekResponse.text();
			console.error(`DeepSeek API Error (${deepseekResponse.status}): ${errorBody}`);
			return new Response(JSON.stringify({ error: { message: `DeepSeek API 請求失敗 (${deepseekResponse.status}): ${errorBody}` } }), {
				status: deepseekResponse.status,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// 解析 DeepSeek 的回應
		const deepseekResult = await deepseekResponse.json();
		console.log("Received from DeepSeek:", JSON.stringify(deepseekResult));

		// 提取 DeepSeek 生成的解讀文本
		let interpretation = '無法獲取 AI 解讀結果。'; // 預設值
		if (deepseekResult.choices && deepseekResult.choices[0] && deepseekResult.choices[0].message && deepseekResult.choices[0].message.content) {
			interpretation = deepseekResult.choices[0].message.content.trim();
		} else if (deepseekResult.error) {
            console.error("DeepSeek returned an error object:", deepseekResult.error);
             return new Response(JSON.stringify({ error: { message: `DeepSeek 返回錯誤: ${deepseekResult.error.message || JSON.stringify(deepseekResult.error)}` } }), {
                 status: 500, // 或根據 DeepSeek 錯誤調整
                 headers: { 'Content-Type': 'application/json' },
             });
        }

		// 將解讀結果返回給前端
		return new Response(JSON.stringify({ interpretation: interpretation }), {
			headers: { 'Content-Type': 'application/json; charset=utf-8' }, // 確保 UTF-8 編碼
		});

	} catch (error) {
		console.error('處理 API 請求時發生錯誤:', error);
		return new Response(JSON.stringify({ error: { message: `內部伺服器錯誤: ${error.message}` } }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}