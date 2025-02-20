const forever = require('forever-monitor');
const path = require('path');

const child = new forever.Monitor('server.js', {
    max: 3,
    silent: false,
    args: [],
    sourceDir: path.join(__dirname),
    logFile: path.join(__dirname, 'logs', 'forever.log'),
    outFile: path.join(__dirname, 'logs', 'out.log'),
    errFile: path.join(__dirname, 'logs', 'error.log'),
    watch: true,
    watchDirectory: __dirname
});

child.on('exit', function () {
    console.log('服务已停止');
});

child.on('restart', function () {
    console.log('服务正在重启...');
});

child.on('error', function (err) {
    console.error('服务发生错误:', err);
});

child.start();
console.log('积分榜服务已启动'); 