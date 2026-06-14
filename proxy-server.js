/**
 * CORS 代理服务器 - 转发请求到抖音 API
 * 部署到 Render.com / Railway.app 免费使用
 */

const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const TARGET_HOST = 'api.douyin.wtf';

const server = http.createServer((req, res) => {
    // CORS 头 - 允许任何来源
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    // 预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 只处理 /api/* 路径
    if (!req.url.startsWith('/api/')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('🟢 CORS代理运行中 | API: /api/hybrid/video_data');
        return;
    }

    // 收集请求体
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
        body = Buffer.concat(body).toString();

        const options = {
            hostname: TARGET_HOST,
            port: 443,
            path: req.url,
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'VideoSaver/1.0',
            },
        };

        const proxyReq = https.request(options, (proxyRes) => {
            // 透传响应头（加上CORS）
            res.writeHead(proxyRes.statusCode, {
                ...proxyRes.headers,
                'Access-Control-Allow-Origin': '*',
            });

            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error('代理请求失败:', err);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: -1, message: '代理请求失败: ' + err.message }));
        });

        proxyReq.write(body);
        proxyReq.end();
    });
});

server.listen(PORT, () => {
    console.log(`🟢 CORS代理已启动: http://localhost:${PORT}`);
    console.log(`   转发目标: https://${TARGET_HOST}`);
});
