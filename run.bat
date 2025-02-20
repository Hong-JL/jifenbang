@echo off
echo 正在启动积分榜服务...

:: 检查并创建日志目录
if not exist logs mkdir logs

:: 检查依赖是否安装
if not exist node_modules (
    echo 正在安装依赖...
    npm install
)

:: 启动服务
echo 正在启动永久运行服务...
start /min cmd /c "node forever-service.js"

:: 等待几秒确保服务启动
timeout /t 3 > nul

:: 打开默认浏览器访问服务
start http://localhost:3000

echo 服务已启动！
echo 请不要关闭黑色命令行窗口，可以最小化它。
echo 如果要停止服务，请在任务管理器中结束 Node.js 进程。
pause 