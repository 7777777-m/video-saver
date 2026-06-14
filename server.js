/**
 * 一体化服务器：托管前端页面 + 代理 API 请求（解决 CORS）
 *
 * 启动: node server.js
 * 访问: http://你的IP:3456
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3456;
const TARGET_API = 'api.douyin.wtf';

// 读取前端 HTML
const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // ============================================================
    // 路由1: 首页 - 返回前端页面
    // ============================================================
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlContent);
        return;
    }

    // ============================================================
    // 路由2: API 代理 - 转发请求到抖音 API
    // ============================================================
    if (url.pathname.startsWith('/api/')) {
        // 收集请求体
        let body = [];
        req.on('data', chunk => body.push(chunk));
        req.on('end', () => {
            body = Buffer.concat(body).toString();

            const options = {
                hostname: TARGET_API,
                port: 443,
                path: url.pathname + (url.search || ''),
                method: req.method,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'VideoSaver/1.0',
                },
            };

            if (body) {
                options.headers['Content-Type'] = 'application/json';
            }

            const proxyReq = https.request(options, (proxyRes) => {
                res.writeHead(proxyRes.statusCode, {
                    'Content-Type': proxyRes.headers['content-type'] || 'application/json',
                    'Access-Control-Allow-Origin': '*',
                });

                let responseBody = [];
                proxyRes.on('data', chunk => responseBody.push(chunk));
                proxyRes.on('end', () => {
                    res.end(Buffer.concat(responseBody));
                });
            });

            proxyReq.on('error', (err) => {
                console.error('代理错误:', err.message);
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ code: -1, message: '代理请求失败: ' + err.message }));
            });

            if (body) {
                proxyReq.write(body);
            }
            proxyReq.end();
        });
        return;
    }

    // ============================================================
    // 404
    // ============================================================
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
    // 获取本机IP
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const ips = [];
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                ips.push(net.address);
            }
        }
    }

    console.log('═══════════════════════════════════════');
    console.log('🟢 视频下载器服务已启动！');
    console.log('═══════════════════════════════════════');
    console.log(`   本地访问: http://localhost:${PORT}`);
    ips.forEach(ip => {
        console.log(`   iPhone访问: http://${ip}:${PORT}`);
    });
    console.log('═══════════════════════════════════════');
    console.log('💡 iPhone 用 Safari 打开上面的地址即可');
    console.log('   API代理已内置，无CORS问题');
});
