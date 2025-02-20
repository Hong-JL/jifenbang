@echo off
echo 正在启动积分榜服务...

:: 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 请先安装 Node.js
    pause
    exit /b
)

:: 检查依赖是否安装
if not exist node_modules (
    echo 正在安装依赖...
    npm install
)

:: 启动服务
echo 正在启动服务...
start /min cmd /c "node server.js"

:: 创建开机启动快捷方式
echo 正在创建开机启动项...
powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%userprofile%\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\积分榜服务.lnk');$s.TargetPath='%~dp0start-service.bat';$s.WorkingDirectory='%~dp0';$s.Save()"

echo 服务已启动！
echo 已添加到开机启动项
timeout /t 5 