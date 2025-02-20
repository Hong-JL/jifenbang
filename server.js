const express = require('express');
const cors = require('cors');
const app = express();

// 设置响应头，确保中文正常显示
app.use((req, res, next) => {
    res.header('Content-Type', 'text/html; charset=utf-8');
    next();
});

// 启用CORS，允许跨域请求
app.use(cors());

// 配置静态文件中间件，添加中文支持
app.use(express.static('.', {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
        } else if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (path.endsWith('.csv')) {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        }
    }
}));

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