const Service = require('node-windows').Service;
const path = require('path');

// 创建新的服务对象
const svc = new Service({
    name: '积分榜服务',
    description: '魔法积分榜 Node.js 服务',
    script: path.join(__dirname, 'server.js'),
    nodeOptions: ['--harmony', '--max_old_space_size=4096']
});

// 监听安装事件
svc.on('install', function() {
    svc.start();
    console.log('服务安装成功并已启动');
});

// 安装服务
svc.install(); 