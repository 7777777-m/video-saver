/**
 * 一体化服务器：托管前端 + 多API代理（无CORS问题）
 *
 * 启动: node server.js
 * 访问: http://你的IP:3456
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3456;
const TARGET = 'api.douyin.wtf';

// 前端页面
const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // 首页
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlContent);
        return;
    }

    // API 代理 — 全部转发到 api.douyin.wtf
    if (url.pathname.startsWith('/api/')) {
        console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${url.pathname}${url.search}`);

        const options = {
            hostname: TARGET,
            port: 443,
            path: url.pathname + (url.search || ''),
            method: req.method,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'VideoSaver/1.0',
            },
        };

        // 如果有请求体（POST等），转发
        let bodyChunks = [];
        req.on('data', chunk => bodyChunks.push(chunk));
        req.on('end', () => {
            const body = Buffer.concat(bodyChunks).toString();
            if (body) options.headers['Content-Type'] = 'application/json';

            const proxyReq = https.request(options, (proxyRes) => {
                res.writeHead(proxyRes.statusCode, {
                    'Content-Type': proxyRes.headers['content-type'] || 'application/json',
                    'Access-Control-Allow-Origin': '*',
                });
                proxyRes.pipe(res);
            });

            proxyReq.on('error', (err) => {
                console.error('代理错误:', err.message);
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ code: -1, message: '代理失败: ' + err.message }));
            });

            if (body) proxyReq.write(body);
            proxyReq.end();
        });
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
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
    console.log('🟢 视频下载器已启动 (多API代理)');
    console.log('═══════════════════════════════════════');
    console.log(`   http://localhost:${PORT}`);
    ips.forEach(ip => console.log(`   http://${ip}:${PORT}`));
    console.log('═══════════════════════════════════════');
    console.log('API代理: api.douyin.wtf');
});
