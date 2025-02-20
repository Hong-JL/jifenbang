const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
    name: '积分榜服务',
    script: path.join(__dirname, 'server.js')
});

svc.on('uninstall', function() {
    console.log('服务已卸载');
});

svc.uninstall(); 