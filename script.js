// 将需要在HTML中调用的函数暴露到全局
window.toggleSelectAll = toggleSelectAll;
window.batchAdd = batchAdd;
window.batchSubtract = batchSubtract;
window.adjustPoints = adjustPoints;
window.clearAllScores = clearAllScores;
window.saveToGitHub = saveToGitHub;

let appData = {
    currentDate: new Date().toLocaleDateString('zh-CN'),
    students: [],
    dailyScores: {}  // 用于存储每日积分记录
};

// 添加一个变量跟踪数据是否被修改
let dataModified = false;

// 渲染所有内容
function renderAll() {
    document.getElementById('currentDate').textContent = appData.currentDate;
    
    // 渲染学生列表
    const container = document.getElementById('studentsContainer');
    container.innerHTML = appData.students.map(student => `
        <div class="student">
            <input type="checkbox" class="student-checkbox" data-student="${student.name}">
            <span style="font-weight: bold; color: var(--primary-color)">${student.name}</span>
            <div class="student-controls">
                <button class="btn-add green" onclick="adjustPoints('${student.name}', 1)" title="课堂表现 +1">
                    <i class="fas fa-comment-dots"></i>
                </button>
                <button class="btn-add blue" onclick="adjustPoints('${student.name}', 5)" title="任务作品 +5">
                    <i class="fas fa-paint-brush"></i>
                </button>
                <button class="btn-subtract red" onclick="adjustPoints('${student.name}', -1)" title="提醒 -1">
                    <i class="fas fa-exclamation-triangle"></i>
                </button>
            </div>
        </div>
    `).join('');

    // 渲染排行榜
    const currentSorted = [...appData.students].sort((a, b) => b.current - a.current);
    document.getElementById('currentRank').innerHTML = currentSorted
        .map((s, i) => `
            <div class="ranking-item">
                <span class="rank-number">${i+1}</span>
                <span class="name">${s.name}</span>
                <span class="score">${s.current}分</span>
            </div>
        `).join('');

    const totalSorted = [...appData.students].sort((a, b) => b.total - a.total);
    document.getElementById('totalRank').innerHTML = totalSorted
        .map((s, i) => `
            <div class="ranking-item">
                <span class="rank-number">${i+1}</span>
                <span class="name">${s.name}</span>
                <span class="score">${s.total}分</span>
            </div>
        `).join('');
}

// 修改积分的函数
async function adjustPoints(studentName, amount) {
    const student = appData.students.find(s => s.name === studentName);
    if (student) {
        student.current += amount;
        student.total += amount;
        student.history.push({
            date: new Date().toISOString(),
            points: amount
        });
        
        markDataModified();
        renderAll();
    }
}

// 批量添加积分
async function batchAdd() {
    const points = parseInt(document.getElementById('globalPoints').value) || 1;
    const checkboxes = document.querySelectorAll('.student-checkbox:checked');
    
    for (const checkbox of checkboxes) {
        const studentName = checkbox.getAttribute('data-student');
        await adjustPoints(studentName, points);
    }
}

// 批量减分
async function batchSubtract() {
    const points = parseInt(document.getElementById('globalPoints').value) || 1;
    const checkboxes = document.querySelectorAll('.student-checkbox:checked');
    
    for (const checkbox of checkboxes) {
        const studentName = checkbox.getAttribute('data-student');
        await adjustPoints(studentName, -points);
    }
}

// 清空所有积分
async function clearAllScores() {
    if (confirm('确定要清空所有同学的总积分吗？')) {
        appData.students.forEach(student => {
            student.current = 0;
            student.total = 0;
            student.history = [];
        });
        markDataModified();
        renderAll();
    }
}

// 创建学生对象
function createStudent(name) {
    return {
        name,
        current: 0,
        total: 0,
        history: []
    };
}

// 修改 config.js 的导入方式
function getConfig() {
    return window.config || {};
}

