let appData = {
    currentDate: new Date().toLocaleDateString('zh-CN'),
    students: [],
    dailyScores: {}
};

// 创建学生对象
function createStudent(name) {
    return {
        name,
        current: 0,
        total: 0,
        history: []
    };
}

// 导出数据为CSV文件
function exportToCSV() {
    const csvContent = [
        ['姓名', '当日积分', '总积分'],
        ...appData.students.map(s => [s.name, s.current, s.total])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `积分数据_${appData.currentDate.replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// 导入CSV数据
function importFromCSV(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const rows = text.split('\n')
                .map(row => row.trim())
                .filter(row => row)
                .slice(1); // 跳过标题行

            const data = rows.map(row => {
                const [name, current, total] = row.split(',').map(item => item.trim());
                return {
                    name,
                    current: parseInt(current) || 0,
                    total: parseInt(total) || 0,
                    history: []
                };
            });

            if (data.length > 0) {
                if (confirm(`确定要导入${data.length}名学生的数据吗？这将覆盖当前数据。`)) {
                    appData.students = data;
                    saveData();
                    renderAll();
                    alert('数据导入成功！');
                }
            } else {
                alert('文件中没有找到有效数据');
            }
        } catch (error) {
            console.error('导入失败:', error);
            alert('导入失败，请检查文件格式是否正确');
        }
    };
    reader.readAsText(file);
}

// GitHub配置
const config = {
    owner: '你的GitHub用户名',
    repo: '你的仓库名',
    path: '积分数据.csv',
    token: '你的GitHub Token',
    branch: 'main'  // 或者 'master'，取决于你的默认分支
};

// 从GitHub加载数据
async function loadFromGitHub() {
    try {
        const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`, {
            headers: {
                'Authorization': `token ${config.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) throw new Error('文件不存在');
        
        const data = await response.json();
        const content = atob(data.content);
        const sha = data.sha; // 保存sha用于更新文件
        
        const rows = content.split('\n')
            .map(row => row.trim())
            .filter(row => row)
            .slice(1); // 跳过标题行
        
        const parsedData = rows.map(row => {
            const [name, current, total] = row.split(',').map(item => item.trim());
            return {
                name,
                current: parseInt(current) || 0,
                total: parseInt(total) || 0,
                history: []
            };
        });

        if (parsedData.length > 0) {
            appData.students = parsedData;
            return sha;
        }
    } catch (error) {
        console.log('无法从GitHub加载数据:', error);
        return null;
    }
}

// 保存数据到GitHub
async function saveToGitHub(sha) {
    try {
        const csvContent = [
            ['姓名', '当日积分', '总积分'],
            ...appData.students.map(s => [s.name, s.current, s.total])
        ].map(row => row.join(',')).join('\n');

        const content = btoa(unescape(encodeURIComponent(csvContent))); // 支持中文

        const body = {
            message: `更新积分数据 ${new Date().toLocaleString()}`,
            content,
            branch: config.branch
        };
        
        if (sha) body.sha = sha; // 如果文件已存在，需要提供sha

        const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${config.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error('保存失败');
        
        const result = await response.json();
        return result.content.sha;
    } catch (error) {
        console.error('保存到GitHub失败:', error);
        return null;
    }
}

// 修改初始化函数
async function initData() {
    const savedData = localStorage.getItem('classPoints');
    if (savedData) {
        appData = JSON.parse(savedData);
        renderAll();
        return;
    }
    
    // 如果没有数据，创建空的学生列表
    appData.students = [];
    renderAll();
}

// 修改保存数据函数
async function saveData() {
    // 本地测试时只使用localStorage
    localStorage.setItem('classPoints', JSON.stringify(appData));
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

// 批量加分
function batchAdd() {
    const points = parseInt(document.getElementById('globalPoints').value);
    getSelectedStudents().forEach(name => {
        const student = appData.students.find(s => s.name === name);
        student.current += points;
        student.total += points;
    });
    saveData();
    renderAll();
}

// 批量减分
function batchSubtract() {
    const points = parseInt(document.getElementById('globalPoints').value);
    getSelectedStudents().forEach(name => {
        const student = appData.students.find(s => s.name === name);
        student.current -= points;
        student.total -= points;
    });
    saveData();
    renderAll();
}

// 调整单个学生分数
function adjustPoints(name, amount) {
    const student = appData.students.find(s => s.name === name);
    student.current += amount;
    student.total += amount;
    saveData();
    renderAll();
}

// 渲染学生列表
function renderStudents() {
    const container = document.getElementById('studentsContainer');
    container.innerHTML = appData.students.map(student => `
        <div class="student">
            <input type="checkbox" class="student-checkbox" value="${student.name}">
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
}

// 渲染排行榜
function renderRankings() {
    const currentSorted = [...appData.students].sort((a, b) => b.current - a.current);
    document.getElementById('currentRank').innerHTML = currentSorted
        .map((s, i) => `
            <div class="ranking-item">
                ${['🥇','🥈','🥉'][i] || ''} 
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
                <span class="total-score">${s.total}分</span>
            </div>
        `).join('');

    document.getElementById('currentDate').textContent = appData.currentDate;
}

// 渲染所有内容
function renderAll() {
    renderStudents();
    renderRankings();
}

// 清空总积分
function clearAllScores() {
    if (confirm('确定要清空所有学生的总积分吗？此操作不可撤销！')) {
        appData.students.forEach(student => {
            student.total = 0;
            student.current = 0;
        });
        saveData();
        renderAll();
    }
}

// 添加加载状态
let isLoading = false;

// 添加加载提示
function showLoading(show) {
    isLoading = show;
    // 添加加载UI提示
    document.body.style.cursor = show ? 'wait' : 'default';
}

// 页面加载时初始化
window.onload = async function() {
    await initData();
    if (appData.students.length === 0) {
        document.getElementById('fileInput').click();
    }
    renderAll();
};

// 修改页面关闭时保存
window.addEventListener('beforeunload', function() {
    localStorage.setItem('classPoints', JSON.stringify(appData));
});

// 检查配置
async function checkConfig() {
    try {
        const response = await fetch('config.js');
        if (!response.ok) {
            alert('请创建config.js文件并填入你的GitHub配置！\n可以复制config.example.js为config.js，然后修改里面的配置信息。');
            return false;
        }
        return true;
    } catch (error) {
        alert('无法加载配置文件！');
        return false;
    }
} 