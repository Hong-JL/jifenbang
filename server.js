const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');  // 需要安装 node-fetch
const app = express();

// 启用CORS，允许所有来源
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 设置响应头，确保中文正常显示
app.use((req, res, next) => {
    // 忽略favicon请求
    if (req.url === '/favicon.ico') {
        res.status(204).end();
        return;
    }

    // 根据文件类型设置正确的Content-Type
    if (req.path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (req.path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (req.path.endsWith('.csv')) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8-sig');
    } else {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    next();
});

// 修改CSV文件处理路由
app.get('/积分数据.csv', (req, res) => {
    fs.readFile(path.join(__dirname, '积分数据.csv'), (err, data) => {
        if (err) {
            console.error('读取CSV文件错误:', err);
            res.status(500).send('无法读取文件');
            return;
        }
        
        // 检查文件是否以UTF-8 BOM开头
        const hasBOM = data.length > 3 && data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF;
        
        // 如果没有BOM，添加BOM
        const content = hasBOM ? data : Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), data]);
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8-sig');
        res.send(content);
    });
});

// 静态文件服务
app.use(express.static(path.join(__dirname)));

// 添加GitHub保存路由
app.post('/save-to-github', async (req, res) => {
    try {
        const { message, content, branch, sha } = req.body;
        
        const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${config.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message,
                content,
                branch,
                sha
            })
        });

        if (!response.ok) {
            throw new Error(`GitHub API错误: ${await response.text()}`);
        }

        console.log('成功保存到GitHub');
        res.status(200).send('保存成功');
    } catch (error) {
        console.error('保存失败:', error);
        res.status(500).send('保存失败');
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).send('服务器错误，请查看控制台');
});

// 启动服务器
const port = 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`服务器运行在 http://localhost:${port}`);
    // 显示局域网IP地址
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`局域网访问地址: http://${net.address}:${port}`);
            }
        }
    }
}); 