// 从GitHub加载数据
async function loadFromGitHub() {
    try {
        console.log('正在从GitHub加载数据...');
        const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`, {
            headers: {
                'Authorization': `token ${config.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        console.log('GitHub API响应状态:', response.status);
        if (!response.ok) {
            console.error('GitHub API错误:', await response.text());
            return null;
        }

        const data = await response.json();
        const content = decodeURIComponent(escape(atob(data.content)));
        console.log('从GitHub加载的数据:', content);
        
        // 保存当前的SHA值
        window.currentSha = data.sha;
        
        return content;
    } catch (error) {
        console.error('从GitHub加载数据失败:', error);
        return null;
    }
}

// 全选/取消全选
function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.student-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
}

// 获取选中的学生
function getSelectedStudents() {
    return Array.from(document.querySelectorAll('.student-checkbox:checked'))
        .map(cb => cb.value);
}

// 添加加载状态
let isLoading = false;

// 添加加载提示
function showLoading(show) {
    isLoading = show;
    // 添加加载UI提示
    document.body.style.cursor = show ? 'wait' : 'default';
}

// 修改初始化函数
async function initData() {
    try {
        console.log('开始初始化数据...');
        // 首先检查配置
        if (!await checkConfig()) {
            throw new Error('配置检查失败');
        }

        // 尝试从GitHub加载
        const githubData = await loadFromGitHub();
        if (githubData) {
            const rows = githubData.split('\n')
                .map(row => row.trim())
                .filter(row => row)
                .slice(1); // 跳过标题行

            appData.students = rows.map(row => {
                const [name, current, total] = row.split(',').map(item => item.trim());
                return {
                    name,
                    current: parseInt(current) || 0,
                    total: parseInt(total) || 0,
                    history: []
                };
            });

            console.log('从GitHub加载的学生数据:', appData.students);
            renderAll();
            return;
        }

        // 如果GitHub加载失败，尝试从localStorage加载
        const savedData = localStorage.getItem('classPoints');
        if (savedData) {
            appData = JSON.parse(savedData);
            console.log('从localStorage加载的数据:', appData);
            renderAll();
            return;
        }

        throw new Error('无法加载数据');
    } catch (error) {
        console.error('初始化数据失败:', error);
        alert('加载数据失败，请检查网络连接和GitHub配置');
    }
}

// 检查配置
async function checkConfig() {
    try {
        const response = await fetch('config.js');
        if (!response.ok) {
            document.querySelector('.setup-guide').style.display = 'block';
            return false;
        }
        // 测试token是否有效
        const testResponse = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}`, {
            headers: {
                'Authorization': `token ${config.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (!testResponse.ok) {
            alert('GitHub Token无效，请检查配置！');
            document.querySelector('.setup-guide').style.display = 'block';
            return false;
        }
        return true;
    } catch (error) {
        alert('无法加载配置文件！');
        document.querySelector('.setup-guide').style.display = 'block';
        return false;
    }
}

// 修改保存到GitHub的函数
async function saveToGitHub() {
    try {
        showLoading(true);
        const csvContent = [
            ['姓名', '当日积分', '总积分'],
            ...appData.students.map(s => [s.name, s.current, s.total])
        ].map(row => row.join(',')).join('\n');

        const content = btoa(unescape(encodeURIComponent('\ufeff' + csvContent)));
        const body = {
            message: `更新积分数据 ${new Date().toLocaleString('zh-CN')}`,
            content,
            branch: config.branch,
            sha: window.currentSha
        };

        const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${config.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`GitHub保存失败: ${await response.text()}`);
        }

        const result = await response.json();
        window.currentSha = result.content.sha;
        dataModified = false;
        showLoading(false);
        return true;
    } catch (error) {
        console.error('保存到GitHub失败:', error);
        showLoading(false);
        return false;
    }
}

// 添加自动保存功能
let autoSaveTimer = null;

// 修改所有会改变数据的函数，添加自动保存
function markDataModified() {
    dataModified = true;
    localStorage.setItem('classPoints', JSON.stringify(appData));
    
    // 清除之前的定时器
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    
    // 设置新的定时器，5分钟后自动保存
    autoSaveTimer = setTimeout(async () => {
        if (dataModified) {
            await saveToGitHub();
        }
    }, 5 * 60 * 1000); // 5分钟
}

// 修改页面关闭事件处理
window.addEventListener('beforeunload', function(e) {
    if (dataModified) {
        // 显示确认对话框
        e.preventDefault();
        e.returnValue = '有未保存的更改，正在保存...';

        try {
            // 使用 navigator.sendBeacon 进行异步保存
            const csvContent = [
                ['姓名', '当日积分', '总积分'],
                ...appData.students.map(s => [s.name, s.current, s.total])
            ].map(row => row.join(',')).join('\n');

            const content = btoa(unescape(encodeURIComponent('\ufeff' + csvContent)));
            const formData = new FormData();
            formData.append('message', `更新积分数据 ${new Date().toLocaleString('zh-CN')}`);
            formData.append('content', content);
            formData.append('branch', config.branch);
            formData.append('sha', window.currentSha);

            // 使用服务器作为中转
            navigator.sendBeacon('/save-to-github', formData);
        } catch (error) {
            console.error('保存失败:', error);
        }
    }
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initData);

// 修改保存函数，添加日期列
async function saveToLocal() {
    try {
        // 获取当前日期作为新列名
        const today = new Date().toLocaleDateString('zh-CN');
        
        // 读取现有的CSV文件以获取历史数据
        const response = await fetch('积分数据.csv');
        let existingData = '';
        let headers = ['姓名', '当日积分', '总积分'];
        let historicalDates = [];
        
        if (response.ok) {
            existingData = await response.text();
            const rows = existingData.split('\n').map(row => row.trim());
            if (rows.length > 0) {
                // 获取现有的列标题
                headers = rows[0].split(',').map(h => h.trim());
                historicalDates = headers.slice(3); // 获取已有的日期列
            }
        }

        // 如果今天的日期列还不存在，添加它
        if (!historicalDates.includes(today)) {
            headers.push(today);
        }

        // 准备新的CSV内容
        const csvRows = [headers];
        
        // 添加每个学生的数据
        appData.students.forEach(student => {
            const row = [student.name, student.current, student.total];
            
            // 添加历史数据
            historicalDates.forEach(date => {
                if (date === today) {
                    row.push(student.current); // 今天的积分
                } else {
                    // 从现有数据中查找历史积分
                    const historicalScore = existingData
                        .split('\n')
                        .find(r => r.startsWith(student.name + ','))
                        ?.split(',')
                        [headers.indexOf(date)] || '0';
                    row.push(historicalScore);
                }
            });
            
            // 如果今天是新的一天，添加今天的积分
            if (!historicalDates.includes(today)) {
                row.push(student.current);
            }
            
            csvRows.push(row);
        });

        const csvContent = csvRows.map(row => row.join(',')).join('\n');

        // 保存到服务器
        const saveResponse = await fetch('/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: csvContent })
        });

        if (saveResponse.ok) {
            alert('保存成功！');
        } else {
            throw new Error('保存失败');
        }
    } catch (error) {
        console.error('保存失败:', error);
        alert('保存失败，请重试！');
    }
}

// 修改加载函数，支持历史数据
async function loadFromLocal() {
    try {
        const response = await fetch('积分数据.csv');
        if (!response.ok) throw new Error('无法加载文件');
        
        const text = await response.text();
        const rows = text.split('\n')
            .map(row => row.trim())
            .filter(row => row);
        
        // 获取列标题
        const headers = rows[0].split(',').map(h => h.trim());
        
        // 解析学生数据
        appData.students = rows.slice(1).map(row => {
            const columns = row.split(',').map(item => item.trim());
            return {
                name: columns[0],
                current: parseInt(columns[1]) || 0,
                total: parseInt(columns[2]) || 0
            };
        });

        localStorage.setItem('classPoints', JSON.stringify(appData));
        renderAll();
    } catch (error) {
        console.error('加载数据失败:', error);
        const savedData = localStorage.getItem('classPoints');
        if (savedData) {
            appData = JSON.parse(savedData);
            renderAll();
        }
    }
} 