// Data Storage Keys
const STORAGE_KEYS = {
    AGENTS: 'mgr_agents',
    CURRENT_AGENT: 'mgr_current_agent',
    GOALS: 'mgr_goals',
    CUSTOMERS: 'mgr_customers',
    FAMILY: 'mgr_family',
    KIV: 'mgr_kiv',
    MONTHLY: 'mgr_monthly',
    CALENDAR_EVENTS: 'mgr_calendar_events',
    VISITS: 'mgr_visits',
    REFERRALS: 'mgr_referrals',
    QUADRANT: 'mgr_quadrant'
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    setupAuth();
    setupNavigation();
    setupModals();
    setupForms();
    loadCurrentAgent();
    initializeCalendar();
    loadAllData();
    initializeSyncAndBackup();
}

// Authentication
function setupAuth() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const showForgotPassword = document.getElementById('showForgotPassword');
    const backToLogin = document.getElementById('backToLogin');
    const logoutBtn = document.getElementById('logoutBtn');

    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthForm('register');
    });
    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthForm('login');
    });
    showForgotPassword.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthForm('forgot');
    });
    backToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthForm('login');
    });
    logoutBtn.addEventListener('click', handleLogout);
}

function switchAuthForm(form) {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    let formId = '';
    if (form === 'forgot') {
        formId = 'forgot-password-form';
    } else {
        formId = `${form}-form`;
    }
    document.getElementById(formId).classList.add('active');
}

function handleLogin(e) {
    e.preventDefault();
    const code = document.getElementById('loginCode').value;
    const password = document.getElementById('loginPassword').value;

    const agents = getAgents();
    const agent = agents.find(a => a.code === code && a.password === password);

    if (agent) {
        setCurrentAgent(agent.code);
        showApp();
        showNotification('登录成功！', 'success');
    } else {
        showNotification('Agent Code 或密码错误', 'error');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const code = document.getElementById('registerCode').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    if (password !== confirmPassword) {
        showNotification('密码不匹配', 'error');
        return;
    }

    const agents = getAgents();
    if (agents.find(a => a.code === code)) {
        showNotification('Agent Code 已存在', 'error');
        return;
    }

    agents.push({ name, code, password });
    saveAgents(agents);
    setCurrentAgent(code);
    showApp();
    showNotification('注册成功！', 'success');
}

function handleForgotPassword(e) {
    e.preventDefault();
    const code = document.getElementById('forgotCode').value;
    const newPassword = document.getElementById('forgotNewPassword').value;
    const confirmPassword = document.getElementById('forgotConfirmPassword').value;

    // 验证新密码
    if (newPassword.length < 4) {
        showNotification('新密码长度至少为4位', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification('新密码不匹配', 'error');
        return;
    }

    const agents = getAgents();
    const agentIndex = agents.findIndex(a => a.code === code);

    if (agentIndex === -1) {
        showNotification('Agent Code 不存在', 'error');
        return;
    }

    // 更新密码
    agents[agentIndex].password = newPassword;
    saveAgents(agents);
    switchAuthForm('login');
    showNotification('密码已更新，请使用新密码登录', 'success');
}

function handleLogout() {
    clearCurrentAgent();
    showAuth();
    showNotification('已登出', 'info');
}

function showAuth() {
    document.getElementById('auth-screen').classList.add('active');
    document.getElementById('app-screen').classList.remove('active');
}

function showApp() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');
    
    // 确保首页直接显示，无动画
    const homepage = document.getElementById('homepage');
    const allPages = document.querySelectorAll('.page');
    allPages.forEach(page => {
        page.classList.remove('active', 'entering', 'leaving');
    });
    
    if (homepage) {
        homepage.classList.add('active');
        homepage.style.opacity = '1';
        homepage.style.transform = 'none';
    }
    
    loadCurrentAgent();
    loadAllData();
}

function loadCurrentAgent() {
    const currentAgentCode = getCurrentAgent();
    if (currentAgentCode) {
        const agents = getAgents();
        const agent = agents.find(a => a.code === currentAgentCode);
        if (agent) {
            document.getElementById('currentAgentName').textContent = agent.name;
            showApp();
        } else {
            showAuth();
        }
    } else {
        showAuth();
    }
}

// Data Storage Functions
function getAgents() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.AGENTS) || '[]');
}

function saveAgents(agents) {
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
}

function getCurrentAgent() {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_AGENT);
}

function setCurrentAgent(code) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_AGENT, code);
}

function clearCurrentAgent() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_AGENT);
}

function getAgentData(key) {
    const agentCode = getCurrentAgent();
    if (!agentCode) return [];
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    return data[agentCode] || [];
}

function saveAgentData(key, data) {
    const agentCode = getCurrentAgent();
    if (!agentCode) return;
    const allData = JSON.parse(localStorage.getItem(key) || '{}');
    allData[agentCode] = data;
    localStorage.setItem(key, JSON.stringify(allData));
    
    // Auto sync to cloud if enabled
    if (isAutoSyncEnabled()) {
        syncToCloud(key, data, agentCode);
    }
    
    // Auto backup if enabled
    if (isAutoBackupEnabled()) {
        scheduleBackup();
    }
}

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-card').forEach(card => {
        card.addEventListener('click', () => {
            const page = card.getAttribute('data-page');
            showPage(page);
        });
    });

    // Home button (click logo)
    document.querySelector('.nav-brand').addEventListener('click', () => {
        showPage('homepage');
    });
    
    // Back to home button
    const backBtn = document.getElementById('backToHomeBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showPage('homepage');
        });
    }
}

function showPage(pageId) {
    const currentPage = document.querySelector('.page.active');
    const targetPage = document.getElementById(pageId);
    const backBtnContainer = document.querySelector('.back-to-home-container');
    
    // 显示/隐藏返回按钮容器
    if (pageId === 'homepage') {
        if (backBtnContainer) backBtnContainer.style.display = 'none';
    } else {
        if (backBtnContainer) backBtnContainer.style.display = 'block';
    }
    
    // 如果是首页，直接显示，无动画
    if (pageId === 'homepage') {
        if (currentPage) {
            currentPage.classList.remove('active', 'entering', 'leaving');
        }
        targetPage.classList.remove('entering', 'leaving');
        targetPage.classList.add('active');
        targetPage.style.opacity = '1';
        targetPage.style.transform = 'none';
        return;
    }
    
    // 页面切换时加载相应数据
    const loadPageData = () => {
        switch(pageId) {
            case 'goals':
                loadGoals();
                updateCalendar();
                break;
            case 'customers':
                loadCustomers();
                loadFamilyTree();
                loadKIV();
                loadMonthly();
                loadReferrals();
                break;
            case 'visits':
                loadVisits();
                break;
            case 'reminders':
                updateReminders();
                break;
            case 'tools':
                setupTools();
                break;
            case 'quadrant':
                setupQuadrant();
                break;
        }
    };
    
    if (currentPage && currentPage !== targetPage) {
        // 添加离开动画
        currentPage.classList.add('leaving');
        currentPage.classList.remove('active');
        
        // 等待离开动画完成后再切换
        setTimeout(() => {
            currentPage.classList.remove('leaving');
            // 显示新页面
            targetPage.classList.add('entering');
            targetPage.classList.add('active');
            
            // 加载页面数据
            loadPageData();
            
            // 动画完成后移除entering类
            setTimeout(() => {
                targetPage.classList.remove('entering');
            }, 400);
        }, 300);
    } else if (!currentPage) {
        // 首次加载，直接显示
        targetPage.classList.add('entering');
        targetPage.classList.add('active');
        // 加载页面数据
        loadPageData();
        setTimeout(() => {
            targetPage.classList.remove('entering');
        }, 400);
    } else {
        // 如果已经是当前页面，也重新加载数据
        loadPageData();
    }
}

// Modals
function setupModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Forms Setup
function setupForms() {
    // Goals
    document.getElementById('addGoalBtn').addEventListener('click', () => {
        openGoalModal();
    });
    document.getElementById('goalForm').addEventListener('submit', handleGoalSubmit);
    document.getElementById('deleteGoalBtn').addEventListener('click', handleGoalDelete);
    document.querySelectorAll('input[name="goalType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const customInput = document.getElementById('customGoalTitle');
            customInput.style.display = e.target.value === 'custom' ? 'block' : 'none';
            customInput.required = e.target.value === 'custom';
        });
    });

    // Customers
    document.getElementById('addExistingCustomerBtn').addEventListener('click', () => {
        openCustomerModal();
    });
    document.getElementById('customerForm').addEventListener('submit', handleCustomerSubmit);
    document.getElementById('deleteCustomerBtn').addEventListener('click', handleCustomerDelete);
    document.getElementById('proposerName').addEventListener('input', checkProposerDifference);
    document.getElementById('idNumber').addEventListener('blur', checkDuplicateCustomer);

    // Family
    document.getElementById('addFamilyMemberBtn').addEventListener('click', () => {
        openFamilyModal();
    });
    document.getElementById('familyForm').addEventListener('submit', handleFamilySubmit);
    document.getElementById('deleteFamilyBtn').addEventListener('click', handleFamilyDelete);
    document.getElementById('existingCustomerSelect').addEventListener('change', handleExistingCustomerSelect);

    // KIV
    document.getElementById('addKIVBtn').addEventListener('click', () => {
        openKIVModal();
    });
    document.getElementById('kivForm').addEventListener('submit', handleKIVSubmit);
    document.getElementById('deleteKIVBtn').addEventListener('click', handleKIVDelete);

    // Monthly
    document.getElementById('addMonthlyBtn').addEventListener('click', () => {
        openMonthlyModal();
    });
    document.getElementById('monthlyForm').addEventListener('submit', handleMonthlySubmit);
    document.getElementById('deleteMonthlyBtn').addEventListener('click', handleMonthlyDelete);

    // 3访汇报
    document.getElementById('addVisitBtn').addEventListener('click', () => {
        openVisitModal();
    });
    document.getElementById('visitForm').addEventListener('submit', handleVisitSubmit);
    document.getElementById('deleteVisitBtn').addEventListener('click', handleVisitDelete);
    document.getElementById('searchVisits').addEventListener('input', (e) => {
        loadVisits(e.target.value);
    });
    document.getElementById('selectAllVisitsBtn').addEventListener('click', selectAllVisits);
    document.getElementById('combineVisitsBtn').addEventListener('click', combineSelectedVisits);
    document.getElementById('copyCombinedVisitsBtn').addEventListener('click', copyCombinedVisits);
    document.getElementById('transferToReferralBtn').addEventListener('click', transferVisitToReferral);
    document.getElementById('visitReferral').addEventListener('change', (e) => {
        const transferContainer = document.getElementById('transferToReferralContainer');
        if (e.target.value === 'Yes') {
            transferContainer.style.display = 'block';
        } else {
            transferContainer.style.display = 'none';
        }
    });

    // Referral Listing
    document.getElementById('addReferralBtn').addEventListener('click', () => {
        openReferralModal();
    });
    document.getElementById('referralForm').addEventListener('submit', handleReferralSubmit);
    document.getElementById('deleteReferralBtn').addEventListener('click', handleReferralDelete);
    document.getElementById('searchReferral').addEventListener('input', (e) => {
        loadReferrals(e.target.value);
    });

    // Customer Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchTab(tab);
        });
    });

    // Search functionality
    document.getElementById('searchExisting').addEventListener('input', (e) => {
        // Clear coverage gap search when using text search
        document.getElementById('coverageGapType').value = '';
        document.getElementById('coverageGapAmount').value = '';
        document.getElementById('clearCoverageGapBtn').style.display = 'none';
        loadCustomers(e.target.value);
    });
    
    // Coverage Gap Search
    document.getElementById('searchCoverageGapBtn').addEventListener('click', () => {
        const coverageType = document.getElementById('coverageGapType').value;
        const amount = parseFloat(document.getElementById('coverageGapAmount').value);
        
        if (!coverageType) {
            showNotification('请选择保障类型', 'warning');
            return;
        }
        
        if (!amount || amount <= 0) {
            showNotification('请输入有效的金额', 'warning');
            return;
        }
        
        // Clear text search
        document.getElementById('searchExisting').value = '';
        
        // Show clear button
        document.getElementById('clearCoverageGapBtn').style.display = 'inline-block';
        
        // Load customers with coverage gap filter
        loadCustomers('', coverageType, amount);
    });
    
    // Clear Coverage Gap Search
    document.getElementById('clearCoverageGapBtn').addEventListener('click', () => {
        document.getElementById('coverageGapType').value = '';
        document.getElementById('coverageGapAmount').value = '';
        document.getElementById('clearCoverageGapBtn').style.display = 'none';
        loadCustomers();
    });
    document.getElementById('searchFamily').addEventListener('input', (e) => {
        loadFamilyTree(e.target.value);
    });
    document.getElementById('searchKIV').addEventListener('input', (e) => {
        loadKIV(e.target.value);
    });
    document.getElementById('searchMonthly').addEventListener('input', (e) => {
        loadMonthly(e.target.value);
    });

    // Calendar Events
    document.getElementById('addCalendarEventBtn').addEventListener('click', () => {
        const dateStr = document.getElementById('addCalendarEventBtn').getAttribute('data-date');
        if (dateStr) {
            openCalendarEventForm(null, dateStr);
        }
    });
    document.getElementById('calendarEventForm').addEventListener('submit', handleCalendarEventSubmit);
    document.getElementById('deleteCalendarEventBtn').addEventListener('click', handleCalendarEventDelete);
}

// Goals Management
function openGoalModal(goalId = null) {
    const modal = document.getElementById('goalModal');
    const form = document.getElementById('goalForm');
    const deleteBtn = document.getElementById('deleteGoalBtn');
    const title = document.getElementById('goalModalTitle');

    form.reset();
    document.getElementById('customGoalTitle').style.display = 'none';
    document.getElementById('goalColor').value = '#4A90E2';

    if (goalId) {
        const goals = getAgentData(STORAGE_KEYS.GOALS);
        const goal = goals.find(g => g.id === goalId);
        if (goal) {
            title.textContent = '编辑目标';
            deleteBtn.style.display = 'block';
            document.getElementById('goalId').value = goal.id;
            document.querySelector(`input[name="goalType"][value="${goal.type}"]`).checked = true;
            if (goal.type === 'custom') {
                document.getElementById('customGoalTitle').style.display = 'block';
                document.getElementById('customGoalTitle').value = goal.title;
            }
            document.getElementById('goalAmount').value = goal.amount;
            document.getElementById('currentPerformance').value = goal.current;
            document.getElementById('goalDueDate').value = goal.dueDate;
            document.getElementById('goalColor').value = goal.color || '#4A90E2';
        }
    } else {
        title.textContent = '添加目标';
        deleteBtn.style.display = 'none';
    }

    openModal('goalModal');
}

function handleGoalSubmit(e) {
    e.preventDefault();
    const goals = getAgentData(STORAGE_KEYS.GOALS);
    const goalId = document.getElementById('goalId').value;
    const goalType = document.querySelector('input[name="goalType"]:checked').value;
    const customTitle = document.getElementById('customGoalTitle').value;
    const amount = parseFloat(document.getElementById('goalAmount').value);
    const current = parseFloat(document.getElementById('currentPerformance').value);
    const dueDate = document.getElementById('goalDueDate').value;
    const color = document.getElementById('goalColor').value;

    let title;
    switch (goalType) {
        case 'supremacy':
            title = 'Supremacy';
            break;
        case 'mdrt':
            title = 'MDRT';
            break;
        case 'gspc':
            title = 'GSPC';
            break;
        default:
            title = customTitle;
    }

    const goal = {
        id: goalId || Date.now().toString(),
        type: goalType,
        title,
        amount,
        current,
        dueDate,
        color,
        createdAt: goalId ? goals.find(g => g.id === goalId)?.createdAt || new Date().toISOString() : new Date().toISOString()
    };

    if (goalId) {
        const index = goals.findIndex(g => g.id === goalId);
        goals[index] = goal;
    } else {
        goals.push(goal);
    }

    saveAgentData(STORAGE_KEYS.GOALS, goals);
    loadGoals();
    closeModal('goalModal');
    showNotification('目标已保存', 'success');
    updateReminders();
}

function handleGoalDelete() {
    const goalId = document.getElementById('goalId').value;
    const goals = getAgentData(STORAGE_KEYS.GOALS);
    const filtered = goals.filter(g => g.id !== goalId);
    saveAgentData(STORAGE_KEYS.GOALS, filtered);
    loadGoals();
    closeModal('goalModal');
    showNotification('目标已删除', 'info');
    updateReminders();
}

function loadGoals() {
    const goals = getAgentData(STORAGE_KEYS.GOALS);
    const container = document.getElementById('goalsList');
    const banner = document.getElementById('goalCompletionBanner');
    container.innerHTML = '';

    // Check for completed goals and find the next closest goal
    const completedGoals = [];
    const incompleteGoals = [];

    goals.forEach(goal => {
        const progress = (goal.current / goal.amount) * 100;
        if (progress >= 100) {
            completedGoals.push(goal);
        } else {
            incompleteGoals.push({
                goal: goal,
                progress: progress,
                remaining: goal.amount - goal.current
            });
        }
    });

    // Show completion banner if there are completed goals
    if (completedGoals.length > 0) {
        // Find the most recent completed goal (highest current amount or most recent completion)
        const mostRecentCompleted = completedGoals.reduce((prev, current) => {
            return (current.current > prev.current) ? current : prev;
        });

        // Find the next closest goal (highest progress among incomplete goals)
        let nextGoal = null;
        if (incompleteGoals.length > 0) {
            // Sort by progress (highest first)
            incompleteGoals.sort((a, b) => b.progress - a.progress);
            nextGoal = incompleteGoals[0].goal;
        }

        // Build banner message
        let bannerHTML = `
            <div class="completion-message">
                <div class="completion-icon">
                    <i class="fas fa-trophy"></i>
                </div>
                <div class="completion-text">
                    <h3>恭喜你已经完成 <strong>${mostRecentCompleted.title}</strong>！</h3>
        `;

        if (nextGoal) {
            const nextProgress = Math.round((nextGoal.current / nextGoal.amount) * 100);
            const nextRemaining = nextGoal.amount - nextGoal.current;
            bannerHTML += `
                    <p>接下去就是要追 <strong>${nextGoal.title}</strong> 啦！</p>
                    <div class="next-goal-info">
                        <span>目前进度: ${nextProgress}%</span>
                        <span>还需: RM ${nextRemaining.toLocaleString()}</span>
                    </div>
            `;
        } else {
            bannerHTML += `
                    <p>太棒了！你已经完成了所有目标！🎉</p>
            `;
        }

        bannerHTML += `
                </div>
            </div>
        `;

        banner.innerHTML = bannerHTML;
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }

    // Display all goals
    goals.forEach(goal => {
        const distance = goal.amount - goal.current;
        const progress = Math.min((goal.current / goal.amount) * 100, 100);
        const dueDate = new Date(goal.dueDate);
        const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
        const isCompleted = progress >= 100;

        const card = document.createElement('div');
        card.className = 'goal-card';
        if (isCompleted) {
            card.classList.add('goal-completed');
        }
        card.style.borderLeftColor = goal.color;

        let titleHTML = '';
        if (goal.type === 'supremacy') {
            titleHTML = '<img src="images/Supremacy.png" alt="Supremacy" style="max-width: 40px; max-height: 40px; object-fit: contain; display: inline-block; vertical-align: middle;" onerror="this.style.opacity=\'0.3\'; this.alt=\'图片加载失败\';" onload="this.style.opacity=\'1\';">';
        } else if (goal.type === 'mdrt') {
            titleHTML = '<img src="images/MDRT.png" alt="MDRT" style="max-width: 40px; max-height: 40px; object-fit: contain; display: inline-block; vertical-align: middle;" onerror="this.style.opacity=\'0.3\'; this.alt=\'图片加载失败\';" onload="this.style.opacity=\'1\';">';
        } else if (goal.type === 'gspc') {
            titleHTML = '<img src="images/GSPC.png" alt="GSPC" style="max-width: 40px; max-height: 40px; object-fit: contain; display: inline-block; vertical-align: middle;" onerror="this.style.opacity=\'0.3\'; this.alt=\'图片加载失败\';" onload="this.style.opacity=\'1\';">';
        }

        const completedBadge = isCompleted ? '<span class="goal-completed-badge"><i class="fas fa-check-circle"></i> 已完成</span>' : '';

        card.innerHTML = `
            <div class="goal-header">
                <div class="goal-title">
                    ${titleHTML}
                    <span>${goal.title}</span>
                    ${completedBadge}
                </div>
                <div class="goal-actions">
                    <button class="btn-icon" onclick="openGoalModal('${goal.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
            <div class="goal-stats">
                <div class="goal-stat">
                    <div class="goal-stat-label">目标数额</div>
                    <div class="goal-stat-value">RM ${goal.amount.toLocaleString()}</div>
                </div>
                <div class="goal-stat">
                    <div class="goal-stat-label">目前业绩</div>
                    <div class="goal-stat-value">RM ${goal.current.toLocaleString()}</div>
                </div>
                <div class="goal-stat">
                    <div class="goal-stat-label">距离目标</div>
                    <div class="goal-stat-value">${isCompleted ? '<span style="color: var(--success);">已完成！</span>' : 'RM ' + distance.toLocaleString()}</div>
                </div>
            </div>
            <div class="goal-progress">
                <div class="goal-progress-bar" style="width: ${progress}%; ${isCompleted ? 'background: var(--success);' : ''}"></div>
            </div>
            <div style="margin-top: 10px; font-size: 12px; color: #7f8c8d;">
                到期日期: ${dueDate.toLocaleDateString('zh-CN')} (${daysLeft > 0 ? daysLeft + ' 天后' : '已过期'})
            </div>
        `;

        container.appendChild(card);
    });

    updateCalendar();
}

// Calendar
function initializeCalendar() {
    updateCalendar();
}

function updateCalendar() {
    const calendar = document.getElementById('calendar');
    const year = currentCalendarYear;
    const month = currentCalendarMonth;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

    // Get all events
    const goals = getAgentData(STORAGE_KEYS.GOALS);
    const kiv = getAgentData(STORAGE_KEYS.KIV);
    const monthly = getAgentData(STORAGE_KEYS.MONTHLY);
    const calendarEvents = getAgentData(STORAGE_KEYS.CALENDAR_EVENTS);

    const events = {};
    goals.forEach(goal => {
        const date = goal.dueDate.split('T')[0];
        if (!events[date]) events[date] = [];
        events[date].push({ type: 'goal', color: goal.color || '#4A90E2', title: goal.title });
    });
    kiv.forEach(item => {
        const date = new Date(item.nextMeeting).toISOString().split('T')[0];
        if (!events[date]) events[date] = [];
        events[date].push({ type: 'kiv', color: '#F39C12', title: item.name });
    });
    monthly.forEach(item => {
        const date = new Date(item.appointment).toISOString().split('T')[0];
        if (!events[date]) events[date] = [];
        events[date].push({ type: 'monthly', color: '#27AE60', title: item.name });
    });
    calendarEvents.forEach(item => {
        const date = new Date(item.time).toISOString().split('T')[0];
        if (!events[date]) events[date] = [];
        events[date].push({ type: 'event', color: item.color || '#9B59B6', title: item.title });
    });

    let html = `
        <div class="calendar-header">
            <button class="calendar-nav-btn" onclick="changeMonth(-1)"><i class="fas fa-chevron-left"></i></button>
            <div class="calendar-month">${monthNames[month]} ${year}</div>
            <button class="calendar-nav-btn" onclick="changeMonth(1)"><i class="fas fa-chevron-right"></i></button>
        </div>
        <div class="calendar-grid">
    `;

    // Day headers
    dayNames.forEach(day => {
        html += `<div class="calendar-day-header">${day}</div>`;
    });

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
        html += '<div class="calendar-day"></div>';
    }

    // Days of the month
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        const isToday = dateStr === todayStr && year === today.getFullYear() && month === today.getMonth();
        const hasEvent = events[dateStr] && events[dateStr].length > 0;

        let dayClass = 'calendar-day';
        if (isToday) dayClass += ' today';
        if (hasEvent) dayClass += ' has-event';

        // All dates are clickable now
        const clickHandler = `onclick="showCalendarEvents('${dateStr}')"`;
        const cursorStyle = 'pointer';
        const titleAttr = hasEvent ? `title="点击查看行程"` : `title="点击添加或查看活动"`;
        
        html += `<div class="${dayClass}" style="background: ${hasEvent ? events[dateStr][0].color + '20' : ''}; cursor: ${cursorStyle};" ${clickHandler} ${titleAttr}>${day}</div>`;
    }

    html += '</div>';
    calendar.innerHTML = html;
}

let currentCalendarMonth = new Date().getMonth();
let currentCalendarYear = new Date().getFullYear();

function changeMonth(direction) {
    currentCalendarMonth += direction;
    if (currentCalendarMonth < 0) {
        currentCalendarMonth = 11;
        currentCalendarYear--;
    } else if (currentCalendarMonth > 11) {
        currentCalendarMonth = 0;
        currentCalendarYear++;
    }
    updateCalendar();
}

// Show calendar events for a specific date
function showCalendarEvents(dateStr) {
    const goals = getAgentData(STORAGE_KEYS.GOALS);
    const kiv = getAgentData(STORAGE_KEYS.KIV);
    const monthly = getAgentData(STORAGE_KEYS.MONTHLY);
    const calendarEvents = getAgentData(STORAGE_KEYS.CALENDAR_EVENTS);
    
    const selectedDate = new Date(dateStr);
    const dateFormatted = selectedDate.toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    });
    
    const modal = document.getElementById('calendarEventModal');
    const title = document.getElementById('calendarEventModalTitle');
    const list = document.getElementById('calendarEventList');
    const addBtn = document.getElementById('addCalendarEventBtn');
    
    title.textContent = dateFormatted + ' 的行程';
    
    // Store the selected date for adding events
    addBtn.setAttribute('data-date', dateStr);
    
    // Collect all events for this date
    const dayEvents = [];
    
    // Goals due on this date
    goals.forEach(goal => {
        const goalDate = goal.dueDate.split('T')[0];
        if (goalDate === dateStr) {
            const daysLeft = Math.ceil((selectedDate - new Date()) / (1000 * 60 * 60 * 24));
            dayEvents.push({
                type: 'goal',
                icon: 'fas fa-bullseye',
                color: goal.color || '#4A90E2',
                title: goal.title,
                subtitle: `目标到期`,
                details: `目标: RM ${parseFloat(goal.target).toLocaleString()} | 目前: RM ${parseFloat(goal.current).toLocaleString()} | 距离: RM ${(parseFloat(goal.target) - parseFloat(goal.current)).toLocaleString()}`,
                urgency: daysLeft <= 7 ? 'urgent' : daysLeft <= 30 ? 'warning' : 'normal',
                daysLeft: daysLeft,
                id: goal.id
            });
        }
    });
    
    // KIV meetings on this date
    kiv.forEach(item => {
        const kivDate = new Date(item.nextMeeting).toISOString().split('T')[0];
        if (kivDate === dateStr) {
            const daysUntil = Math.ceil((selectedDate - new Date()) / (1000 * 60 * 60 * 24));
            const lastMeeting = item.lastMeeting ? new Date(item.lastMeeting).toLocaleDateString('zh-CN') : '未记录';
            dayEvents.push({
                type: 'kiv',
                icon: 'fas fa-handshake',
                color: '#F39C12',
                title: item.name,
                subtitle: `KIV 见面`,
                details: `保单类型: ${item.policyType} | 保费: RM ${parseFloat(item.premium || 0).toLocaleString()} | 上次见面: ${lastMeeting}`,
                urgency: daysUntil <= 1 ? 'urgent' : daysUntil <= 3 ? 'warning' : 'normal',
                daysUntil: daysUntil,
                reason: item.reason || '未说明原因',
                id: item.id
            });
        }
    });
    
    // Monthly Cake appointments on this date
    monthly.forEach(item => {
        const monthlyDate = new Date(item.appointment).toISOString().split('T')[0];
        if (monthlyDate === dateStr) {
            const appointmentTime = new Date(item.appointment).toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            dayEvents.push({
                type: 'monthly',
                icon: 'fas fa-calendar-check',
                color: '#27AE60',
                title: item.name,
                subtitle: `Monthly Cake 预约`,
                details: `保单类型: ${item.policyType} | 保费: RM ${parseFloat(item.premium || 0).toLocaleString()} | 时间: ${appointmentTime}`,
                urgency: 'normal',
                outcome: item.outcome || '待完成',
                id: item.id
            });
        }
    });
    
    // Calendar events on this date
    calendarEvents.forEach(item => {
        const eventDate = new Date(item.time).toISOString().split('T')[0];
        if (eventDate === dateStr) {
            const eventTime = new Date(item.time).toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            dayEvents.push({
                type: 'event',
                icon: 'fas fa-calendar-alt',
                color: item.color || '#9B59B6',
                title: item.title,
                subtitle: `活动`,
                details: `时间: ${eventTime}${item.description ? ' | ' + item.description : ''}`,
                urgency: 'normal',
                description: item.description || '',
                id: item.id
            });
        }
    });
    
    // Sort events by urgency (urgent first, then warning, then normal)
    const urgencyOrder = { urgent: 0, warning: 1, normal: 2 };
    dayEvents.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
    
    // Display events
    if (dayEvents.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <i class="fas fa-calendar-times" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>这一天没有安排行程</p>
            </div>
        `;
    } else {
        list.innerHTML = dayEvents.map(event => {
            let urgencyBadge = '';
            if (event.urgency === 'urgent') {
                urgencyBadge = '<span class="event-urgency urgent">紧急</span>';
            } else if (event.urgency === 'warning') {
                urgencyBadge = '<span class="event-urgency warning">即将到期</span>';
            }
            
            let actionButton = '';
            if (event.type === 'kiv') {
                actionButton = `<button class="btn-event-action" onclick="openKIVModal('${event.id}'); closeModal('calendarEventModal');"><i class="fas fa-edit"></i> 查看详情</button>`;
            } else if (event.type === 'monthly') {
                actionButton = `<button class="btn-event-action" onclick="openMonthlyModal('${event.id}'); closeModal('calendarEventModal');"><i class="fas fa-edit"></i> 查看详情</button>`;
            } else if (event.type === 'goal') {
                actionButton = `<button class="btn-event-action" onclick="openGoalModal('${event.id}'); closeModal('calendarEventModal');"><i class="fas fa-edit"></i> 查看详情</button>`;
            } else if (event.type === 'event') {
                actionButton = `<button class="btn-event-action" onclick="openCalendarEventForm('${event.id}'); closeModal('calendarEventModal');"><i class="fas fa-edit"></i> 编辑</button>`;
            }
            
            let timeInfo = '';
            if (event.daysLeft !== undefined) {
                if (event.daysLeft < 0) {
                    timeInfo = `<div class="event-time urgent-text">已过期 ${Math.abs(event.daysLeft)} 天</div>`;
                } else if (event.daysLeft === 0) {
                    timeInfo = `<div class="event-time urgent-text">今天到期！</div>`;
                } else {
                    timeInfo = `<div class="event-time">还有 ${event.daysLeft} 天</div>`;
                }
            } else if (event.daysUntil !== undefined) {
                if (event.daysUntil < 0) {
                    timeInfo = `<div class="event-time urgent-text">已过期 ${Math.abs(event.daysUntil)} 天</div>`;
                } else if (event.daysUntil === 0) {
                    timeInfo = `<div class="event-time urgent-text">今天见面！</div>`;
                } else {
                    timeInfo = `<div class="event-time">还有 ${event.daysUntil} 天</div>`;
                }
            }
            
            return `
                <div class="calendar-event-item" style="border-left: 4px solid ${event.color};">
                    <div class="event-header">
                        <div class="event-icon" style="color: ${event.color};">
                            <i class="${event.icon}"></i>
                        </div>
                        <div class="event-info">
                            <div class="event-title-row">
                                <h3 class="event-title">${event.title}</h3>
                                ${urgencyBadge}
                            </div>
                            <div class="event-subtitle">${event.subtitle}</div>
                            ${timeInfo}
                        </div>
                    </div>
                    <div class="event-details">${event.details}</div>
                    ${event.reason ? `<div class="event-reason"><strong>原因:</strong> ${event.reason}</div>` : ''}
                    ${event.outcome ? `<div class="event-outcome"><strong>结果:</strong> ${event.outcome}</div>` : ''}
                    ${event.description ? `<div class="event-description"><strong>描述:</strong> ${event.description}</div>` : ''}
                    ${actionButton}
                </div>
            `;
        }).join('');
    }
    
    openModal('calendarEventModal');
}

// Calendar Event Management
function openCalendarEventForm(eventId = null, dateStr = null) {
    const modal = document.getElementById('calendarEventFormModal');
    const form = document.getElementById('calendarEventForm');
    const deleteBtn = document.getElementById('deleteCalendarEventBtn');
    const title = document.getElementById('calendarEventFormModalTitle');

    form.reset();
    document.getElementById('calendarEventColor').value = '#9B59B6';

    if (eventId) {
        const events = getAgentData(STORAGE_KEYS.CALENDAR_EVENTS);
        const event = events.find(e => e.id === eventId);
        if (event) {
            title.textContent = '编辑活动';
            deleteBtn.style.display = 'block';
            document.getElementById('calendarEventId').value = event.id;
            document.getElementById('calendarEventTitle').value = event.title;
            document.getElementById('calendarEventTime').value = new Date(event.time).toISOString().slice(0, 16);
            document.getElementById('calendarEventDescription').value = event.description || '';
            document.getElementById('calendarEventColor').value = event.color || '#9B59B6';
            document.getElementById('calendarEventDate').value = new Date(event.time).toISOString().split('T')[0];
        }
    } else {
        title.textContent = '添加活动';
        deleteBtn.style.display = 'none';
        document.getElementById('calendarEventId').value = '';
        if (dateStr) {
            // Set default time to 9:00 AM on the selected date
            const defaultDate = new Date(dateStr);
            defaultDate.setHours(9, 0, 0, 0);
            document.getElementById('calendarEventTime').value = defaultDate.toISOString().slice(0, 16);
            document.getElementById('calendarEventDate').value = dateStr;
        } else {
            // Set to current date/time
            const now = new Date();
            now.setMinutes(0, 0, 0);
            document.getElementById('calendarEventTime').value = now.toISOString().slice(0, 16);
            document.getElementById('calendarEventDate').value = now.toISOString().split('T')[0];
        }
    }

    openModal('calendarEventFormModal');
}

function handleCalendarEventSubmit(e) {
    e.preventDefault();
    const events = getAgentData(STORAGE_KEYS.CALENDAR_EVENTS);
    const eventId = document.getElementById('calendarEventId').value;

    const event = {
        id: eventId || Date.now().toString(),
        title: document.getElementById('calendarEventTitle').value,
        time: new Date(document.getElementById('calendarEventTime').value).toISOString(),
        description: document.getElementById('calendarEventDescription').value,
        color: document.getElementById('calendarEventColor').value,
        createdAt: eventId ? events.find(e => e.id === eventId)?.createdAt || new Date().toISOString() : new Date().toISOString()
    };

    if (eventId) {
        const index = events.findIndex(e => e.id === eventId);
        events[index] = event;
    } else {
        events.push(event);
    }

    saveAgentData(STORAGE_KEYS.CALENDAR_EVENTS, events);
    updateCalendar();
    closeModal('calendarEventFormModal');
    showNotification('活动已保存', 'success');
    
    // Refresh the calendar events modal if it's open
    const calendarModal = document.getElementById('calendarEventModal');
    if (calendarModal.classList.contains('active')) {
        const dateStr = document.getElementById('calendarEventDate').value || new Date(event.time).toISOString().split('T')[0];
        showCalendarEvents(dateStr);
    }
}

function handleCalendarEventDelete() {
    const eventId = document.getElementById('calendarEventId').value;
    if (!eventId) return;

    if (!confirm('确定要删除这个活动吗？')) return;

    const events = getAgentData(STORAGE_KEYS.CALENDAR_EVENTS);
    const filtered = events.filter(e => e.id !== eventId);
    saveAgentData(STORAGE_KEYS.CALENDAR_EVENTS, filtered);
    updateCalendar();
    closeModal('calendarEventFormModal');
    showNotification('活动已删除', 'info');
    
    // Refresh the calendar events modal if it's open
    const calendarModal = document.getElementById('calendarEventModal');
    if (calendarModal.classList.contains('active')) {
        const deletedEvent = events.find(e => e.id === eventId);
        if (deletedEvent) {
            const dateStr = new Date(deletedEvent.time).toISOString().split('T')[0];
            showCalendarEvents(dateStr);
        }
    }
}

// Customer Management
function openAddPolicyModal(customerId) {
    // 获取现有客户信息
    const customers = getAgentData(STORAGE_KEYS.CUSTOMERS);
    const existingCustomer = customers.find(c => c.id === customerId);
    
    if (!existingCustomer) {
        showNotification('客户信息未找到', 'error');
        return;
    }
    
    // 打开客户表单，预填充信息
    const modal = document.getElementById('customerModal');
    const form = document.getElementById('customerForm');
    const deleteBtn = document.getElementById('deleteCustomerBtn');
    const title = document.getElementById('customerModalTitle');
    const relatedPolicies = document.getElementById('relatedPolicies');

    form.reset();
    relatedPolicies.style.display = 'none';
    
    // 设置标题为"加保"
    title.textContent = '加保 - ' + existingCustomer.lifeAssuredName;
    deleteBtn.style.display = 'none';
    
    // 预填充客户基本信息
    document.getElementById('customerId').value = ''; // 新记录，不设置ID
    document.getElementById('lifeAssuredName').value = existingCustomer.lifeAssuredName;
    document.getElementById('proposerName').value = existingCustomer.proposerName;
    if (existingCustomer.relationship) {
        document.getElementById('relationshipGroup').style.display = 'block';
        document.getElementById('relationship').value = existingCustomer.relationship;
    } else {
        document.getElementById('relationshipGroup').style.display = 'none';
    }
    document.getElementById('idNumber').value = existingCustomer.idNumber;
    document.getElementById('age').value = existingCustomer.age;
    document.getElementById('contact').value = existingCustomer.contact;
    
    // 清空保单相关信息，让用户填写新保单
    document.getElementById('policyType').value = '';
    document.getElementById('policyNumber').value = '';
    document.getElementById('paymentMethod').value = 'Credit Card';
    document.getElementById('premiumAmount').value = '';
    document.getElementById('effectiveDate').value = '';
    document.getElementById('beneficiary').value = 'Yes';
    document.getElementById('coverageLife').value = '0';
    document.getElementById('coverageIllness').value = '0';
    document.getElementById('coverageAccident').value = '0';
    document.getElementById('coverageMedical').value = '0';
    document.getElementById('coverageHospital').value = '0';
    document.getElementById('coverageWaive').value = '0';
    
    // 禁用客户基本信息字段（因为是从现有客户加保）
    document.getElementById('lifeAssuredName').readOnly = true;
    document.getElementById('proposerName').readOnly = true;
    document.getElementById('idNumber').readOnly = true;
    document.getElementById('age').readOnly = true;
    document.getElementById('contact').readOnly = true;
    if (document.getElementById('relationship')) {
        document.getElementById('relationship').readOnly = true;
    }
    
    openModal('customerModal');
}

function openCustomerModal(customerId = null) {
    const modal = document.getElementById('customerModal');
    const form = document.getElementById('customerForm');
    const deleteBtn = document.getElementById('deleteCustomerBtn');
    const title = document.getElementById('customerModalTitle');
    const relatedPolicies = document.getElementById('relatedPolicies');

    form.reset();
    relatedPolicies.style.display = 'none';
    document.getElementById('relationshipGroup').style.display = 'none';
    
    // 恢复所有字段为可编辑
    document.getElementById('lifeAssuredName').readOnly = false;
    document.getElementById('proposerName').readOnly = false;
    document.getElementById('idNumber').readOnly = false;
    document.getElementById('age').readOnly = false;
    document.getElementById('contact').readOnly = false;
    if (document.getElementById('relationship')) {
        document.getElementById('relationship').readOnly = false;
    }

    if (customerId) {
        const customers = getAgentData(STORAGE_KEYS.CUSTOMERS);
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            title.textContent = '编辑客户';
            deleteBtn.style.display = 'block';
            document.getElementById('customerId').value = customer.id;
            document.getElementById('lifeAssuredName').value = customer.lifeAssuredName;
            document.getElementById('proposerName').value = customer.proposerName;
            if (customer.relationship) {
                document.getElementById('relationshipGroup').style.display = 'block';
                document.getElementById('relationship').value = customer.relationship;
            }
            document.getElementById('idNumber').value = customer.idNumber;
            document.getElementById('age').value = customer.age;
            document.getElementById('contact').value = customer.contact;
            document.getElementById('policyType').value = customer.policyType;
            document.getElementById('policyNumber').value = customer.policyNumber;
            document.getElementById('paymentMethod').value = customer.paymentMethod;
            document.getElementById('premiumAmount').value = customer.premiumAmount;
            document.getElementById('effectiveDate').value = customer.effectiveDate;
            document.getElementById('beneficiary').value = customer.beneficiary;
            document.getElementById('coverageLife').value = customer.coverage?.life || 0;
            document.getElementById('coverageIllness').value = customer.coverage?.illness || 0;
            document.getElementById('coverageAccident').value = customer.coverage?.accident || 0;
            document.getElementById('coverageMedical').value = customer.coverage?.medical || 0;
            document.getElementById('coverageHospital').value = customer.coverage?.hospital || 0;
            document.getElementById('coverageWaive').value = customer.coverage?.waive || 0;
        }
    } else {
        title.textContent = '添加客户';
        deleteBtn.style.display = 'none';
    }

    openModal('customerModal');
}

function checkProposerDifference() {
    const lifeAssured = document.getElementById('lifeAssuredName').value;
    const proposer = document.getElementById('proposerName').value;
    const relationshipGroup = document.getElementById('relationshipGroup');

    if (lifeAssured && proposer && lifeAssured !== proposer) {
        relationshipGroup.style.display = 'block';
        document.getElementById('relationship').required = true;
    } else {
        relationshipGroup.style.display = 'none';
        document.getElementById('relationship').required = false;
    }
}

function checkDuplicateCustomer() {
    const idNumber = document.getElementById('idNumber').value;
    if (!idNumber) return;

    const customers = getAgentData(STORAGE_KEYS.CUSTOMERS);
    const related = customers.filter(c => c.idNumber === idNumber);
    
    if (related.length > 0) {
        const relatedPolicies = document.getElementById('relatedPolicies');
        const list = document.getElementById('relatedPoliciesList');
        relatedPolicies.style.display = 'block';
        
        list.innerHTML = related.map(c => `
            <div class="customer-card" style="margin-bottom: 10px;">
                <div class="customer-name">${c.lifeAssuredName}</div>
                <div class="customer-id">保单: ${c.policyNumber} | ${c.policyType}</div>
                <div style="margin-top: 10px;">
                    <button class="btn-icon" onclick="openCustomerModal('${c.id}')">
                        <i class="fas fa-edit"></i> 查看
                    </button>
                </div>
            </div>
        `).join('');
    }
}

function handleCustomerSubmit(e) {
    e.preventDefault();
    const customers = getAgentData(STORAGE_KEYS.CUSTOMERS);
    const customerId = document.getElementById('customerId').value;

    const customer = {
        id: customerId || Date.now().toString(),
        lifeAssuredName: document.getElementById('lifeAssuredName').value,
        proposerName: document.getElementById('proposerName').value,
        relationship: document.getElementById('relationship').value || null,
        idNumber: document.getElementById('idNumber').value,
        age: parseInt(document.getElementById('age').value),
        contact: document.getElementById('contact').value,
        policyType: document.getElementById('policyType').value,
        policyNumber: document.getElementById('policyNumber').value,
        paymentMethod: document.getElementById('paymentMethod').value,
        premiumAmount: parseFloat(document.getElementById('premiumAmount').value),
        effectiveDate: document.getElementById('effectiveDate').value,
        beneficiary: document.getElementById('beneficiary').value,
        coverage: {
            life: parseFloat(document.getElementById('coverageLife').value) || 0,
            illness: parseFloat(document.getElementById('coverageIllness').value) || 0,
            accident: parseFloat(document.getElementById('coverageAccident').value) || 0,
            medical: parseFloat(document.getElementById('coverageMedical').value) || 0,
            hospital: parseFloat(document.getElementById('coverageHospital').value) || 0,
            waive: parseFloat(document.getElementById('coverageWaive').value) || 0
        },
        createdAt: customerId ? customers.find(c => c.id === customerId)?.createdAt || new Date().toISOString() : new Date().toISOString()
    };

    if (customerId) {
        const index = customers.findIndex(c => c.id === customerId);
        customers[index] = customer;
    } else {
        customers.push(customer);
    }

    saveAgentData(STORAGE_KEYS.CUSTOMERS, customers);
    loadCustomers();
    closeModal('customerModal');
    showNotification('客户已保存', 'success');
    updateReminders();
}

function handleCustomerDelete() {
    const customerId = document.getElementById('customerId').value;
    const customers = getAgentData(STORAGE_KEYS.CUSTOMERS);
    const filtered = customers.filter(c => c.id !== customerId);
    saveAgentData(STORAGE_KEYS.CUSTOMERS, filtered);
    loadCustomers();
    closeModal('customerModal');
    showNotification('客户已删除', 'info');
    updateReminders();
}

function loadCustomers(searchTerm = '', coverageGapType = '', coverageGapAmount = 0) {
    const customers = getAgentData(STORAGE_KEYS.CUSTOMERS);
    const container = document.getElementById('existingCustomersList');
    container.innerHTML = '';

    let filteredCustomers = customers;

    // Filter by text search term
    if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filteredCustomers = filteredCustomers.filter(customer => {
            return (
                customer.lifeAssuredName.toLowerCase().includes(search) ||
                customer.proposerName.toLowerCase().includes(search) ||
                customer.idNumber.toLowerCase().includes(search) ||
                customer.policyNumber.toLowerCase().includes(search) ||
                customer.policyType.toLowerCase().includes(search) ||
                customer.contact.toLowerCase().includes(search)
            );
        });
    }

    // Filter by coverage gap (based on customer's total coverage across all policies)
    if (coverageGapType && coverageGapAmount > 0) {
        // Group customers by idNumber to calculate total coverage
        const customerGroups = {};
        filteredCustomers.forEach(customer => {
            const idNumber = customer.idNumber;
            if (!idNumber) {
                // If no idNumber, treat as individual customer
                const coverageValue = customer.coverage?.[coverageGapType] || 0;
                if (coverageValue < coverageGapAmount) {
                    if (!customerGroups[customer.id]) {
                        customerGroups[customer.id] = [customer];
                    }
                }
            } else {
                // Group by idNumber
                if (!customerGroups[idNumber]) {
                    customerGroups[idNumber] = [];
                }
                customerGroups[idNumber].push(customer);
            }
        });
        
        // Calculate total coverage for each customer group
        const customersWithGap = [];
        Object.keys(customerGroups).forEach(key => {
            const group = customerGroups[key];
            if (group.length === 0) return;
            
            // Calculate total coverage for this customer (sum of all policies)
            const totalCoverage = group.reduce((sum, customer) => {
                return sum + (customer.coverage?.[coverageGapType] || 0);
            }, 0);
            
            // If total coverage is less than threshold, include all policies of this customer
            if (totalCoverage < coverageGapAmount) {
                customersWithGap.push(...group);
            }
        });
        
        filteredCustomers = customersWithGap;
    }

    if (filteredCustomers.length === 0) {
        let message = '未找到匹配的客户';
        if (coverageGapType && coverageGapAmount > 0) {
            const coverageTypeNames = {
                'life': '人寿',
                'illness': '疾病',
                'accident': '意外',
                'medical': '医疗',
                'hospital': '住院',
                'waive': 'Waive'
            };
            message = `未找到${coverageTypeNames[coverageGapType]}保障少于 RM ${coverageGapAmount.toLocaleString()} 的客户`;
        } else if (searchTerm) {
            message = '未找到匹配的客户';
        }
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: #7f8c8d;">${message}</div>`;
        return;
    }

    // Calculate total coverage for each customer (if they have multiple policies)
    const customerTotalCoverage = {};
    if (coverageGapType && coverageGapAmount > 0) {
        filteredCustomers.forEach(customer => {
            const idNumber = customer.idNumber || customer.id;
            if (!customerTotalCoverage[idNumber]) {
                customerTotalCoverage[idNumber] = {
                    total: {},
                    policies: []
                };
            }
            customerTotalCoverage[idNumber].policies.push(customer);
            // Sum up coverage
            Object.keys(customer.coverage || {}).forEach(type => {
                if (!customerTotalCoverage[idNumber].total[type]) {
                    customerTotalCoverage[idNumber].total[type] = 0;
                }
                customerTotalCoverage[idNumber].total[type] += (customer.coverage[type] || 0);
            });
        });
    }

    filteredCustomers.forEach(customer => {
        // Parse date string to avoid timezone issues
        const dateStr = customer.effectiveDate;
        let effectiveDate;
        if (dateStr.includes('T')) {
            effectiveDate = new Date(dateStr);
        } else {
            // For date-only strings (YYYY-MM-DD), parse as local date
            const [year, month, day] = dateStr.split('-').map(Number);
            effectiveDate = new Date(year, month - 1, day);
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        effectiveDate.setHours(0, 0, 0, 0);
        
        const daysSince = Math.floor((today - effectiveDate) / (1000 * 60 * 60 * 24));
        
        // Format time difference display - simple days only
        let timeDisplay = '';
        if (daysSince < 0) {
            // Future date
            const daysUntil = Math.abs(daysSince);
            timeDisplay = `${daysUntil}天后生效`;
        } else if (daysSince === 0) {
            timeDisplay = '今天生效';
        } else {
            timeDisplay = `${daysSince}天前生效`;
        }
        
        // Get customer's total coverage if available
        const idNumber = customer.idNumber || customer.id;
        const totalCoverage = customerTotalCoverage[idNumber]?.total || customer.coverage || {};
        
        // Check if customer has multiple policies
        const hasMultiplePolicies = customerTotalCoverage[idNumber]?.policies?.length > 1;
        const policyCount = hasMultiplePolicies ? customerTotalCoverage[idNumber].policies.length : 0;

        const card = document.createElement('div');
        card.className = 'customer-card';
        card.innerHTML = `
            <div class="customer-header">
                <div class="customer-name">${customer.lifeAssuredName}${hasMultiplePolicies ? ` <span style="font-size: 12px; color: var(--primary-blue); font-weight: normal;">(${policyCount}个保单)</span>` : ''}</div>
                <div class="customer-id">${customer.idNumber}</div>
                ${customer.proposerName !== customer.lifeAssuredName ? `<div style="font-size: 11px; color: #7f8c8d; margin-top: 3px;">Proposer: ${customer.proposerName}${customer.relationship ? ` (${customer.relationship})` : ''}</div>` : ''}
            </div>
            <div class="customer-info">
                <div class="customer-info-item">
                    <span style="font-size: 13px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; white-space: nowrap;">保单:</span>
                    <span style="font-size: 15px; font-weight: 500; color: var(--dark-grey);">${customer.policyNumber}</span>
                </div>
                <div class="customer-info-item">
                    <span style="font-size: 13px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; white-space: nowrap;">类型:</span>
                    <span style="font-size: 15px; font-weight: 500; color: var(--dark-grey);">${customer.policyType}</span>
                </div>
                <div class="customer-info-item">
                    <span style="font-size: 13px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; white-space: nowrap;">保费:</span>
                    <span style="font-size: 15px; font-weight: 500; color: var(--dark-grey);">RM ${customer.premiumAmount.toLocaleString()}</span>
                </div>
                <div class="customer-info-item">
                    <span style="font-size: 13px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; white-space: nowrap;">生效:</span>
                    <span style="font-size: 15px; font-weight: 500; color: var(--dark-grey);">${effectiveDate.toLocaleDateString('zh-CN')} <span style="font-size: 13px; color: var(--primary-blue); font-weight: 600;">(${timeDisplay})</span></span>
                </div>
                ${hasMultiplePolicies ? `<div class="customer-info-item" style="grid-column: 1 / -1; background: rgba(74, 144, 226, 0.1); border-color: rgba(74, 144, 226, 0.2);"><span style="font-size: 13px; color: var(--primary-blue); text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; white-space: nowrap;">综合保障:</span><span style="font-size: 15px; font-weight: 600; color: var(--primary-blue);">此客户共有 ${policyCount} 个保单</span></div>` : ''}
            </div>
            <div class="coverage-summary">
                <div class="coverage-item-small">
                    <div class="coverage-item-small-label">人寿</div>
                    <div class="coverage-item-small-value">
                        RM ${(hasMultiplePolicies ? totalCoverage.life : (customer.coverage?.life || 0)).toLocaleString()}
                        ${hasMultiplePolicies && customer.coverage?.life ? ` <span style="font-size: 10px; color: #7f8c8d;">(本保单: ${(customer.coverage.life || 0).toLocaleString()})</span>` : ''}
                    </div>
                </div>
                <div class="coverage-item-small">
                    <div class="coverage-item-small-label">疾病</div>
                    <div class="coverage-item-small-value">
                        RM ${(hasMultiplePolicies ? totalCoverage.illness : (customer.coverage?.illness || 0)).toLocaleString()}
                        ${hasMultiplePolicies && customer.coverage?.illness ? ` <span style="font-size: 10px; color: #7f8c8d;">(本保单: ${(customer.coverage.illness || 0).toLocaleString()})</span>` : ''}
                    </div>
                </div>
                <div class="coverage-item-small">
                    <div class="coverage-item-small-label">意外</div>
                    <div class="coverage-item-small-value">
                        RM ${(hasMultiplePolicies ? totalCoverage.accident : (customer.coverage?.accident || 0)).toLocaleString()}
                        ${hasMultiplePolicies && customer.coverage?.accident ? ` <span style="font-size: 10px; color: #7f8c8d;">(本保单: ${(customer.coverage.accident || 0).toLocaleString()})</span>` : ''}
                    </div>
                </div>
                <div class="coverage-item-small">
                    <div class="coverage-item-small-label">医疗</div>
                    <div class="coverage-item-small-value">
                        RM ${(hasMultiplePolicies ? totalCoverage.medical : (customer.coverage?.medical || 0)).toLocaleString()}
                        ${hasMultiplePolicies && customer.coverage?.medical ? ` <span style="font-size: 10px; color: #7f8c8d;">(本保单: ${(customer.coverage.medical || 0).toLocaleString()})</span>` : ''}
                    </div>
                </div>
                <div class="coverage-item-small">
                    <div class="coverage-item-small-label">住院</div>
                    <div class="coverage-item-small-value">
                        RM ${(hasMultiplePolicies ? totalCoverage.hospital : (customer.coverage?.hospital || 0)).toLocaleString()}
                        ${hasMultiplePolicies && customer.coverage?.hospital ? ` <span style="font-size: 10px; color: #7f8c8d;">(本保单: ${(customer.coverage.hospital || 0).toLocaleString()})</span>` : ''}
                    </div>
                </div>
                <div class="coverage-item-small">
                    <div class="coverage-item-small-label">Waive</div>
                    <div class="coverage-item-small-value">
                        RM ${(hasMultiplePolicies ? totalCoverage.waive : (customer.coverage?.waive || 0)).toLocaleString()}
                        ${hasMultiplePolicies && customer.coverage?.waive ? ` <span style="font-size: 10px; color: #7f8c8d;">(本保单: ${(customer.coverage.waive || 0).toLocaleString()})</span>` : ''}
                    </div>
                </div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; min-width: 120px; flex-shrink: 0;">
                <div class="beneficiary-badge ${customer.beneficiary === 'Yes' ? 'yes' : 'no'}">
                    受益人: ${customer.beneficiary}
                </div>
                <div class="customer-actions" style="display: flex; gap: 5px;">
                    <button class="btn-icon btn-add-policy" onclick="openAddPolicyModal('${customer.id}')" title="加保">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn-icon" onclick="openCustomerModal('${customer.id}')" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

// Family Tree
function openFamilyModal(familyId = null, parentCustomerId = null) {
    const modal = document.getElementById('familyModal');
    const form = document.getElementById('familyForm');
    const deleteBtn = document.getElementById('deleteFamilyBtn');
    const title = document.getElementById('familyModalTitle');
    const existingSelect = document.getElementById('existingCustomerSelect');
    const parentSelect = document.getElementById('parentCustomerSelect');

    form.reset();
    
    // 确保姓名字段可编辑
    const familyNameInput = document.getElementById('familyName');
    familyNameInput.disabled = false;
    familyNameInput.readOnly = false;
    familyNameInput.value = '';
    
    // Populate parent customer (所属客户)
    const customers = getAgentData(STORAGE_KEYS.CUSTOMERS);
    parentSelect.innerHTML = '<option value="">-- 选择原有客户 --</option>';
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = `${customer.lifeAssuredName} (${customer.idNumber})`;
        parentSelect.appendChild(option);
    });
    
    // If parentCustomerId is provided, pre-select it
    if (parentCustomerId) {
        parentSelect.value = parentCustomerId;
    }
    
    // Populate existing customers (这个家人是否已经是客户)
    existingSelect.innerHTML = '<option value="">-- 不是现有客户，填写新信息 --</option>';
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = `${customer.lifeAssuredName} (${customer.idNumber})`;
        existingSelect.appendChild(option);
    });

    if (familyId) {
        const family = getAgentData(STORAGE_KEYS.FAMILY);
        const member = family.find(f => f.id === familyId);
        if (member) {
            title.textContent = '编辑家庭成员';
            deleteBtn.style.display = 'block';
            document.getElementById('familyId').value = member.id;
            
            // 设置所属客户
            if (member.parentCustomerId) {
                parentSelect.value = member.parentCustomerId;
            }
            
            // 设置是否现有客户
            if (member.customerId) {
                existingSelect.value = member.customerId;
                familyNameInput.disabled = true;
            } else {
                familyNameInput.disabled = false;
                familyNameInput.value = member.name;
                document.getElementById('familyRelationship').value = member.relationship;
                document.getElementById('familyGender').value = member.gender;
                document.getElementById('familyAge').value = member.age;
                document.getElementById('familyWork').value = member.work || '';
                document.getElementById('familyPhone').value = member.phone || '';
            }
        }
    } else {
        title.textContent = '添加家庭成员';
        deleteBtn.style.display = 'none';
    }

    openModal('familyModal');
}

function handleExistingCustomerSelect(e) {
    const customerId = e.target.value;
    if (customerId) {
        const customers = getAgentData(STORAGE_KEYS.CUSTOMERS);
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            document.getElementById('familyName').value = customer.lifeAssuredName;
            document.getElementById('familyName').disabled = true;
        }
    } else {
        document.getElementById('familyName').disabled = false;
    }
}

function handleFamilySubmit(e) {
    e.preventDefault();
    const family = getAgentData(STORAGE_KEYS.FAMILY);
    const familyId = document.getElementById('familyId').value;
    const customerId = document.getElementById('existingCustomerSelect').value;
    const parentCustomerId = document.getElementById('parentCustomerSelect').value;

    if (!parentCustomerId) {
        showNotification('请选择所属客户', 'error');
        return;
    }

    let member;
    if (customerId) {
        // 这个家人已经是现有客户
        const customers = getAgentData(STORAGE_KEYS.CUSTOMERS);
        const customer = customers.find(c => c.id === customerId);
        member = {
            id: familyId || Date.now().toString(),
            parentCustomerId, // 所属客户ID
            customerId, // 这个家人自己的客户ID（如果已经是客户）
            name: customer.lifeAssuredName,
            relationship: document.getElementById('familyRelationship').value,
            gender: customer.age ? 'N/A' : document.getElementById('familyGender').value,
            age: customer.age || parseInt(document.getElementById('familyAge').value),
            work: customer.work || document.getElementById('familyWork').value || '',
            phone: customer.contact || document.getElementById('familyPhone').value || '',
            isExistingCustomer: true,
            createdAt: familyId ? family.find(f => f.id === familyId)?.createdAt || new Date().toISOString() : new Date().toISOString()
        };
    } else {
        // 这个家人还不是现有客户（隐藏顾客）
        member = {
            id: familyId || Date.now().toString(),
            parentCustomerId, // 所属客户ID
            customerId: null, // 还不是客户
            name: document.getElementById('familyName').value,
            relationship: document.getElementById('familyRelationship').value,
            gender: document.getElementById('familyGender').value,
            age: parseInt(document.getElementById('familyAge').value),
            work: document.getElementById('familyWork').value || '',
            phone: document.getElementById('familyPhone').value || '',
            isExistingCustomer: false,
            createdAt: familyId ? family.find(f => f.id === familyId)?.createdAt || new Date().toISOString() : new Date().toISOString()
        };
    }

    if (familyId) {
        const index = family.findIndex(f => f.id === familyId);
        family[index] = member;
    } else {
        family.push(member);
    }

    saveAgentData(STORAGE_KEYS.FAMILY, family);
    loadFamilyTree();
    closeModal('familyModal');
    showNotification('家庭成员已保存', 'success');
    updateReminders();
}

function handleFamilyDelete() {
    const familyId = document.getElementById('familyId').value;
    const family = getAgentData(STORAGE_KEYS.FAMILY);
    const filtered = family.filter(f => f.id !== familyId);
    saveAgentData(STORAGE_KEYS.FAMILY, filtered);
    loadFamilyTree();
    closeModal('familyModal');
    showNotification('家庭成员已删除', 'info');
    updateReminders();
}

function loadFamilyTree(searchTerm = '') {
    const family = getAgentData(STORAGE_KEYS.FAMILY);
    const customers = getAgentData(STORAGE_KEYS.CUSTOMERS);
    const container = document.getElementById('familyTreeList');
    container.innerHTML = '';

    // Filter family members based on search term
    const filteredFamily = searchTerm ? family.filter(member => {
        const search = searchTerm.toLowerCase();
        const parentCustomer = customers.find(c => c.id === member.parentCustomerId);
        const parentName = parentCustomer ? parentCustomer.lifeAssuredName : '';
        return (
            member.name.toLowerCase().includes(search) ||
            member.relationship.toLowerCase().includes(search) ||
            (member.work && member.work.toLowerCase().includes(search)) ||
            (member.phone && member.phone.toLowerCase().includes(search)) ||
            parentName.toLowerCase().includes(search)
        );
    }) : family;

    if (filteredFamily.length === 0 && searchTerm) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #7f8c8d;">未找到匹配的家庭成员</div>';
        return;
    }

    filteredFamily.forEach(member => {
        const parentCustomer = customers.find(c => c.id === member.parentCustomerId);
        const parentName = parentCustomer ? parentCustomer.lifeAssuredName : '未知客户';
        
        const card = document.createElement('div');
        card.className = `family-member-card ${member.isExistingCustomer ? '' : 'not-customer'}`;
        card.innerHTML = `
            <div class="family-member-info">
                <div class="family-member-name">
                    ${member.name}
                    <span class="customer-badge ${member.isExistingCustomer ? 'existing' : 'not-existing'}">
                        ${member.isExistingCustomer ? '现有客户' : '潜在客户'}
                    </span>
                </div>
                <div class="family-member-details">
                    <div style="margin-bottom: 5px;"><strong>所属客户:</strong> ${parentName}</div>
                    关系: ${member.relationship} | 性别: ${member.gender} | 年龄: ${member.age}
                    ${member.work ? `| 工作: ${member.work}` : ''}
                    ${member.phone ? `| 电话: ${member.phone}` : ''}
                </div>
            </div>
            <div class="customer-actions" style="display: flex; gap: 8px; align-items: center;">
                <button class="btn-icon btn-add-family" onclick="openFamilyModal(null, '${member.parentCustomerId}')" title="添加家庭成员">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="btn-icon" onclick="openFamilyModal('${member.id}')" title="编辑">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

// Load Family Tree Diagram
function loadFamilyTreeDiagram(searchTerm = '') {
    const family = getAgentData(STORAGE_KEYS.FAMILY);
    const customers = getAgentData(STORAGE_KEYS.CUSTOMERS);
    const container = document.getElementById('familyTreeDiagram');
    
    // Filter family members based on search term
    let filteredFamily = family;
    if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filteredFamily = family.filter(member => {
            const parentCustomer = customers.find(c => c.id === member.parentCustomerId);
            const parentName = parentCustomer ? parentCustomer.lifeAssuredName : '';
            return (
                member.name.toLowerCase().includes(search) ||
                member.relationship.toLowerCase().includes(search) ||
                (member.work && member.work.toLowerCase().includes(search)) ||
                (member.phone && member.phone.toLowerCase().includes(search)) ||
                parentName.toLowerCase().includes(search)
            );
        });
    }
    
    if (filteredFamily.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #7f8c8d;">暂无家庭成员数据</div>';
        return;
    }
    
    // Group family members by parent customer
    const familyGroups = {};
    filteredFamily.forEach(member => {
        const parentId = member.parentCustomerId || 'unknown';
        if (!familyGroups[parentId]) {
            const parentCustomer = customers.find(c => c.id === parentId);
            familyGroups[parentId] = {
                parent: parentCustomer,
                members: []
            };
        }
        familyGroups[parentId].members.push(member);
    });
    
    // Relationship hierarchy mapping (长辈 -> 同辈 -> 晚辈)
    const relationshipHierarchy = {
        // 长辈 (长辈层)
        '父亲': 1, '爸爸': 1, '爸': 1,
        '母亲': 1, '妈妈': 1, '妈': 1,
        '祖父': 1, '爷爷': 1, '外公': 1,
        '祖母': 1, '奶奶': 1, '外婆': 1,
        '岳父': 1, '岳母': 1,
        // 同辈 (同辈层)
        '配偶': 2, '妻子': 2, '丈夫': 2, '太太': 2, '老婆': 2, '老公': 2,
        '兄弟': 2, '哥哥': 2, '弟弟': 2, '兄': 2, '弟': 2,
        '姐妹': 2, '姐姐': 2, '妹妹': 2, '姐': 2, '妹': 2,
        '堂兄弟': 2, '堂姐妹': 2, '表兄弟': 2, '表姐妹': 2,
        // 晚辈 (晚辈层)
        '子女': 3, '儿子': 3, '女儿': 3, '子': 3, '女': 3,
        '孙子': 3, '孙女': 3, '外孙': 3, '外孙女': 3,
        '侄子': 3, '侄女': 3, '外甥': 3, '外甥女': 3
    };
    
    // Function to get hierarchy level
    const getHierarchyLevel = (relationship) => {
        if (!relationship) return 2; // Default to same generation
        const rel = relationship.trim();
        return relationshipHierarchy[rel] || 2; // Default to same generation
    };
    
    // Build diagram HTML for each family group
    let diagramHTML = '';
    Object.keys(familyGroups).forEach(parentId => {
        const group = familyGroups[parentId];
        const parent = group.parent;
        const members = group.members;
        
        if (!parent) return; // Skip if no parent customer
        
        // Remove duplicates by name (keep first occurrence)
        const uniqueMembers = [];
        const seenNames = new Set();
        members.forEach(member => {
            if (!seenNames.has(member.name)) {
                seenNames.add(member.name);
                uniqueMembers.push(member);
            }
        });
        
        // Sort members by hierarchy level and relationship
        uniqueMembers.sort((a, b) => {
            const levelA = getHierarchyLevel(a.relationship);
            const levelB = getHierarchyLevel(b.relationship);
            if (levelA !== levelB) {
                return levelA - levelB; // Sort by hierarchy: 1 (长辈) -> 2 (同辈) -> 3 (晚辈)
            }
            // If same level, sort by relationship text
            return (a.relationship || '').localeCompare(b.relationship || '');
        });
        
        // Group members by hierarchy level
        const membersByLevel = {
            1: [], // 长辈
            2: [], // 同辈
            3: []  // 晚辈
        };
        
        uniqueMembers.forEach(member => {
            const level = getHierarchyLevel(member.relationship);
            membersByLevel[level].push(member);
        });
        
        // Build diagram with proper hierarchy
        diagramHTML += '<div class="family-tree-group">';
        
        // Level 1: 长辈 (长辈层)
        if (membersByLevel[1].length > 0) {
            diagramHTML += '<div class="family-tree-level level-elder">';
            membersByLevel[1].forEach(member => {
                const nodeClass = member.isExistingCustomer ? 'customer' : 'not-customer';
                const relationText = member.relationship || '长辈';
                diagramHTML += `
                    <div class="family-tree-node ${nodeClass}" title="${member.name} - ${relationText}">
                        <div class="family-tree-node-name">${member.name}</div>
                        <div class="family-tree-node-relation">${relationText}</div>
                    </div>
                `;
            });
            diagramHTML += '</div>';
        }
        
        // Level 2: 主客户和同辈 (中间层)
        diagramHTML += '<div class="family-tree-level level-main">';
        // Main customer (center)
        diagramHTML += `
            <div class="family-tree-node customer main-customer">
                <div class="family-tree-node-name">${parent.lifeAssuredName}</div>
                <div class="family-tree-node-relation">主客户</div>
            </div>
        `;
        // Same generation members (spouse, siblings)
        membersByLevel[2].forEach(member => {
            const nodeClass = member.isExistingCustomer ? 'customer' : 'not-customer';
            const relationText = member.relationship || '家庭成员';
            diagramHTML += `
                <div class="family-tree-node ${nodeClass}" title="${member.name} - ${relationText}">
                    <div class="family-tree-node-name">${member.name}</div>
                    <div class="family-tree-node-relation">${relationText}</div>
                </div>
            `;
        });
        diagramHTML += '</div>';
        
        // Level 3: 晚辈 (晚辈层)
        if (membersByLevel[3].length > 0) {
            diagramHTML += '<div class="family-tree-level level-junior">';
            membersByLevel[3].forEach(member => {
                const nodeClass = member.isExistingCustomer ? 'customer' : 'not-customer';
                const relationText = member.relationship || '晚辈';
                diagramHTML += `
                    <div class="family-tree-node ${nodeClass}" title="${member.name} - ${relationText}">
                        <div class="family-tree-node-name">${member.name}</div>
                        <div class="family-tree-node-relation">${relationText}</div>
                    </div>
                `;
            });
            diagramHTML += '</div>';
        }
        
        diagramHTML += '</div>'; // Close family-tree-group
    });
    
    container.innerHTML = diagramHTML || '<div style="text-align: center; padding: 40px; color: #7f8c8d;">暂无家庭成员数据</div>';
}

// 3访汇报 Management
function openVisitModal(visitId = null) {
    const modal = document.getElementById('visitModal');
    const form = document.getElementById('visitForm');
    const deleteBtn = document.getElementById('deleteVisitBtn');
    const title = document.getElementById('visitModalTitle');

    form.reset();

    const transferContainer = document.getElementById('transferToReferralContainer');
    
    if (visitId) {
        const visits = getAgentData(STORAGE_KEYS.VISITS);
        const visit = visits.find(v => v.id === visitId);
        if (visit) {
            title.textContent = '编辑3访汇报';
            deleteBtn.style.display = 'block';
            document.getElementById('visitId').value = visit.id;
            document.getElementById('visitDate').value = visit.date ? new Date(visit.date).toISOString().split('T')[0] : '';
            document.getElementById('visitName').value = visit.name || '';
            document.getElementById('visitSource').value = visit.source || '';
            document.getElementById('visitOPF').value = visit.opf || '';
            document.getElementById('visitAge').value = visit.age || '';
            document.getElementById('visitWork').value = visit.work || '';
            document.getElementById('visitArea').value = visit.area || '';
            document.getElementById('visitIncome').value = visit.income || '';
            document.getElementById('visitConcept').value = visit.concept || '';
            document.getElementById('visitPremium').value = visit.premium || '';
            document.getElementById('visitExistingPolicy').value = visit.existingPolicy || '';
            document.getElementById('visitOutcome').value = visit.outcome || '';
            document.getElementById('visitReferral').value = visit.referral || 'No';
            
            // Show transfer button if referral is Yes
            if (visit.referral === 'Yes') {
                transferContainer.style.display = 'block';
                transferContainer.setAttribute('data-visit-id', visit.id);
            } else {
                transferContainer.style.display = 'none';
            }
        }
    } else {
        title.textContent = '添加3访汇报';
        deleteBtn.style.display = 'none';
        transferContainer.style.display = 'none';
        // Set default date to today
        document.getElementById('visitDate').value = new Date().toISOString().split('T')[0];
    }

    openModal('visitModal');
}

function handleVisitSubmit(e) {
    e.preventDefault();
    const visits = getAgentData(STORAGE_KEYS.VISITS);
    const visitId = document.getElementById('visitId').value;

    const visit = {
        id: visitId || Date.now().toString(),
        date: document.getElementById('visitDate').value,
        name: document.getElementById('visitName').value,
        source: document.getElementById('visitSource').value,
        opf: document.getElementById('visitOPF').value,
        age: document.getElementById('visitAge').value ? parseInt(document.getElementById('visitAge').value) : null,
        work: document.getElementById('visitWork').value || '',
        area: document.getElementById('visitArea').value || '',
        income: document.getElementById('visitIncome').value ? parseFloat(document.getElementById('visitIncome').value) : null,
        concept: document.getElementById('visitConcept').value || '',
        premium: document.getElementById('visitPremium').value ? parseFloat(document.getElementById('visitPremium').value) : null,
        existingPolicy: document.getElementById('visitExistingPolicy').value || '',
        outcome: document.getElementById('visitOutcome').value || '',
        referral: document.getElementById('visitReferral').value || 'No',
        createdAt: visitId ? visits.find(v => v.id === visitId)?.createdAt || new Date().toISOString() : new Date().toISOString()
    };

    if (visitId) {
        const index = visits.findIndex(v => v.id === visitId);
        visits[index] = visit;
    } else {
        visits.push(visit);
    }

    saveAgentData(STORAGE_KEYS.VISITS, visits);
    loadVisits();
    closeModal('visitModal');
    showNotification('3访汇报已保存', 'success');
}

function handleVisitDelete() {
    const visitId = document.getElementById('visitId').value;
    const visits = getAgentData(STORAGE_KEYS.VISITS);
    const filtered = visits.filter(v => v.id !== visitId);
    saveAgentData(STORAGE_KEYS.VISITS, filtered);
    loadVisits();
    closeModal('visitModal');
    showNotification('3访汇报已删除', 'info');
}

function transferVisitToReferral() {
    const transferContainer = document.getElementById('transferToReferralContainer');
    const visitId = transferContainer.getAttribute('data-visit-id');
    
    // Get form values (either from saved visit or current form)
    let name, age, source, date, outcome;
    
    if (visitId) {
        // Get from saved visit
        const visits = getAgentData(STORAGE_KEYS.VISITS);
        const visit = visits.find(v => v.id === visitId);
        
        if (!visit) {
            showNotification('未找到3访汇报', 'error');
            return;
        }
        
        name = visit.name;
        age = visit.age;
        source = visit.source;
        date = visit.date;
        outcome = visit.outcome;
    } else {
        // Get from current form
        name = document.getElementById('visitName').value;
        age = document.getElementById('visitAge').value;
        source = document.getElementById('visitSource').value;
        date = document.getElementById('visitDate').value;
        outcome = document.getElementById('visitOutcome').value;
    }
    
    if (!name || !source) {
        showNotification('请填写名字和顾客来源', 'error');
        return;
    }
    
    // Close visit modal and open referral modal with pre-filled data
    closeModal('visitModal');
    openReferralModal(null, {
        name: name,
        age: age || null,
        from: source,
        firstMeetingDate: date || null,
        lastMeetingDate: date || null,
        outcome: outcome || ''
    });
}

function loadVisits(searchTerm = '') {
    const visits = getAgentData(STORAGE_KEYS.VISITS);
    const container = document.getElementById('visitsList');
    container.innerHTML = '';

    // Filter visits based on search term
    const filteredVisits = searchTerm ? visits.filter(visit => {
        const search = searchTerm.toLowerCase();
        return (
            (visit.name && visit.name.toLowerCase().includes(search)) ||
            (visit.source && visit.source.toLowerCase().includes(search)) ||
            (visit.area && visit.area.toLowerCase().includes(search)) ||
            (visit.work && visit.work.toLowerCase().includes(search)) ||
            (visit.concept && visit.concept.toLowerCase().includes(search))
        );
    }) : visits;

    if (filteredVisits.length === 0 && searchTerm) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #7f8c8d;">未找到匹配的3访汇报</div>';
        return;
    }

    if (filteredVisits.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #7f8c8d;">暂无3访汇报记录</div>';
        return;
    }

    filteredVisits.forEach(visit => {
        const card = document.createElement('div');
        card.className = 'visit-card';
        card.dataset.visitId = visit.id;
        const visitDate = visit.date ? new Date(visit.date).toLocaleDateString('zh-CN') : '未填写';
        card.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 15px; flex: 1;">
                <input type="checkbox" class="visit-checkbox" data-visit-id="${visit.id}" onchange="updateVisitSelection()" style="margin-top: 5px; cursor: pointer;">
                <div style="flex: 1;">
                    <div class="visit-header">
                        <div class="visit-name">${visit.name || '未填写'}</div>
                        <div class="visit-badge visit-${visit.opf ? visit.opf.toLowerCase().replace(' ', '-') : 'unknown'}">
                            ${visit.opf || '未设置'}
                        </div>
                    </div>
                <div class="visit-info">
                    <div class="visit-info-row">
                        <div class="visit-info-item">
                            <span class="visit-label">日期:</span>
                            <span class="visit-value">${visitDate}</span>
                        </div>
                        <div class="visit-info-item">
                            <span class="visit-label">顾客来源:</span>
                            <span class="visit-value">${visit.source || '未填写'}</span>
                        </div>
                        <div class="visit-info-item">
                            <span class="visit-label">年龄:</span>
                            <span class="visit-value">${visit.age || '未填写'}</span>
                        </div>
                        <div class="visit-info-item">
                            <span class="visit-label">工作:</span>
                            <span class="visit-value">${visit.work || '未填写'}</span>
                        </div>
                    </div>
                    <div class="visit-info-row">
                        <div class="visit-info-item">
                            <span class="visit-label">地区:</span>
                            <span class="visit-value">${visit.area || '未填写'}</span>
                        </div>
                        <div class="visit-info-item">
                            <span class="visit-label">收入:</span>
                            <span class="visit-value">${visit.income ? 'RM ' + visit.income.toLocaleString() : '未填写'}</span>
                        </div>
                        <div class="visit-info-item">
                            <span class="visit-label">转介绍:</span>
                            <span class="visit-value visit-referral-${visit.referral === 'Yes' ? 'yes' : 'no'}">${visit.referral || 'No'}</span>
                        </div>
                    </div>
                    <div class="visit-info-row">
                        <div class="visit-info-item">
                            <span class="visit-label">Concept Selling题目:</span>
                            <span class="visit-value">${visit.concept || '未填写'}</span>
                        </div>
                    </div>
                    <div class="visit-info-row">
                        <div class="visit-info-item">
                            <span class="visit-label">保费金额:</span>
                            <span class="visit-value">${visit.premium ? 'RM ' + visit.premium.toLocaleString() : '未填写'}</span>
                        </div>
                        <div class="visit-info-item">
                            <span class="visit-label">原有保单:</span>
                            <span class="visit-value">${visit.existingPolicy || '未填写'}</span>
                        </div>
                    </div>
                    ${visit.outcome ? `
                    <div class="visit-info-row">
                        <div class="visit-info-item visit-outcome">
                            <span class="visit-label">Outcome:</span>
                            <span class="visit-value">${visit.outcome}</span>
                        </div>
                    </div>
                    ` : ''}
                    </div>
                </div>
            </div>
            <div class="customer-actions" style="flex-shrink: 0;">
                <button class="btn-icon" onclick="openVisitModal('${visit.id}')" title="编辑">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        `;

        container.appendChild(card);
    });
    
    updateVisitSelectionUI();
}

// Update visit selection UI
function updateVisitSelectionUI() {
    const checkboxes = document.querySelectorAll('.visit-checkbox');
    const selectedCount = document.querySelectorAll('.visit-checkbox:checked').length;
    const selectAllBtn = document.getElementById('selectAllVisitsBtn');
    const combineBtn = document.getElementById('combineVisitsBtn');
    
    if (checkboxes.length > 0) {
        selectAllBtn.style.display = 'inline-block';
        combineBtn.style.display = selectedCount > 0 ? 'inline-block' : 'none';
        
        if (selectedCount === checkboxes.length && checkboxes.length > 0) {
            selectAllBtn.innerHTML = '<i class="fas fa-square"></i> 取消全选';
        } else {
            selectAllBtn.innerHTML = '<i class="fas fa-check-square"></i> 全选';
        }
    } else {
        selectAllBtn.style.display = 'none';
        combineBtn.style.display = 'none';
    }
}

// Update visit selection
function updateVisitSelection() {
    updateVisitSelectionUI();
    
    // Update card visual state
    const checkboxes = document.querySelectorAll('.visit-checkbox');
    checkboxes.forEach(cb => {
        const card = cb.closest('.visit-card');
        if (cb.checked) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
}

// Select all visits
function selectAllVisits() {
    const checkboxes = document.querySelectorAll('.visit-checkbox');
    const allSelected = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allSelected;
        const card = cb.closest('.visit-card');
        if (cb.checked) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    updateVisitSelectionUI();
}

// Combine selected visits
function combineSelectedVisits() {
    const selectedCheckboxes = document.querySelectorAll('.visit-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showNotification('请至少选择一个3访汇报', 'warning');
        return;
    }
    
    const visits = getAgentData(STORAGE_KEYS.VISITS);
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.visitId);
    const selectedVisits = visits.filter(v => selectedIds.includes(v.id));
    
    // Sort by date
    selectedVisits.sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateA - dateB;
    });
    
    // Format combined content for WhatsApp
    let combinedText = '📋 *3访汇报综合*\n\n';
    
    selectedVisits.forEach((visit, index) => {
        const visitDate = visit.date ? new Date(visit.date).toLocaleDateString('zh-CN') : '未填写';
        
        combinedText += `━━━━━━━━━━━━━━━━━━━━\n`;
        combinedText += `*${index + 1}. ${visit.name || '未填写'}*\n`;
        combinedText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        combinedText += `📅 *日期:* ${visitDate}\n`;
        combinedText += `👤 *名字:* ${visit.name || '未填写'}\n`;
        combinedText += `📍 *顾客来源:* ${visit.source || '未填写'}\n`;
        combinedText += `🎯 *OPF:* ${visit.opf || '未设置'}\n`;
        
        if (visit.age) {
            combinedText += `🎂 *年龄:* ${visit.age}岁\n`;
        }
        
        if (visit.work) {
            combinedText += `💼 *工作:* ${visit.work}\n`;
        }
        
        if (visit.area) {
            combinedText += `🌍 *地区:* ${visit.area}\n`;
        }
        
        if (visit.income) {
            combinedText += `💰 *收入:* RM ${visit.income.toLocaleString()}\n`;
        }
        
        if (visit.concept) {
            combinedText += `💡 *Concept Selling题目:* ${visit.concept}\n`;
        }
        
        if (visit.premium) {
            combinedText += `💵 *保费金额:* RM ${visit.premium.toLocaleString()}\n`;
        }
        
        if (visit.existingPolicy) {
            combinedText += `📄 *原有保单:* ${visit.existingPolicy}\n`;
        }
        
        if (visit.outcome) {
            combinedText += `\n📝 *Outcome:*\n${visit.outcome}\n`;
        }
        
        combinedText += `\n🔄 *转介绍:* ${visit.referral === 'Yes' ? '✅ 是' : '❌ 否'}\n`;
        combinedText += `\n`;
    });
    
    combinedText += `━━━━━━━━━━━━━━━━━━━━\n`;
    combinedText += `总计: ${selectedVisits.length} 个3访汇报\n`;
    
    // Display in modal
    document.getElementById('combinedVisitsContent').textContent = combinedText;
    openModal('combineVisitsModal');
}

// Copy combined visits to clipboard
function copyCombinedVisits() {
    const content = document.getElementById('combinedVisitsContent').textContent;
    
    navigator.clipboard.writeText(content).then(() => {
        showNotification('已复制到剪贴板！', 'success');
    }).catch(err => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showNotification('已复制到剪贴板！', 'success');
        } catch (err) {
            showNotification('复制失败，请手动复制', 'error');
        }
        document.body.removeChild(textArea);
    });
}

// KIV Management
function openKIVModal(kivId = null) {
    const modal = document.getElementById('kivModal');
    const form = document.getElementById('kivForm');
    const deleteBtn = document.getElementById('deleteKIVBtn');
    const title = document.getElementById('kivModalTitle');

    form.reset();

    if (kivId) {
        const kiv = getAgentData(STORAGE_KEYS.KIV);
        const item = kiv.find(k => k.id === kivId);
        if (item) {
            title.textContent = '编辑KIV';
            deleteBtn.style.display = 'block';
            document.getElementById('kivId').value = item.id;
            document.getElementById('kivName').value = item.name;
            document.getElementById('kivPolicyType').value = item.policyType;
            document.getElementById('kivPremium').value = item.premium;
            document.getElementById('kivLastMeeting').value = new Date(item.lastMeeting).toISOString().slice(0, 16);
            document.getElementById('kivNextMeeting').value = new Date(item.nextMeeting).toISOString().slice(0, 16);
            document.getElementById('kivReason').value = item.reason;
        }
    } else {
        title.textContent = '添加KIV';
        deleteBtn.style.display = 'none';
    }

    openModal('kivModal');
}

function handleKIVSubmit(e) {
    e.preventDefault();
    const kiv = getAgentData(STORAGE_KEYS.KIV);
    const kivId = document.getElementById('kivId').value;

    const item = {
        id: kivId || Date.now().toString(),
        name: document.getElementById('kivName').value,
        policyType: document.getElementById('kivPolicyType').value,
        premium: parseFloat(document.getElementById('kivPremium').value),
        lastMeeting: new Date(document.getElementById('kivLastMeeting').value).toISOString(),
        nextMeeting: new Date(document.getElementById('kivNextMeeting').value).toISOString(),
        reason: document.getElementById('kivReason').value,
        createdAt: kivId ? kiv.find(k => k.id === kivId)?.createdAt || new Date().toISOString() : new Date().toISOString()
    };

    if (kivId) {
        const index = kiv.findIndex(k => k.id === kivId);
        kiv[index] = item;
    } else {
        kiv.push(item);
    }

    saveAgentData(STORAGE_KEYS.KIV, kiv);
    loadKIV();
    closeModal('kivModal');
    showNotification('KIV已保存', 'success');
    updateCalendar();
    updateReminders();
}

function handleKIVDelete() {
    const kivId = document.getElementById('kivId').value;
    const kiv = getAgentData(STORAGE_KEYS.KIV);
    const filtered = kiv.filter(k => k.id !== kivId);
    saveAgentData(STORAGE_KEYS.KIV, filtered);
    loadKIV();
    closeModal('kivModal');
    showNotification('KIV已删除', 'info');
    updateCalendar();
    updateReminders();
}

function loadKIV(searchTerm = '') {
    const kiv = getAgentData(STORAGE_KEYS.KIV);
    const container = document.getElementById('kivList');
    container.innerHTML = '';

    // Filter KIV items based on search term
    const filteredKIV = searchTerm ? kiv.filter(item => {
        const search = searchTerm.toLowerCase();
        return (
            item.name.toLowerCase().includes(search) ||
            item.policyType.toLowerCase().includes(search) ||
            item.reason.toLowerCase().includes(search)
        );
    }) : kiv;

    if (filteredKIV.length === 0 && searchTerm) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #7f8c8d;">未找到匹配的KIV记录</div>';
        return;
    }

    filteredKIV.forEach(item => {
        const lastMeeting = new Date(item.lastMeeting);
        const nextMeeting = new Date(item.nextMeeting);
        const daysUntil = Math.ceil((nextMeeting - new Date()) / (1000 * 60 * 60 * 24));
        const isOverdue = daysUntil < 0;

        const card = document.createElement('div');
        card.className = 'kiv-card';
        card.innerHTML = `
            <div class="kiv-header">
                <div class="kiv-name">${item.name}</div>
            </div>
            <div class="kiv-info">
                <div><strong>保单类型:</strong> ${item.policyType}</div>
                <div><strong>保费金额:</strong> RM ${item.premium.toLocaleString()}</div>
            </div>
            <div class="kiv-details">
                <div class="kiv-detail-item">
                    <div class="kiv-detail-label">最后见面</div>
                    <div class="kiv-detail-value">${lastMeeting.toLocaleDateString('zh-CN')}</div>
                </div>
                <div class="kiv-detail-item">
                    <div class="kiv-detail-label">下次见面</div>
                    <div class="kiv-detail-value" style="color: ${isOverdue ? 'var(--danger)' : daysUntil <= 7 ? 'var(--warning)' : 'var(--dark-grey)'}">
                        ${nextMeeting.toLocaleDateString('zh-CN')}
                        <div style="font-size: 11px; font-weight: normal; margin-top: 2px;">
                            ${isOverdue ? '(已到期)' : `(${daysUntil}天后)`}
                        </div>
                    </div>
                </div>
                <div class="kiv-detail-item" style="min-width: 200px; flex: 1;">
                    <div class="kiv-detail-label">不能成交原因</div>
                    <div class="kiv-detail-value" style="font-weight: normal; font-size: 12px;">${item.reason}</div>
                </div>
            </div>
            <div class="customer-actions" style="flex-shrink: 0;">
                <button class="btn-icon" onclick="openKIVModal('${item.id}')">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

// Monthly Cake Management
function openMonthlyModal(monthlyId = null) {
    const modal = document.getElementById('monthlyModal');
    const form = document.getElementById('monthlyForm');
    const deleteBtn = document.getElementById('deleteMonthlyBtn');
    const title = document.getElementById('monthlyModalTitle');

    form.reset();

    if (monthlyId) {
        const monthly = getAgentData(STORAGE_KEYS.MONTHLY);
        const item = monthly.find(m => m.id === monthlyId);
        if (item) {
            title.textContent = '编辑计划';
            deleteBtn.style.display = 'block';
            document.getElementById('monthlyId').value = item.id;
            document.getElementById('monthlyName').value = item.name;
            document.getElementById('monthlyPolicyType').value = item.policyType;
            document.getElementById('monthlyPremium').value = item.premium;
            document.getElementById('monthlyAppointment').value = new Date(item.appointment).toISOString().slice(0, 16);
            document.getElementById('monthlyOutcome').value = item.outcome || '';
        }
    } else {
        title.textContent = '添加计划';
        deleteBtn.style.display = 'none';
    }

    openModal('monthlyModal');
}

function handleMonthlySubmit(e) {
    e.preventDefault();
    const monthly = getAgentData(STORAGE_KEYS.MONTHLY);
    const monthlyId = document.getElementById('monthlyId').value;

    const item = {
        id: monthlyId || Date.now().toString(),
        name: document.getElementById('monthlyName').value,
        policyType: document.getElementById('monthlyPolicyType').value,
        premium: parseFloat(document.getElementById('monthlyPremium').value),
        appointment: new Date(document.getElementById('monthlyAppointment').value).toISOString(),
        outcome: document.getElementById('monthlyOutcome').value || '',
        createdAt: monthlyId ? monthly.find(m => m.id === monthlyId)?.createdAt || new Date().toISOString() : new Date().toISOString()
    };

    if (monthlyId) {
        const index = monthly.findIndex(m => m.id === monthlyId);
        monthly[index] = item;
    } else {
        monthly.push(item);
    }

    saveAgentData(STORAGE_KEYS.MONTHLY, monthly);
    loadMonthly();
    closeModal('monthlyModal');
    showNotification('计划已保存', 'success');
    updateCalendar();
}

function handleMonthlyDelete() {
    const monthlyId = document.getElementById('monthlyId').value;
    const monthly = getAgentData(STORAGE_KEYS.MONTHLY);
    const filtered = monthly.filter(m => m.id !== monthlyId);
    saveAgentData(STORAGE_KEYS.MONTHLY, filtered);
    loadMonthly();
    closeModal('monthlyModal');
    showNotification('计划已删除', 'info');
    updateCalendar();
}

// Toggle transfer dropdown
function toggleTransferDropdown(monthlyId) {
    // Close all other dropdowns
    document.querySelectorAll('.transfer-dropdown-menu').forEach(menu => {
        if (menu.id !== `transferDropdown-${monthlyId}`) {
            menu.style.display = 'none';
        }
    });
    
    // Toggle current dropdown
    const dropdown = document.getElementById(`transferDropdown-${monthlyId}`);
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
}

// Close transfer dropdown
function closeTransferDropdown(monthlyId) {
    const dropdown = document.getElementById(`transferDropdown-${monthlyId}`);
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.monthly-transfer-dropdown')) {
        document.querySelectorAll('.transfer-dropdown-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }
});

// Move Monthly Cake to Existing Customer (Success)
function moveToCustomer(monthlyId) {
    // 获取Monthly Cake记录
    const monthly = getAgentData(STORAGE_KEYS.MONTHLY);
    const monthlyItem = monthly.find(m => m.id === monthlyId);
    
    if (!monthlyItem) {
        showNotification('记录未找到', 'error');
        return;
    }
    
    // 确认操作
    if (!confirm(`确定要将 "${monthlyItem.name}" 转移到原有顾客名单吗？（成功案例）`)) {
        return;
    }
    
    // 获取原有顾客数据
    const customers = getAgentData(STORAGE_KEYS.CUSTOMERS);
    
    // 检查是否已存在相同身份证号码的客户（如果有idNumber字段）
    // 注意：Monthly Cake可能没有idNumber字段，所以需要检查
    let existingCustomer = null;
    if (monthlyItem.idNumber) {
        existingCustomer = customers.find(c => c.idNumber && c.idNumber === monthlyItem.idNumber);
    }
    
    if (existingCustomer) {
        // 如果已存在，询问是否加保
        if (confirm(`客户 "${monthlyItem.name}" 已存在于原有顾客名单中。是否要为此客户添加新保单？`)) {
            // 从Monthly Cake中删除
            const filteredMonthly = monthly.filter(m => m.id !== monthlyId);
            saveAgentData(STORAGE_KEYS.MONTHLY, filteredMonthly);
            
            // 重新加载数据
            loadMonthly();
            updateCalendar();
            updateReminders();
            
            // 切换到原有顾客标签页并打开加保表单
            setTimeout(() => {
                switchTab('existing');
                setTimeout(() => {
                    openAddPolicyModal(existingCustomer.id);
                }, 300);
            }, 400);
            
            showNotification('请填写新保单信息', 'info');
            return;
        } else {
            return;
        }
    }
    
    // 打开客户表单，预填充Monthly Cake的信息
    const modal = document.getElementById('customerModal');
    const form = document.getElementById('customerForm');
    const deleteBtn = document.getElementById('deleteCustomerBtn');
    const title = document.getElementById('customerModalTitle');
    const relatedPolicies = document.getElementById('relatedPolicies');
    
    form.reset();
    relatedPolicies.style.display = 'none';
    
    // 设置标题
    title.textContent = '添加原有顾客 - ' + monthlyItem.name;
    deleteBtn.style.display = 'none';
    
    // 预填充信息（从Monthly Cake获取，但Monthly Cake可能没有所有字段）
    document.getElementById('customerId').value = '';
    document.getElementById('lifeAssuredName').value = monthlyItem.name || '';
    document.getElementById('proposerName').value = monthlyItem.name || '';
    document.getElementById('idNumber').value = monthlyItem.idNumber || '';
    document.getElementById('age').value = monthlyItem.age || '';
    document.getElementById('contact').value = monthlyItem.contact || '';
    document.getElementById('policyType').value = monthlyItem.policyType || '';
    document.getElementById('policyNumber').value = monthlyItem.policyNumber || '';
    document.getElementById('premiumAmount').value = monthlyItem.premium || 0;
    // 使用预约时间作为生效日期
    const appointmentDate = new Date(monthlyItem.appointment);
    document.getElementById('effectiveDate').value = appointmentDate.toISOString().split('T')[0];
    document.getElementById('beneficiary').value = 'No'; // 默认未设置受益人
    
    // 从Monthly Cake中删除
    const filteredMonthly = monthly.filter(m => m.id !== monthlyId);
    saveAgentData(STORAGE_KEYS.MONTHLY, filteredMonthly);
    
    // 重新加载数据
    loadMonthly();
    updateCalendar();
    updateReminders();
    
    // 打开客户表单
    openModal('customerModal');
    showNotification('请完善客户信息并保存', 'info');
}

function moveToKIV(monthlyId) {
    // 获取Monthly Cake记录
    const monthly = getAgentData(STORAGE_KEYS.MONTHLY);
    const monthlyItem = monthly.find(m => m.id === monthlyId);
    
    if (!monthlyItem) {
        showNotification('记录未找到', 'error');
        return;
    }
    
    // 确认操作
    if (!confirm(`确定要将 "${monthlyItem.name}" 转移到KIV名单吗？（失败案例）`)) {
        return;
    }
    
    // 获取KIV数据
    const kiv = getAgentData(STORAGE_KEYS.KIV);
    
    // 创建KIV记录
    const now = new Date();
    const appointmentDate = new Date(monthlyItem.appointment);
    const nextMeetingDate = new Date(appointmentDate);
    nextMeetingDate.setDate(nextMeetingDate.getDate() + 30); // 默认30天后再次见面
    
    const kivItem = {
        id: Date.now().toString(),
        name: monthlyItem.name,
        policyType: monthlyItem.policyType,
        premium: monthlyItem.premium,
        lastMeeting: appointmentDate.toISOString(), // 使用预约时间作为最后见面时间
        nextMeeting: nextMeetingDate.toISOString(), // 默认30天后
        reason: monthlyItem.outcome || '从Monthly Cake转移', // 使用Outcome作为原因，如果没有则使用默认值
        createdAt: new Date().toISOString()
    };
    
    // 添加到KIV
    kiv.push(kivItem);
    saveAgentData(STORAGE_KEYS.KIV, kiv);
    
    // 从Monthly Cake中删除
    const filteredMonthly = monthly.filter(m => m.id !== monthlyId);
    saveAgentData(STORAGE_KEYS.MONTHLY, filteredMonthly);
    
    // 重新加载数据
    loadMonthly();
    loadKIV();
    updateCalendar();
    updateReminders();
    
    // 切换到KIV标签页
    setTimeout(() => {
        switchTab('kiv');
        setTimeout(() => {
            openKIVModal(kivItem.id);
        }, 300);
    }, 400);
    
    showNotification('已转移到KIV名单', 'success');
}

function loadMonthly(searchTerm = '') {
    const monthly = getAgentData(STORAGE_KEYS.MONTHLY);
    const container = document.getElementById('monthlyList');
    container.innerHTML = '';

    // Filter monthly items based on search term
    const filteredMonthly = searchTerm ? monthly.filter(item => {
        const search = searchTerm.toLowerCase();
        return (
            item.name.toLowerCase().includes(search) ||
            item.policyType.toLowerCase().includes(search) ||
            (item.outcome && item.outcome.toLowerCase().includes(search))
        );
    }) : monthly;

    if (filteredMonthly.length === 0 && searchTerm) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #7f8c8d;">未找到匹配的计划</div>';
        return;
    }

    filteredMonthly.forEach(item => {
        const appointment = new Date(item.appointment);

        const card = document.createElement('div');
        card.className = 'monthly-card';
        card.innerHTML = `
            <div class="monthly-header">
                <div class="monthly-name">${item.name}</div>
            </div>
            <div class="monthly-info">
                <div><strong>保单类型:</strong> ${item.policyType}</div>
                <div><strong>保费金额:</strong> RM ${item.premium.toLocaleString()}</div>
            </div>
            <div class="monthly-details">
                <div class="monthly-detail-item">
                    <div class="monthly-detail-label">预约时间</div>
                    <div class="monthly-detail-value">${appointment.toLocaleString('zh-CN')}</div>
                </div>
                ${item.outcome ? `
                <div class="monthly-detail-item" style="min-width: 250px; flex: 1;">
                    <div class="monthly-detail-label">Outcome</div>
                    <div class="monthly-detail-value" style="font-weight: normal; font-size: 12px;">${item.outcome}</div>
                </div>
                ` : ''}
            </div>
            <div class="customer-actions" style="flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; align-items: center;">
                <div class="monthly-transfer-dropdown" style="position: relative;">
                    <button class="btn-icon btn-move-kiv" onclick="toggleTransferDropdown('${item.id}')" title="转移">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                    <div id="transferDropdown-${item.id}" class="transfer-dropdown-menu" style="display: none;">
                        <button class="transfer-option transfer-success" onclick="moveToCustomer('${item.id}'); closeTransferDropdown('${item.id}');" title="转移到原有顾客">
                            <i class="fas fa-check-circle"></i> 原有顾客
                        </button>
                        <button class="transfer-option transfer-fail" onclick="moveToKIV('${item.id}'); closeTransferDropdown('${item.id}');" title="转移到KIV">
                            <i class="fas fa-times-circle"></i> KIV
                        </button>
                    </div>
                </div>
                <button class="btn-icon" onclick="openMonthlyModal('${item.id}')" title="编辑">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

// Tab Switching
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}-tab`).classList.add('active');
    
    // Clear search boxes when switching tabs
    document.getElementById('searchExisting').value = '';
    document.getElementById('searchFamily').value = '';
    document.getElementById('searchKIV').value = '';
    document.getElementById('searchMonthly').value = '';
    document.getElementById('searchReferral').value = '';
    
    // Clear coverage gap search
    document.getElementById('coverageGapType').value = '';
    document.getElementById('coverageGapAmount').value = '';
    document.getElementById('clearCoverageGapBtn').style.display = 'none';
    
    // Reload data without search filter
    loadCustomers();
    loadFamilyTree();
    loadKIV();
    loadMonthly();
    loadReferrals();
}

// Referral Listing Management
function openReferralModal(referralId = null, prefillData = null) {
    const modal = document.getElementById('referralModal');
    const form = document.getElementById('referralForm');
    const deleteBtn = document.getElementById('deleteReferralBtn');
    const title = document.getElementById('referralModalTitle');

    form.reset();

    if (referralId) {
        const referrals = getAgentData(STORAGE_KEYS.REFERRALS);
        const referral = referrals.find(r => r.id === referralId);
        if (referral) {
            title.textContent = '编辑转介绍';
            deleteBtn.style.display = 'block';
            document.getElementById('referralId').value = referral.id;
            document.getElementById('referralName').value = referral.name || '';
            document.getElementById('referralAge').value = referral.age || '';
            document.getElementById('referralFrom').value = referral.from || '';
            document.getElementById('referralFirstMeetingDate').value = referral.firstMeetingDate ? new Date(referral.firstMeetingDate).toISOString().split('T')[0] : '';
            document.getElementById('referralLastMeetingDate').value = referral.lastMeetingDate ? new Date(referral.lastMeetingDate).toISOString().split('T')[0] : '';
            document.getElementById('referralOutcome').value = referral.outcome || '';
        }
    } else if (prefillData) {
        title.textContent = '添加转介绍';
        deleteBtn.style.display = 'none';
        document.getElementById('referralName').value = prefillData.name || '';
        document.getElementById('referralAge').value = prefillData.age || '';
        document.getElementById('referralFrom').value = prefillData.from || '';
        document.getElementById('referralFirstMeetingDate').value = prefillData.firstMeetingDate ? new Date(prefillData.firstMeetingDate).toISOString().split('T')[0] : '';
        document.getElementById('referralLastMeetingDate').value = prefillData.lastMeetingDate ? new Date(prefillData.lastMeetingDate).toISOString().split('T')[0] : '';
        document.getElementById('referralOutcome').value = prefillData.outcome || '';
    } else {
        title.textContent = '添加转介绍';
        deleteBtn.style.display = 'none';
    }

    openModal('referralModal');
}

function handleReferralSubmit(e) {
    e.preventDefault();
    const referrals = getAgentData(STORAGE_KEYS.REFERRALS);
    const referralId = document.getElementById('referralId').value;

    const referral = {
        id: referralId || Date.now().toString(),
        name: document.getElementById('referralName').value,
        age: document.getElementById('referralAge').value ? parseInt(document.getElementById('referralAge').value) : null,
        from: document.getElementById('referralFrom').value,
        firstMeetingDate: document.getElementById('referralFirstMeetingDate').value || null,
        lastMeetingDate: document.getElementById('referralLastMeetingDate').value || null,
        outcome: document.getElementById('referralOutcome').value || '',
        createdAt: referralId ? referrals.find(r => r.id === referralId)?.createdAt || new Date().toISOString() : new Date().toISOString()
    };

    if (referralId) {
        const index = referrals.findIndex(r => r.id === referralId);
        referrals[index] = referral;
    } else {
        referrals.push(referral);
    }

    saveAgentData(STORAGE_KEYS.REFERRALS, referrals);
    loadReferrals();
    closeModal('referralModal');
    showNotification('转介绍已保存', 'success');
}

function handleReferralDelete() {
    const referralId = document.getElementById('referralId').value;
    const referrals = getAgentData(STORAGE_KEYS.REFERRALS);
    const filtered = referrals.filter(r => r.id !== referralId);
    saveAgentData(STORAGE_KEYS.REFERRALS, filtered);
    loadReferrals();
    closeModal('referralModal');
    showNotification('转介绍已删除', 'info');
}

function loadReferrals(searchTerm = '') {
    const referrals = getAgentData(STORAGE_KEYS.REFERRALS);
    const container = document.getElementById('referralList');
    container.innerHTML = '';

    // Filter referrals based on search term
    const filteredReferrals = searchTerm ? referrals.filter(referral => {
        const search = searchTerm.toLowerCase();
        return (
            (referral.name && referral.name.toLowerCase().includes(search)) ||
            (referral.from && referral.from.toLowerCase().includes(search)) ||
            (referral.outcome && referral.outcome.toLowerCase().includes(search))
        );
    }) : referrals;

    if (filteredReferrals.length === 0 && searchTerm) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #7f8c8d;">未找到匹配的转介绍</div>';
        return;
    }

    if (filteredReferrals.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #7f8c8d;">暂无转介绍记录</div>';
        return;
    }

    // Sort by last meeting date (most recent first)
    filteredReferrals.sort((a, b) => {
        const dateA = a.lastMeetingDate ? new Date(a.lastMeetingDate) : new Date(0);
        const dateB = b.lastMeetingDate ? new Date(b.lastMeetingDate) : new Date(0);
        return dateB - dateA;
    });

    filteredReferrals.forEach(referral => {
        const card = document.createElement('div');
        card.className = 'referral-card';
        card.onclick = () => openReferralModal(referral.id);

        const firstMeetingDate = referral.firstMeetingDate ? new Date(referral.firstMeetingDate).toLocaleDateString('zh-CN') : '未设置';
        const lastMeetingDate = referral.lastMeetingDate ? new Date(referral.lastMeetingDate).toLocaleDateString('zh-CN') : '未设置';

        card.innerHTML = `
            <div class="referral-header">
                <div class="referral-name">${referral.name}</div>
                <div class="referral-age">${referral.age ? referral.age + ' 岁' : '年龄未设置'}</div>
            </div>
            <div class="referral-info">
                <div class="referral-info-item">
                    <span class="referral-label">转介绍人:</span>
                    <span class="referral-value">${referral.from || '未设置'}</span>
                </div>
                <div class="referral-info-item">
                    <span class="referral-label">见面日期:</span>
                    <span class="referral-value">${firstMeetingDate}</span>
                </div>
                <div class="referral-info-item">
                    <span class="referral-label">最后见面:</span>
                    <span class="referral-value">${lastMeetingDate}</span>
                </div>
                ${referral.outcome ? `<div class="referral-info-item referral-outcome">
                    <span class="referral-label">Outcome:</span>
                    <span class="referral-value">${referral.outcome}</span>
                </div>` : ''}
            </div>
        `;

        container.appendChild(card);
    });
}

// Reminders
function updateReminders() {
    updateMissingBeneficiaries();
    updateUncompletedGoals();
    updateMarketableOpportunities();
    updateKIVDueMeetings();
}

function updateMissingBeneficiaries() {
    const customers = getAgentData(STORAGE_KEYS.CUSTOMERS);
    const missing = customers.filter(c => c.beneficiary === 'No');
    const container = document.getElementById('missingBeneficiaries');
    
    container.innerHTML = missing.length > 0 ? missing.map(customer => `
        <div class="reminder-item clickable" onclick="showReminderDetail('beneficiary', '${customer.id}')">
            <div class="reminder-item-title">${customer.lifeAssuredName} (${customer.idNumber})</div>
            <div class="reminder-item-details">保单: ${customer.policyNumber} | ${customer.policyType}</div>
        </div>
    `).join('') : '<div class="reminder-item"><div class="reminder-item-details">暂无遗漏的受益人</div></div>';
}

function updateUncompletedGoals() {
    const goals = getAgentData(STORAGE_KEYS.GOALS);
    const now = new Date();
    const uncompleted = goals.filter(g => {
        const dueDate = new Date(g.dueDate);
        return g.current < g.amount && dueDate >= now;
    });
    const container = document.getElementById('uncompletedGoals');
    
    container.innerHTML = uncompleted.length > 0 ? uncompleted.map(goal => {
        const distance = goal.amount - goal.current;
        const dueDate = new Date(goal.dueDate);
        const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        return `
            <div class="reminder-item clickable" onclick="showReminderDetail('goal', '${goal.id}')">
                <div class="reminder-item-title">${goal.title}</div>
                <div class="reminder-item-details">距离目标: RM ${distance.toLocaleString()} | 到期: ${dueDate.toLocaleDateString('zh-CN')} (${daysLeft}天)</div>
            </div>
        `;
    }).join('') : '<div class="reminder-item"><div class="reminder-item-details">所有目标都已完成</div></div>';
}

function updateMarketableOpportunities() {
    const family = getAgentData(STORAGE_KEYS.FAMILY);
    const opportunities = family.filter(f => !f.isExistingCustomer);
    const container = document.getElementById('marketableOpportunities');
    
    container.innerHTML = opportunities.length > 0 ? opportunities.map(member => `
        <div class="reminder-item clickable" onclick="showReminderDetail('marketable', '${member.id}')">
            <div class="reminder-item-title">${member.name}</div>
            <div class="reminder-item-details">关系: ${member.relationship} | ${member.phone ? `电话: ${member.phone}` : '无电话'}</div>
        </div>
    `).join('') : '<div class="reminder-item"><div class="reminder-item-details">暂无可开发的市场</div></div>';
}

function updateKIVDueMeetings() {
    const kiv = getAgentData(STORAGE_KEYS.KIV);
    const now = new Date();
    const due = kiv.filter(item => {
        const nextMeeting = new Date(item.nextMeeting);
        const daysUntil = Math.ceil((nextMeeting - now) / (1000 * 60 * 60 * 24));
        return daysUntil <= 7 && daysUntil >= 0; // Within 7 days
    });
    const container = document.getElementById('kivDueMeetings');
    
    container.innerHTML = due.length > 0 ? due.map(item => {
        const nextMeeting = new Date(item.nextMeeting);
        const daysUntil = Math.ceil((nextMeeting - now) / (1000 * 60 * 60 * 24));
        return `
            <div class="reminder-item clickable" onclick="showReminderDetail('kiv', '${item.id}')">
                <div class="reminder-item-title">${item.name}</div>
                <div class="reminder-item-details">下次见面: ${nextMeeting.toLocaleString('zh-CN')} (${daysUntil}天后)</div>
            </div>
        `;
    }).join('') : '<div class="reminder-item"><div class="reminder-item-details">暂无即将到期的KIV见面</div></div>';
}

// Show Reminder Detail
function showReminderDetail(type, id) {
    const modal = document.getElementById('reminderDetailModal');
    const title = document.getElementById('reminderDetailModalTitle');
    const content = document.getElementById('reminderDetailContent');
    const goToBtn = document.getElementById('reminderGoToBtn');
    const moveToMonthlyBtn = document.getElementById('reminderMoveToMonthlyBtn');
    
    let detailHTML = '';
    let pageToGo = '';
    let tabToSwitch = '';
    let canMoveToMonthly = false; // 标记是否可以转移到Monthly Cake
    
    switch(type) {
        case 'beneficiary':
            const customers = getAgentData(STORAGE_KEYS.CUSTOMERS);
            const customer = customers.find(c => c.id === id);
            if (customer) {
                title.textContent = '遗漏的受益人提醒';
                detailHTML = `
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">客户姓名</div>
                        <div class="reminder-detail-value">${customer.lifeAssuredName}</div>
                    </div>
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">身份证号码</div>
                        <div class="reminder-detail-value">${customer.idNumber}</div>
                    </div>
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">保单号码</div>
                        <div class="reminder-detail-value">${customer.policyNumber}</div>
                    </div>
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">保单类型</div>
                        <div class="reminder-detail-value">${customer.policyType}</div>
                    </div>
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">受益人状态</div>
                        <div class="reminder-detail-value" style="color: var(--danger); font-weight: 600;">未设置</div>
                    </div>
                    <div class="reminder-detail-note" style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; color: #856404;">
                        <i class="fas fa-exclamation-triangle"></i> 此客户尚未设置受益人，请尽快联系客户补充受益人信息。
                    </div>
                `;
                pageToGo = 'customers';
                tabToSwitch = 'existing';
                goToBtn.setAttribute('data-action', `openCustomerModal('${customer.id}')`);
            }
            break;
            
        case 'goal':
            const goals = getAgentData(STORAGE_KEYS.GOALS);
            const goal = goals.find(g => g.id === id);
            if (goal) {
                const now = new Date();
                const dueDate = new Date(goal.dueDate);
                const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                const distance = goal.amount - goal.current;
                const progress = Math.min((goal.current / goal.amount) * 100, 100);
                
                title.textContent = '未完成目标提醒';
                detailHTML = `
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">目标名称</div>
                        <div class="reminder-detail-value">${goal.title}</div>
                    </div>
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">目标数额</div>
                        <div class="reminder-detail-value">RM ${goal.amount.toLocaleString()}</div>
                    </div>
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">目前业绩</div>
                        <div class="reminder-detail-value">RM ${goal.current.toLocaleString()}</div>
                    </div>
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">距离目标</div>
                        <div class="reminder-detail-value" style="color: var(--primary-orange); font-weight: 600;">RM ${distance.toLocaleString()}</div>
                    </div>
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">完成进度</div>
                        <div class="reminder-detail-value">${progress.toFixed(1)}%</div>
                    </div>
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">到期日期</div>
                        <div class="reminder-detail-value">${dueDate.toLocaleDateString('zh-CN')} (还有 ${daysLeft} 天)</div>
                    </div>
                    <div class="reminder-detail-note" style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; color: #856404;">
                        <i class="fas fa-bullseye"></i> 目标尚未完成，请继续努力达成目标！
                    </div>
                `;
                pageToGo = 'goals';
                goToBtn.setAttribute('data-action', `openGoalModal('${goal.id}')`);
            }
            break;
            
        case 'marketable':
            const family = getAgentData(STORAGE_KEYS.FAMILY);
            const member = family.find(f => f.id === id);
            if (member) {
                const customers = getAgentData(STORAGE_KEYS.CUSTOMERS);
                const parentCustomer = customers.find(c => c.id === member.parentCustomerId);
                const parentName = parentCustomer ? parentCustomer.lifeAssuredName : '未知客户';
                
                title.textContent = '可开发市场提醒';
                detailHTML = `
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">姓名</div>
                        <div class="reminder-detail-value">${member.name}</div>
                    </div>
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">所属客户</div>
                        <div class="reminder-detail-value">${parentName}</div>
                    </div>
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">关系</div>
                        <div class="reminder-detail-value">${member.relationship}</div>
                    </div>
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">性别</div>
                        <div class="reminder-detail-value">${member.gender}</div>
                    </div>
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">年龄</div>
                        <div class="reminder-detail-value">${member.age}</div>
                    </div>
                    ${member.work ? `
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">工作</div>
                        <div class="reminder-detail-value">${member.work}</div>
                    </div>
                    ` : ''}
                    ${member.phone ? `
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">电话</div>
                        <div class="reminder-detail-value">${member.phone}</div>
                    </div>
                    ` : ''}
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">客户状态</div>
                        <div class="reminder-detail-value" style="color: var(--danger); font-weight: 600;">潜在客户</div>
                    </div>
                    <div class="reminder-detail-note" style="margin-top: 20px; padding: 15px; background: #d1ecf1; border-radius: 8px; color: #0c5460;">
                        <i class="fas fa-chart-line"></i> 这是潜在客户，可以尝试开发市场，向其推荐保险产品。
                    </div>
                `;
                pageToGo = 'customers';
                tabToSwitch = 'family';
                goToBtn.setAttribute('data-action', `openFamilyModal('${member.id}')`);
                canMoveToMonthly = true; // 可开发市场可以转移到Monthly Cake
            }
            break;
            
        case 'kiv':
            const kiv = getAgentData(STORAGE_KEYS.KIV);
            const kivItem = kiv.find(k => k.id === id);
            if (kivItem) {
                const now = new Date();
                const nextMeeting = new Date(kivItem.nextMeeting);
                const daysUntil = Math.ceil((nextMeeting - now) / (1000 * 60 * 60 * 24));
                const lastMeeting = kivItem.lastMeeting ? new Date(kivItem.lastMeeting).toLocaleDateString('zh-CN') : '未记录';
                
                title.textContent = 'KIV见面提醒';
                detailHTML = `
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">客户姓名</div>
                        <div class="reminder-detail-value">${kivItem.name}</div>
                    </div>
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">保单类型</div>
                        <div class="reminder-detail-value">${kivItem.policyType}</div>
                    </div>
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">保费金额</div>
                        <div class="reminder-detail-value">RM ${parseFloat(kivItem.premium || 0).toLocaleString()}</div>
                    </div>
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">上次见面</div>
                        <div class="reminder-detail-value">${lastMeeting}</div>
                    </div>
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">下次见面</div>
                        <div class="reminder-detail-value" style="color: ${daysUntil <= 1 ? 'var(--danger)' : 'var(--primary-orange)'}; font-weight: 600;">
                            ${nextMeeting.toLocaleString('zh-CN')} (${daysUntil}天后)
                        </div>
                    </div>
                    ${kivItem.reason ? `
                    <div class="reminder-detail-item">
                        <div class="reminder-detail-label">未成交原因</div>
                        <div class="reminder-detail-value">${kivItem.reason}</div>
                    </div>
                    ` : ''}
                    <div class="reminder-detail-note" style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; color: #856404;">
                        <i class="fas fa-calendar-check"></i> 见面时间即将到期，请及时安排与客户见面。
                    </div>
                `;
                pageToGo = 'customers';
                tabToSwitch = 'kiv';
                goToBtn.setAttribute('data-action', `openKIVModal('${kivItem.id}')`);
                canMoveToMonthly = true; // KIV可以转移到Monthly Cake
            }
            break;
    }
    
    content.innerHTML = detailHTML;
    
    // 显示/隐藏转移到Monthly Cake按钮
    if (canMoveToMonthly && (type === 'marketable' || type === 'kiv')) {
        moveToMonthlyBtn.style.display = 'block';
        moveToMonthlyBtn.setAttribute('data-type', type);
        moveToMonthlyBtn.setAttribute('data-id', id);
    } else {
        moveToMonthlyBtn.style.display = 'none';
    }
    
    // Set up go to button
    goToBtn.onclick = () => {
        closeModal('reminderDetailModal');
        if (pageToGo) {
            showPage(pageToGo);
            if (tabToSwitch) {
                setTimeout(() => {
                    switchTab(tabToSwitch);
                    const action = goToBtn.getAttribute('data-action');
                    if (action) {
                        setTimeout(() => {
                            eval(action);
                        }, 300);
                    }
                }, 400);
            } else {
                const action = goToBtn.getAttribute('data-action');
                if (action) {
                    setTimeout(() => {
                        eval(action);
                    }, 400);
                }
            }
        }
    };
    
    // Set up move to monthly button
    moveToMonthlyBtn.onclick = () => {
        const moveType = moveToMonthlyBtn.getAttribute('data-type');
        const moveId = moveToMonthlyBtn.getAttribute('data-id');
        moveReminderToMonthly(moveType, moveId);
    };
    
    openModal('reminderDetailModal');
}

// Move Reminder to Monthly Cake
function moveReminderToMonthly(type, id) {
    const monthly = getAgentData(STORAGE_KEYS.MONTHLY);
    
    let monthlyItem = null;
    
    if (type === 'marketable') {
        // 从Family Tree转移到Monthly Cake
        const family = getAgentData(STORAGE_KEYS.FAMILY);
        const member = family.find(f => f.id === id);
        
        if (!member) {
            showNotification('记录未找到', 'error');
            return;
        }
        
        // 检查是否已存在
        const existing = monthly.find(m => m.name === member.name && m.sourceType === 'marketable' && m.sourceId === id);
        if (existing) {
            showNotification('该记录已存在于Monthly Cake Counting中', 'warning');
            closeModal('reminderDetailModal');
            showPage('customers');
            setTimeout(() => {
                switchTab('monthly');
                setTimeout(() => {
                    openMonthlyModal(existing.id);
                }, 300);
            }, 400);
            return;
        }
        
        // 创建Monthly Cake记录
        const now = new Date();
        const appointmentDate = new Date(now);
        appointmentDate.setDate(now.getDate() + 7); // 默认7天后预约
        
        monthlyItem = {
            id: Date.now().toString(),
            name: member.name,
            policyType: '待定', // 默认值，用户可以后续修改
            premium: 0,
            appointment: appointmentDate.toISOString(),
            outcome: '',
            sourceType: 'marketable',
            sourceId: id,
            createdAt: new Date().toISOString()
        };
        
    } else if (type === 'kiv') {
        // 从KIV转移到Monthly Cake
        const kiv = getAgentData(STORAGE_KEYS.KIV);
        const kivItem = kiv.find(k => k.id === id);
        
        if (!kivItem) {
            showNotification('记录未找到', 'error');
            return;
        }
        
        // 检查是否已存在
        const existing = monthly.find(m => m.name === kivItem.name && m.sourceType === 'kiv' && m.sourceId === id);
        if (existing) {
            showNotification('该记录已存在于Monthly Cake Counting中', 'warning');
            closeModal('reminderDetailModal');
            showPage('customers');
            setTimeout(() => {
                switchTab('monthly');
                setTimeout(() => {
                    openMonthlyModal(existing.id);
                }, 300);
            }, 400);
            return;
        }
        
        // 创建Monthly Cake记录
        const nextMeeting = new Date(kivItem.nextMeeting);
        
        monthlyItem = {
            id: Date.now().toString(),
            name: kivItem.name,
            policyType: kivItem.policyType || '待定',
            premium: parseFloat(kivItem.premium || 0),
            appointment: nextMeeting.toISOString(),
            outcome: '',
            sourceType: 'kiv',
            sourceId: id,
            createdAt: new Date().toISOString()
        };
    }
    
    if (monthlyItem) {
        // 确认操作
        if (confirm(`确定要将"${monthlyItem.name}"转移到Monthly Cake Counting作为本月目标人群吗？`)) {
            monthly.push(monthlyItem);
            saveAgentData(STORAGE_KEYS.MONTHLY, monthly);
            
            // 更新相关列表
            loadMonthly();
            updateReminders();
            updateCalendar();
            
            // 关闭模态框并跳转到Monthly Cake页面
            closeModal('reminderDetailModal');
            showNotification('已成功转移到Monthly Cake Counting', 'success');
            showPage('customers');
            setTimeout(() => {
                switchTab('monthly');
                setTimeout(() => {
                    openMonthlyModal(monthlyItem.id);
                }, 300);
            }, 400);
        }
    }
}

// Load All Data
function loadAllData() {
    loadGoals();
    loadCustomers();
    loadFamilyTree();
    loadKIV();
    loadMonthly();
    updateReminders();
}

// Notification System
function showNotification(message, type = 'info') {
    // Simple alert for now - can be enhanced with a toast notification system
    const colors = {
        success: '#27AE60',
        error: '#E74C3C',
        info: '#3498DB',
        warning: '#F39C12'
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Tools Management
let toolsSetup = false;

function setupTools() {
    // Only setup once
    if (toolsSetup) {
        // Just show first tool if already setup
        const firstTool = document.querySelector('.tool-item');
        if (firstTool && !firstTool.classList.contains('active')) {
            const tool = firstTool.getAttribute('data-tool');
            switchTool(tool);
        }
        return;
    }
    
    toolsSetup = true;
    
    // Tool sidebar navigation
    document.querySelectorAll('.tool-item').forEach(item => {
        item.addEventListener('click', () => {
            const tool = item.getAttribute('data-tool');
            switchTool(tool);
        });
    });

    // Calculator
    document.getElementById('openCalculatorBtn')?.addEventListener('click', openCalculator);
    document.getElementById('calculatorCloseBtn')?.addEventListener('click', closeCalculator);
    document.getElementById('calculatorMinimizeBtn')?.addEventListener('click', minimizeCalculator);
    setupCalculatorButtons();

    // BMI Calculator
    document.getElementById('calculateBMIBtn')?.addEventListener('click', calculateBMI);

    // Life Value Calculator
    document.getElementById('calculateLifeValueBtn')?.addEventListener('click', calculateLifeValue);

    // Show first tool by default
    const firstTool = document.querySelector('.tool-item');
    if (firstTool) {
        const tool = firstTool.getAttribute('data-tool');
        switchTool(tool);
    }
}

function switchTool(tool) {
    // Hide all tool panels
    document.querySelectorAll('.tool-panel').forEach(panel => {
        panel.style.display = 'none';
    });
    
    // Remove active class from all tool items
    document.querySelectorAll('.tool-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected tool panel
    const selectedPanel = document.getElementById(`${tool}-tool`);
    if (selectedPanel) {
        selectedPanel.style.display = 'block';
    }
    
    // Add active class to selected tool item
    const selectedItem = document.querySelector(`.tool-item[data-tool="${tool}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }
    
    // Load sync/backup status when switching to those tools
    if (tool === 'sync') {
        loadSyncStatus();
    } else if (tool === 'backup') {
        loadBackupStatus();
    } else if (tool === 'check') {
        // Reset check results when switching to check tool
        const resultsDiv = document.getElementById('checkResults');
        const fixBtn = document.getElementById('fixDataBtn');
        if (resultsDiv) resultsDiv.style.display = 'none';
        if (fixBtn) fixBtn.style.display = 'none';
    }
}

// Calculator Functions
let calculatorState = {
    display: '0',
    previousValue: null,
    operation: null,
    waitingForNewValue: false
};

function openCalculator() {
    const calculatorWindow = document.getElementById('calculatorWindow');
    calculatorWindow.style.display = 'block';
    calculatorWindow.style.left = '50%';
    calculatorWindow.style.top = '50%';
    calculatorWindow.style.transform = 'translate(-50%, -50%)';
    makeCalculatorDraggable();
    makeCalculatorResizable();
}

function closeCalculator() {
    document.getElementById('calculatorWindow').style.display = 'none';
    calculatorState = {
        display: '0',
        previousValue: null,
        operation: null,
        waitingForNewValue: false
    };
    updateCalculatorDisplay();
}

function minimizeCalculator() {
    const calculatorWindow = document.getElementById('calculatorWindow');
    calculatorWindow.classList.toggle('minimized');
}

// Store button click handlers to allow removal
const calculatorButtonHandlers = new Map();

function setupCalculatorButtons() {
    const buttons = document.querySelectorAll('.calculator-btn');
    buttons.forEach(button => {
        // Remove existing event listener if any
        const existingHandler = calculatorButtonHandlers.get(button);
        if (existingHandler) {
            button.removeEventListener('click', existingHandler);
        }
        
        // Create new handler
        const handler = () => {
            const value = button.getAttribute('data-value');
            const action = button.getAttribute('data-action');
            
            if (value !== null) {
                inputNumber(value);
            } else if (action) {
                handleCalculatorAction(action);
            }
        };
        
        // Store handler and add event listener
        calculatorButtonHandlers.set(button, handler);
        button.addEventListener('click', handler);
    });
}

function inputNumber(num) {
    const { display, waitingForNewValue } = calculatorState;
    
    if (waitingForNewValue) {
        calculatorState.display = num;
        calculatorState.waitingForNewValue = false;
    } else {
        // 限制最大输入长度，避免显示溢出
        if (display.length >= 15) return;
        
        if (display === '0' && num !== '.') {
            calculatorState.display = num;
        } else {
            calculatorState.display = display + num;
        }
    }
    
    updateCalculatorDisplay();
}

function handleCalculatorAction(action) {
    const { display, previousValue, operation } = calculatorState;
    const inputValue = parseFloat(display) || 0;

    switch (action) {
        case 'clear':
            calculatorState = {
                display: '0',
                previousValue: null,
                operation: null,
                waitingForNewValue: false
            };
            break;
        case 'clearEntry':
            calculatorState.display = '0';
            calculatorState.waitingForNewValue = false;
            break;
        case 'backspace':
            if (display.length > 1 && !calculatorState.waitingForNewValue) {
                calculatorState.display = display.slice(0, -1);
            } else {
                calculatorState.display = '0';
            }
            break;
        case 'decimal':
            if (calculatorState.waitingForNewValue) {
                calculatorState.display = '0.';
                calculatorState.waitingForNewValue = false;
            } else if (!display.includes('.')) {
                calculatorState.display = display + '.';
            }
            break;
        case 'add':
        case 'subtract':
        case 'multiply':
        case 'divide':
            if (previousValue === null) {
                calculatorState.previousValue = inputValue;
            } else if (operation && !waitingForNewValue) {
                // 如果已经有操作符和值，先计算结果
                const result = calculate(previousValue, inputValue, operation);
                calculatorState.display = formatNumber(result);
                calculatorState.previousValue = result;
            }
            calculatorState.operation = action;
            calculatorState.waitingForNewValue = true;
            break;
        case 'equals':
            if (previousValue !== null && operation) {
                const result = calculate(previousValue, inputValue, operation);
                calculatorState.display = formatNumber(result);
                calculatorState.previousValue = null;
                calculatorState.operation = null;
                calculatorState.waitingForNewValue = true;
            }
            break;
    }
    
    updateCalculatorDisplay();
}

function calculate(firstValue, secondValue, operation) {
    let result;
    
    switch (operation) {
        case 'add':
            result = firstValue + secondValue;
            break;
        case 'subtract':
            result = firstValue - secondValue;
            break;
        case 'multiply':
            result = firstValue * secondValue;
            break;
        case 'divide':
            if (secondValue === 0) {
                return 'Error';
            }
            result = firstValue / secondValue;
            break;
        default:
            return secondValue;
    }
    
    // 处理浮点数精度问题
    if (typeof result === 'number') {
        // 使用toFixed然后parseFloat来避免浮点数误差
        const rounded = Math.round(result * 100000000) / 100000000;
        return rounded;
    }
    
    return result;
}

function formatNumber(num) {
    if (num === 'Error' || num === Infinity || num === -Infinity || isNaN(num)) {
        return 'Error';
    }
    
    // 转换为字符串
    let str = String(num);
    
    // 如果是科学计数法，转换为普通数字
    if (str.includes('e') || str.includes('E')) {
        str = num.toFixed(10).replace(/\.?0+$/, '');
    }
    
    // 处理小数点后的尾随零
    if (str.includes('.')) {
        str = str.replace(/\.?0+$/, '');
    }
    
    // 限制显示长度
    if (str.length > 15) {
        // 如果是小数，保留更多精度
        if (str.includes('.')) {
            const parts = str.split('.');
            const integerPart = parts[0];
            const decimalPart = parts[1];
            
            if (integerPart.length >= 15) {
                return 'Error';
            }
            
            const maxDecimal = 15 - integerPart.length - 1;
            str = num.toFixed(Math.min(maxDecimal, 10));
            str = str.replace(/\.?0+$/, '');
        } else {
            return 'Error';
        }
    }
    
    return str;
}

function updateCalculatorDisplay() {
    const display = document.getElementById('calculatorDisplay');
    if (display) {
        const displayValue = calculatorState.display;
        
        // 如果显示值太长，调整字体大小
        if (displayValue.length > 10) {
            display.style.fontSize = 'clamp(16px, 3vh, 36px)';
        } else if (displayValue.length > 8) {
            display.style.fontSize = 'clamp(18px, 4vh, 42px)';
        } else {
            display.style.fontSize = 'clamp(20px, 5vh, 48px)';
        }
        
        display.textContent = displayValue;
    }
}

function makeCalculatorDraggable() {
    const calculatorWindow = document.getElementById('calculatorWindow');
    const header = calculatorWindow.querySelector('.calculator-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        if (e.target.closest('.calculator-controls')) return;
        
        initialX = e.clientX - calculatorWindow.offsetLeft;
        initialY = e.clientY - calculatorWindow.offsetTop;

        if (e.target === header || header.contains(e.target)) {
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            calculatorWindow.style.left = currentX + 'px';
            calculatorWindow.style.top = currentY + 'px';
            calculatorWindow.style.transform = 'none';
        }
    }

    function dragEnd() {
        isDragging = false;
    }
}

function makeCalculatorResizable() {
    const calculatorWindow = document.getElementById('calculatorWindow');
    const resizeHandle = calculatorWindow.querySelector('.calculator-resize-handle');
    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(document.defaultView.getComputedStyle(calculatorWindow).width, 10);
        startHeight = parseInt(document.defaultView.getComputedStyle(calculatorWindow).height, 10);
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const width = startWidth + e.clientX - startX;
        const height = startHeight + e.clientY - startY;
        
        calculatorWindow.style.width = Math.max(280, width) + 'px';
        calculatorWindow.style.height = Math.max(400, height) + 'px';
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
    });
}

// BMI Calculator
function calculateBMI() {
    const height = parseFloat(document.getElementById('bmiHeight').value);
    const weight = parseFloat(document.getElementById('bmiWeight').value);

    if (!height || !weight || height <= 0 || weight <= 0) {
        showNotification('请输入有效的身高和体重', 'error');
        return;
    }

    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    const roundedBMI = bmi.toFixed(1);

    let status, statusClass;
    if (bmi < 16) {
        status = '严重偏瘦';
        statusClass = 'bmi-severely-underweight';
    } else if (bmi < 18.5) {
        status = '偏瘦';
        statusClass = 'bmi-underweight';
    } else if (bmi < 25) {
        status = '正常';
        statusClass = 'bmi-normal';
    } else if (bmi < 30) {
        status = '超重';
        statusClass = 'bmi-overweight';
    } else if (bmi < 35) {
        status = '肥胖';
        statusClass = 'bmi-obese';
    } else if (bmi < 40) {
        status = '中度肥胖';
        statusClass = 'bmi-severely-obese';
    } else {
        status = '超重肥胖';
        statusClass = 'bmi-extremely-obese';
    }

    document.getElementById('bmiValue').textContent = roundedBMI;
    const statusElement = document.getElementById('bmiStatus');
    statusElement.textContent = status;
    statusElement.className = `bmi-status ${statusClass}`;
    document.getElementById('bmiResult').style.display = 'block';
}

// Life Value Calculator
function addExpenseItem(listId) {
    const list = document.getElementById(listId);
    const item = document.createElement('div');
    item.className = 'expense-item';
    item.innerHTML = `
        <input type="text" class="expense-name" placeholder="名称">
        <input type="number" class="expense-amount" placeholder="金额 (RM)" step="0.01" min="0">
        <button class="btn-remove-expense" onclick="removeExpenseItem(this)"><i class="fas fa-times"></i></button>
    `;
    list.appendChild(item);
}

function removeExpenseItem(button) {
    button.closest('.expense-item').remove();
}

function calculateLifeValue() {
    // Calculate debts
    let totalDebt = 0;
    const debtItems = document.querySelectorAll('#debtList .expense-item');
    const debtBreakdown = [];
    debtItems.forEach(item => {
        const name = item.querySelector('.expense-name').value || '未命名债务';
        const amount = parseFloat(item.querySelector('.expense-amount').value) || 0;
        if (amount > 0) {
            totalDebt += amount;
            debtBreakdown.push({ name, amount });
        }
    });

    // Calculate other expenses
    const educationExpense = parseFloat(document.getElementById('educationExpense').value) || 0;
    const personalExpense = parseFloat(document.getElementById('personalExpense').value) || 0;
    const familyExpense = parseFloat(document.getElementById('familyExpense').value) || 0;

    let totalOther = 0;
    const otherItems = document.querySelectorAll('#otherExpenseList .expense-item');
    const otherBreakdown = [];
    otherItems.forEach(item => {
        const name = item.querySelector('.expense-name').value || '未命名费用';
        const amount = parseFloat(item.querySelector('.expense-amount').value) || 0;
        if (amount > 0) {
            totalOther += amount;
            otherBreakdown.push({ name, amount });
        }
    });

    const total = totalDebt + educationExpense + personalExpense + familyExpense + totalOther;

    // Display results
    document.getElementById('lifeValueTotal').textContent = `RM ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const breakdown = document.getElementById('lifeValueBreakdown');
    breakdown.innerHTML = '';
    
    if (debtBreakdown.length > 0) {
        const debtSection = document.createElement('div');
        debtSection.className = 'breakdown-section';
        debtSection.innerHTML = '<h4>债务明细:</h4>';
        debtBreakdown.forEach(item => {
            const row = document.createElement('div');
            row.className = 'breakdown-row';
            row.innerHTML = `<span>${item.name}:</span><span>RM ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
            debtSection.appendChild(row);
        });
        breakdown.appendChild(debtSection);
    }

    if (educationExpense > 0 || personalExpense > 0 || familyExpense > 0 || otherBreakdown.length > 0) {
        const expenseSection = document.createElement('div');
        expenseSection.className = 'breakdown-section';
        expenseSection.innerHTML = '<h4>费用明细:</h4>';
        
        if (educationExpense > 0) {
            const row = document.createElement('div');
            row.className = 'breakdown-row';
            row.innerHTML = `<span>孩子教育费:</span><span>RM ${educationExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
            expenseSection.appendChild(row);
        }
        
        if (personalExpense > 0) {
            const row = document.createElement('div');
            row.className = 'breakdown-row';
            row.innerHTML = `<span>个人生活费:</span><span>RM ${personalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
            expenseSection.appendChild(row);
        }
        
        if (familyExpense > 0) {
            const row = document.createElement('div');
            row.className = 'breakdown-row';
            row.innerHTML = `<span>家庭费用:</span><span>RM ${familyExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
            expenseSection.appendChild(row);
        }
        
        otherBreakdown.forEach(item => {
            const row = document.createElement('div');
            row.className = 'breakdown-row';
            row.innerHTML = `<span>${item.name}:</span><span>RM ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
            expenseSection.appendChild(row);
        });
        
        breakdown.appendChild(expenseSection);
    }

    document.getElementById('lifeValueResult').style.display = 'block';
}

// Quadrant Management
function setupQuadrant() {
    // Tab switching
    document.querySelectorAll('.quadrant-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchQuadrantTab(tab);
        });
    });
    
    // Preparation month change
    document.getElementById('preparationMonth')?.addEventListener('change', (e) => {
        updatePreparationData(e.target.value);
    });
    
    // Preparation save
    document.getElementById('savePreparationBtn')?.addEventListener('click', savePreparationData);
    
    // Action save
    document.getElementById('saveActionBtn')?.addEventListener('click', saveActionData);
    
    // Strategy save
    document.getElementById('saveStrategyBtn')?.addEventListener('click', saveStrategyData);
    
    // Motivation save
    document.getElementById('saveMotivationBtn')?.addEventListener('click', saveMotivationData);
    
    // Update button
    document.getElementById('updateQuadrantBtn')?.addEventListener('click', updateQuadrantData);
    
    // Export button
    document.getElementById('exportQuadrantBtn')?.addEventListener('click', exportQuadrantPNG);
    
    // Load existing data
    loadQuadrantData();
    updateProspectsList();
    updateMotivationGoals();
    
    // Set default month to current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const preparationMonthInput = document.getElementById('preparationMonth');
    const actionMonthInput = document.getElementById('actionMonth');
    if (preparationMonthInput && !preparationMonthInput.value) {
        preparationMonthInput.value = currentMonth;
    }
    if (actionMonthInput && !actionMonthInput.value) {
        actionMonthInput.value = currentMonth;
    }
    
    // Initialize with current month data
    if (preparationMonthInput && preparationMonthInput.value) {
        updatePreparationData(preparationMonthInput.value);
    }
}

function switchQuadrantTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.quadrant-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tab) {
            btn.classList.add('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.quadrant-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    const targetTab = document.getElementById(`${tab}-tab`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

function updatePreparationData(month) {
    if (!month) return;
    
    const monthly = getAgentData(STORAGE_KEYS.MONTHLY);
    const [year, monthNum] = month.split('-');
    
    // Filter monthly data for the selected month
    const monthData = monthly.filter(item => {
        const appointmentDate = new Date(item.appointment);
        return appointmentDate.getFullYear() == year && 
               (appointmentDate.getMonth() + 1) == monthNum;
    });
    
    // Calculate total premium
    const totalPremium = monthData.reduce((sum, item) => {
        return sum + (parseFloat(item.premium) || 0);
    }, 0);
    
    // Update display
    document.getElementById('totalPremium').textContent = `RM ${totalPremium.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('preparationAmount').textContent = `RM ${totalPremium.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('preparationMonthDisplay').textContent = formatMonth(month);
    
    // Load preparation inventory if exists
    const quadrantData = getQuadrantData();
    if (quadrantData.preparation && quadrantData.preparation[month]) {
        document.getElementById('preparationInventory').value = quadrantData.preparation[month].inventory || '';
        updatePreparationDisplay(quadrantData.preparation[month]);
    }
    
    // Update center month
    updateCenterMonth(month);
}

function formatMonth(month) {
    if (!month) return '-';
    const [year, monthNum] = month.split('-');
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    return `${year}年${monthNames[parseInt(monthNum) - 1]}`;
}

function savePreparationData() {
    const month = document.getElementById('preparationMonth').value;
    const inventory = document.getElementById('preparationInventory').value;
    
    if (!month) {
        showNotification('请选择月份', 'error');
        return;
    }
    
    const quadrantData = getQuadrantData();
    quadrantData.preparation = quadrantData.preparation || {};
    quadrantData.preparation[month] = {
        month,
        inventory,
        updatedAt: new Date().toISOString()
    };
    
    saveQuadrantData(quadrantData);
    updatePreparationDisplay(quadrantData.preparation[month]);
    updateCenterMonth(month);
    showNotification('筹备数据已保存', 'success');
}

function updatePreparationDisplay(preparationData) {
    if (!preparationData) return;
    
    document.getElementById('preparationInventoryDisplay').textContent = preparationData.inventory || '';
}

function saveActionData() {
    const month = document.getElementById('actionMonth').value;
    const week = document.getElementById('actionWeek').value;
    const noa = parseInt(document.getElementById('noaInput').value) || 0;
    const nop = parseInt(document.getElementById('nopInput').value) || 0;
    const noc = parseInt(document.getElementById('nocInput').value) || 0;
    const nor = parseInt(document.getElementById('norInput').value) || 0;
    const method = document.getElementById('actionMethod').value;
    
    if (!month) {
        showNotification('请选择目标月份', 'error');
        return;
    }
    
    const quadrantData = getQuadrantData();
    const key = `${month}-${week || 'all'}`;
    
    quadrantData.action = quadrantData.action || {};
    quadrantData.action[key] = {
        month,
        week,
        noa,
        nop,
        noc,
        nor,
        method,
        updatedAt: new Date().toISOString()
    };
    
    saveQuadrantData(quadrantData);
    updateActionDisplay(quadrantData.action[key]);
    updateCenterMonth(month);
    showNotification('行动数据已保存', 'success');
}

function saveStrategyData() {
    const worker = parseInt(document.getElementById('strategyWorker').value) || 0;
    const student = parseInt(document.getElementById('strategyStudent').value) || 0;
    const family = parseInt(document.getElementById('strategyFamily').value) || 0;
    const homeVisit = parseInt(document.getElementById('strategyHomeVisit').value) || 0;
    const direction = document.getElementById('strategyDirection').value;
    
    const quadrantData = getQuadrantData();
    const month = document.getElementById('actionMonth').value || 
                  document.getElementById('preparationMonth').value ||
                  `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    
    quadrantData.strategy = quadrantData.strategy || {};
    quadrantData.strategy[month] = {
        worker,
        student,
        family,
        homeVisit,
        direction,
        updatedAt: new Date().toISOString()
    };
    
    saveQuadrantData(quadrantData);
    updateStrategyDisplay(quadrantData.strategy[month]);
    updateCenterMonth(month);
    showNotification('策略数据已保存', 'success');
}

function saveMotivationData() {
    const source = document.getElementById('motivationSource').value;
    
    const quadrantData = getQuadrantData();
    const month = document.getElementById('actionMonth').value || 
                  document.getElementById('preparationMonth').value ||
                  `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    
    quadrantData.motivation = quadrantData.motivation || {};
    quadrantData.motivation[month] = {
        source,
        updatedAt: new Date().toISOString()
    };
    
    saveQuadrantData(quadrantData);
    updateMotivationDisplay(quadrantData.motivation[month]);
    updateCenterMonth(month);
    showNotification('动力数据已保存', 'success');
}

function updateMotivationDisplay(motivationData) {
    if (!motivationData) return;
    
    document.getElementById('motivationSourceDisplay').textContent = motivationData.source || '';
}

function updateProspectsList() {
    const family = getAgentData(STORAGE_KEYS.FAMILY);
    const prospects = family.filter(f => !f.isExistingCustomer);
    const container = document.getElementById('prospectsList');
    
    if (prospects.length === 0) {
        container.innerHTML = '<div class="prospect-item"><div class="prospect-item-details">暂无可开发的市场</div></div>';
        return;
    }
    
    container.innerHTML = prospects.map(member => `
        <div class="prospect-item">
            <div class="prospect-item-name">${member.name}</div>
            <div class="prospect-item-details">关系: ${member.relationship} | ${member.phone ? `电话: ${member.phone}` : '无电话'}</div>
        </div>
    `).join('');
}

function updateMotivationGoals() {
    const goals = getAgentData(STORAGE_KEYS.GOALS);
    const now = new Date();
    const activeGoals = goals.filter(g => {
        const dueDate = new Date(g.dueDate);
        return g.current < g.amount && dueDate >= now;
    });
    
    const inputContainer = document.getElementById('motivationGoalsList');
    const displayContainer = document.getElementById('motivationGoalsDisplay');
    
    if (activeGoals.length === 0) {
        inputContainer.innerHTML = '<div class="motivation-goal-item"><div class="motivation-goal-progress">暂无未完成的目标</div></div>';
        displayContainer.innerHTML = '<div class="motivation-goal-display-item"><div class="motivation-goal-display-progress">暂无未完成的目标</div></div>';
        return;
    }
    
    inputContainer.innerHTML = activeGoals.map(goal => {
        const distance = goal.amount - goal.current;
        const dueDate = new Date(goal.dueDate);
        const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        return `
            <div class="motivation-goal-item">
                <div class="motivation-goal-title">${goal.title}</div>
                <div class="motivation-goal-progress">距离目标: RM ${distance.toLocaleString()} | 到期: ${dueDate.toLocaleDateString('zh-CN')} (${daysLeft}天)</div>
            </div>
        `;
    }).join('');
    
    displayContainer.innerHTML = activeGoals.map(goal => {
        const distance = goal.amount - goal.current;
        const dueDate = new Date(goal.dueDate);
        const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        return `
            <div class="motivation-goal-display-item">
                <div class="motivation-goal-display-title">${goal.title}</div>
                <div class="motivation-goal-display-progress">距离: RM ${distance.toLocaleString()} | ${daysLeft}天</div>
            </div>
        `;
    }).join('');
}

function updateActionDisplay(actionData) {
    if (!actionData) return;
    
    document.getElementById('displayNOA').textContent = actionData.noa || 0;
    document.getElementById('displayNOP').textContent = actionData.nop || 0;
    document.getElementById('displayNOC').textContent = actionData.noc || 0;
    document.getElementById('displayNOR').textContent = actionData.nor || 0;
    document.getElementById('actionMethodDisplay').textContent = actionData.method || '';
}

function updateStrategyDisplay(strategyData) {
    if (!strategyData) return;
    
    document.getElementById('displayWorker').textContent = strategyData.worker || 0;
    document.getElementById('displayStudent').textContent = strategyData.student || 0;
    document.getElementById('displayFamily').textContent = strategyData.family || 0;
    document.getElementById('displayHomeVisit').textContent = strategyData.homeVisit || 0;
    document.getElementById('displayStrategyDirection').textContent = strategyData.direction || '';
}

function updateCenterMonth(month) {
    if (!month) return;
    
    document.getElementById('centerMonth').textContent = formatMonth(month);
    
    const quadrantData = getQuadrantData();
    const updateTime = quadrantData.lastUpdate || new Date().toISOString();
    const updateDate = new Date(updateTime);
    document.getElementById('updateTime').textContent = `更新: ${updateDate.toLocaleDateString('zh-CN')} ${updateDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
}

function updateQuadrantData() {
    const month = document.getElementById('preparationMonth').value || 
                  document.getElementById('actionMonth').value ||
                  `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    
    updatePreparationData(month);
    updateProspectsList();
    updateMotivationGoals();
    
    const quadrantData = getQuadrantData();
    if (quadrantData.preparation) {
        const latestPreparation = Object.values(quadrantData.preparation).sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
        )[0];
        if (latestPreparation) {
            updatePreparationDisplay(latestPreparation);
        }
    }
    
    if (quadrantData.action) {
        const latestAction = Object.values(quadrantData.action).sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
        )[0];
        if (latestAction) {
            updateActionDisplay(latestAction);
        }
    }
    
    if (quadrantData.strategy) {
        const latestStrategy = Object.values(quadrantData.strategy).sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
        )[0];
        if (latestStrategy) {
            updateStrategyDisplay(latestStrategy);
        }
    }
    
    if (quadrantData.motivation) {
        const latestMotivation = Object.values(quadrantData.motivation).sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
        )[0];
        if (latestMotivation) {
            updateMotivationDisplay(latestMotivation);
        }
    }
    
    quadrantData.lastUpdate = new Date().toISOString();
    saveQuadrantData(quadrantData);
    updateCenterMonth(month);
    
    showNotification('数据已更新', 'success');
}

function loadQuadrantData() {
    const quadrantData = getQuadrantData();
    
    // Load action data
    if (quadrantData.action) {
        const latestAction = Object.values(quadrantData.action).sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
        )[0];
        if (latestAction) {
            document.getElementById('actionMonth').value = latestAction.month || '';
            document.getElementById('actionWeek').value = latestAction.week || '';
            document.getElementById('noaInput').value = latestAction.noa || '';
            document.getElementById('nopInput').value = latestAction.nop || '';
            document.getElementById('nocInput').value = latestAction.noc || '';
            document.getElementById('norInput').value = latestAction.nor || '';
            document.getElementById('actionMethod').value = latestAction.method || '';
            updateActionDisplay(latestAction);
        }
    }
    
    // Load strategy data
    if (quadrantData.strategy) {
        const latestStrategy = Object.values(quadrantData.strategy).sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
        )[0];
        if (latestStrategy) {
            document.getElementById('strategyWorker').value = latestStrategy.worker || '';
            document.getElementById('strategyStudent').value = latestStrategy.student || '';
            document.getElementById('strategyFamily').value = latestStrategy.family || '';
            document.getElementById('strategyHomeVisit').value = latestStrategy.homeVisit || '';
            document.getElementById('strategyDirection').value = latestStrategy.direction || '';
            updateStrategyDisplay(latestStrategy);
        }
    }
    
    // Load preparation data
    if (quadrantData.preparation) {
        const latestPreparation = Object.values(quadrantData.preparation).sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
        )[0];
        if (latestPreparation) {
            document.getElementById('preparationInventory').value = latestPreparation.inventory || '';
            updatePreparationDisplay(latestPreparation);
        }
    }
    
    // Load motivation data
    if (quadrantData.motivation) {
        const latestMotivation = Object.values(quadrantData.motivation).sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
        )[0];
        if (latestMotivation) {
            document.getElementById('motivationSource').value = latestMotivation.source || '';
            updateMotivationDisplay(latestMotivation);
        }
    }
    
    // Update center month
    const month = document.getElementById('actionMonth').value || 
                  document.getElementById('preparationMonth').value;
    if (month) {
        updateCenterMonth(month);
    }
}

function getQuadrantData() {
    return getAgentData(STORAGE_KEYS.QUADRANT) || {};
}

function saveQuadrantData(data) {
    data.lastUpdate = new Date().toISOString();
    saveAgentData(STORAGE_KEYS.QUADRANT, data);
}

function exportQuadrantPNG() {
    const grid = document.getElementById('quadrantGrid');
    if (!grid) {
        showNotification('无法找到四宫格内容', 'error');
        return;
    }
    
    // Use html2canvas library if available, otherwise use native canvas
    if (typeof html2canvas !== 'undefined') {
        html2canvas(grid, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false,
            useCORS: true
        }).then(canvas => {
            downloadCanvas(canvas, '四宫格.png');
        }).catch(err => {
            console.error('Export error:', err);
            showNotification('导出失败，请重试', 'error');
        });
    } else {
        // Fallback: create a simple canvas representation
        createQuadrantCanvas();
    }
}

function createQuadrantCanvas() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = 1200;
    const height = 1200;
    canvas.width = width;
    canvas.height = height;
    
    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid lines
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 4;
    ctx.strokeRect(50, 50, width - 100, height - 100);
    ctx.beginPath();
    ctx.moveTo(width / 2, 50);
    ctx.lineTo(width / 2, height - 50);
    ctx.moveTo(50, height / 2);
    ctx.lineTo(width - 50, height / 2);
    ctx.stroke();
    
    // Draw text (simplified)
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    
    // Top Left - Preparation
    ctx.fillText('筹备', width / 4, 150);
    const prepAmount = document.getElementById('preparationAmount')?.textContent || 'RM 0.00';
    ctx.font = '36px Arial';
    ctx.fillText(prepAmount, width / 4, 250);
    
    // Top Right - Action
    ctx.font = 'bold 48px Arial';
    ctx.fillText('行动', width * 3 / 4, 150);
    ctx.font = '24px Arial';
    const noa = document.getElementById('displayNOA')?.textContent || '0';
    const nop = document.getElementById('displayNOP')?.textContent || '0';
    const noc = document.getElementById('displayNOC')?.textContent || '0';
    const nor = document.getElementById('displayNOR')?.textContent || '0';
    ctx.fillText(`NOA: ${noa}`, width * 3 / 4, 250);
    ctx.fillText(`NOP: ${nop}`, width * 3 / 4, 300);
    ctx.fillText(`NOC: ${noc}`, width * 3 / 4, 350);
    ctx.fillText(`NOR: ${nor}`, width * 3 / 4, 400);
    
    // Bottom Left - Strategy
    ctx.font = 'bold 48px Arial';
    ctx.fillText('策略', width / 4, height - 400);
    ctx.font = '24px Arial';
    const worker = document.getElementById('displayWorker')?.textContent || '0';
    const student = document.getElementById('displayStudent')?.textContent || '0';
    const family = document.getElementById('displayFamily')?.textContent || '0';
    const homeVisit = document.getElementById('displayHomeVisit')?.textContent || '0';
    ctx.fillText(`打工: ${worker}`, width / 4, height - 300);
    ctx.fillText(`学生: ${student}`, width / 4, height - 250);
    ctx.fillText(`家庭: ${family}`, width / 4, height - 200);
    ctx.fillText(`Home Visit: ${homeVisit}`, width / 4, height - 150);
    
    // Bottom Right - Motivation
    ctx.font = 'bold 48px Arial';
    ctx.fillText('动力', width * 3 / 4, height - 400);
    
    // Center
    ctx.fillStyle = '#FF6B35';
    ctx.fillRect(width / 2 - 100, height / 2 - 80, 200, 160);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('月份', width / 2, height / 2 - 20);
    const month = document.getElementById('centerMonth')?.textContent || '-';
    ctx.font = 'bold 40px Arial';
    ctx.fillText(month, width / 2, height / 2 + 30);
    
    downloadCanvas(canvas, '四宫格.png');
}

function downloadCanvas(canvas, filename) {
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('导出成功', 'success');
    });
}

// Data Sync and Backup Functions
let syncIntervalId = null;
let backupIntervalId = null;

const SYNC_SETTINGS_KEY = 'mgr_sync_settings';
const BACKUP_SETTINGS_KEY = 'mgr_backup_settings';

function getSyncSettings() {
    return JSON.parse(localStorage.getItem(SYNC_SETTINGS_KEY) || '{"enabled": false, "interval": 600000}');
}

function saveSyncSettings(settings) {
    localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(settings));
}

function getBackupSettings() {
    return JSON.parse(localStorage.getItem(BACKUP_SETTINGS_KEY) || '{"enabled": false, "interval": 86400000}');
}

function saveBackupSettings(settings) {
    localStorage.setItem(BACKUP_SETTINGS_KEY, JSON.stringify(settings));
}

function isAutoSyncEnabled() {
    return getSyncSettings().enabled;
}

function isAutoBackupEnabled() {
    return getBackupSettings().enabled;
}

function toggleAutoSync(enabled) {
    const settings = getSyncSettings();
    settings.enabled = enabled;
    saveSyncSettings(settings);
    
    if (enabled) {
        startAutoSync();
        showNotification('自动同步已启用', 'success');
    } else {
        stopAutoSync();
        showNotification('自动同步已禁用', 'info');
    }
    loadSyncStatus();
}

function toggleAutoBackup(enabled) {
    const settings = getBackupSettings();
    settings.enabled = enabled;
    saveBackupSettings(settings);
    
    if (enabled) {
        startAutoBackup();
        showNotification('自动备份已启用', 'success');
    } else {
        stopAutoBackup();
        showNotification('自动备份已禁用', 'info');
    }
    loadBackupStatus();
}

function startAutoSync() {
    stopAutoSync();
    const settings = getSyncSettings();
    const interval = parseInt(document.getElementById('syncInterval')?.value || settings.interval);
    syncIntervalId = setInterval(() => manualSync(true), interval);
    settings.interval = interval;
    saveSyncSettings(settings);
    manualSync(true);
}

function stopAutoSync() {
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
    }
}

function startAutoBackup() {
    stopAutoBackup();
    const settings = getBackupSettings();
    const interval = parseInt(document.getElementById('backupInterval')?.value || settings.interval);
    backupIntervalId = setInterval(() => manualBackup(true), interval);
    settings.interval = interval;
    saveBackupSettings(settings);
    manualBackup(true);
}

function stopAutoBackup() {
    if (backupIntervalId) {
        clearInterval(backupIntervalId);
        backupIntervalId = null;
    }
}

// IndexedDB 同步辅助函数（降级方案）
function syncToIndexedDB(key, data, agentCode) {
    if ('indexedDB' in window) {
        const request = indexedDB.open('MGR_SyncDB', 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('syncData')) {
                db.createObjectStore('syncData', { keyPath: 'key' });
            }
        };
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['syncData'], 'readwrite');
            const store = transaction.objectStore('syncData');
            store.put({
                key: `${agentCode}_${key}`,
                data: data,
                timestamp: new Date().toISOString()
            });
        };
    }
}

function syncToCloud(key, data, agentCode) {
    // 优先使用 Firebase 云端同步
    if (window.firebaseDatabase) {
        const dataRef = window.firebaseDatabase.ref(`agents/${agentCode}/${key}`);
        dataRef.set({
            data: data,
            timestamp: new Date().toISOString(),
            agentCode: agentCode
        }).then(() => {
            console.log(`数据已同步到云端: ${key}`);
        }).catch((error) => {
            console.error('Firebase 同步失败:', error);
            // 同步失败时降级到 IndexedDB
            syncToIndexedDB(key, data, agentCode);
        });
    } else {
        // 没有 Firebase 时使用 IndexedDB（向后兼容）
        syncToIndexedDB(key, data, agentCode);
    }
    
    // 更新同步信息
    const syncInfo = JSON.parse(localStorage.getItem('mgr_sync_info') || '{}');
    syncInfo[agentCode] = {
        lastSync: new Date().toISOString(),
        keys: syncInfo[agentCode]?.keys || []
    };
    if (!syncInfo[agentCode].keys.includes(key)) {
        syncInfo[agentCode].keys.push(key);
    }
    localStorage.setItem('mgr_sync_info', JSON.stringify(syncInfo));
}

function manualSync(silent = false) {
    const agentCode = getCurrentAgent();
    if (!agentCode) {
        if (!silent) showNotification('请先登录', 'error');
        return;
    }
    if (!silent) showNotification('正在同步数据到云端...', 'info');
    
    // 收集所有需要同步的数据
    const syncPromises = [];
    Object.keys(STORAGE_KEYS).forEach(key => {
        if (key === 'AGENTS' || key === 'CURRENT_AGENT') return;
        const data = getAgentData(STORAGE_KEYS[key]);
        if (window.firebaseDatabase) {
            // 使用 Firebase
            const dataRef = window.firebaseDatabase.ref(`agents/${agentCode}/${STORAGE_KEYS[key]}`);
            syncPromises.push(
                dataRef.set({
                    data: data,
                    timestamp: new Date().toISOString(),
                    agentCode: agentCode
                }).catch((error) => {
                    console.error(`同步 ${STORAGE_KEYS[key]} 失败:`, error);
                    // 失败时降级到 IndexedDB
                    syncToIndexedDB(STORAGE_KEYS[key], data, agentCode);
                })
            );
        } else {
            // 使用 IndexedDB
            syncToIndexedDB(STORAGE_KEYS[key], data, agentCode);
        }
    });
    
    // 等待所有同步完成
    if (window.firebaseDatabase && syncPromises.length > 0) {
        Promise.all(syncPromises).then(() => {
            const syncInfo = JSON.parse(localStorage.getItem('mgr_sync_info') || '{}');
            syncInfo[agentCode] = {
                lastSync: new Date().toISOString(),
                keys: Object.values(STORAGE_KEYS).filter(k => k !== 'AGENTS' && k !== 'CURRENT_AGENT')
            };
            localStorage.setItem('mgr_sync_info', JSON.stringify(syncInfo));
            if (!silent) {
                showNotification('数据同步完成', 'success');
                loadSyncStatus();
            }
        }).catch((error) => {
            console.error('同步过程出错:', error);
            if (!silent) {
                showNotification('部分数据同步失败，请检查网络连接', 'error');
            }
            // 即使出错也更新同步信息
            const syncInfo = JSON.parse(localStorage.getItem('mgr_sync_info') || '{}');
            syncInfo[agentCode] = {
                lastSync: new Date().toISOString(),
                keys: Object.values(STORAGE_KEYS).filter(k => k !== 'AGENTS' && k !== 'CURRENT_AGENT')
            };
            localStorage.setItem('mgr_sync_info', JSON.stringify(syncInfo));
            if (!silent) {
                loadSyncStatus();
            }
        });
    } else {
        // IndexedDB 同步（同步完成）
        const syncInfo = JSON.parse(localStorage.getItem('mgr_sync_info') || '{}');
        syncInfo[agentCode] = {
            lastSync: new Date().toISOString(),
            keys: Object.values(STORAGE_KEYS).filter(k => k !== 'AGENTS' && k !== 'CURRENT_AGENT')
        };
        localStorage.setItem('mgr_sync_info', JSON.stringify(syncInfo));
        if (!silent) {
            setTimeout(() => {
                showNotification('数据同步完成', 'success');
                loadSyncStatus();
            }, 500);
        }
    }
}

function downloadFromCloud() {
    const agentCode = getCurrentAgent();
    if (!agentCode) {
        showNotification('请先登录', 'error');
        return;
    }
    showNotification('正在从云端下载数据...', 'info');
    
    if (window.firebaseDatabase) {
        // 使用 Firebase 下载
        const downloadPromises = [];
        let downloadCount = 0;
        const totalKeys = Object.keys(STORAGE_KEYS).filter(k => k !== 'AGENTS' && k !== 'CURRENT_AGENT').length;
        
        Object.keys(STORAGE_KEYS).forEach(key => {
            if (key === 'AGENTS' || key === 'CURRENT_AGENT') return;
            const dataKey = STORAGE_KEYS[key];
            const dataRef = window.firebaseDatabase.ref(`agents/${agentCode}/${dataKey}`);
            
            const promise = dataRef.once('value').then((snapshot) => {
                if (snapshot.exists()) {
                    const cloudData = snapshot.val();
                    const allData = JSON.parse(localStorage.getItem(dataKey) || '{}');
                    allData[agentCode] = cloudData.data || [];
                    localStorage.setItem(dataKey, JSON.stringify(allData));
                }
                downloadCount++;
                return downloadCount;
            }).catch((error) => {
                console.error(`下载 ${dataKey} 失败:`, error);
                downloadCount++;
                return downloadCount;
            });
            
            downloadPromises.push(promise);
        });
        
        Promise.all(downloadPromises).then(() => {
            showNotification('数据下载完成', 'success');
            loadAllData();
        }).catch((error) => {
            console.error('下载过程出错:', error);
            showNotification('部分数据下载失败，请检查网络连接', 'error');
            loadAllData(); // 即使失败也尝试加载已有数据
        });
    } else {
        // 降级到 IndexedDB
        if ('indexedDB' in window) {
            const request = indexedDB.open('MGR_SyncDB', 1);
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['syncData'], 'readonly');
                const store = transaction.objectStore('syncData');
                Object.keys(STORAGE_KEYS).forEach(key => {
                    if (key === 'AGENTS' || key === 'CURRENT_AGENT') return;
                    const dataKey = `${agentCode}_${STORAGE_KEYS[key]}`;
                    const getRequest = store.get(dataKey);
                    getRequest.onsuccess = () => {
                        if (getRequest.result) {
                            const allData = JSON.parse(localStorage.getItem(STORAGE_KEYS[key]) || '{}');
                            allData[agentCode] = getRequest.result.data;
                            localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(allData));
                        }
                    };
                });
                setTimeout(() => {
                    showNotification('数据下载完成', 'success');
                    loadAllData();
                }, 500);
            };
        } else {
            showNotification('当前浏览器不支持数据同步', 'error');
        }
    }
}

function manualBackup(silent = false) {
    const agentCode = getCurrentAgent();
    if (!agentCode) {
        if (!silent) showNotification('请先登录', 'error');
        return;
    }
    if (!silent) showNotification('正在备份数据...', 'info');
    const backupData = {
        agentCode: agentCode,
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {}
    };
    Object.keys(STORAGE_KEYS).forEach(key => {
        if (key === 'AGENTS' || key === 'CURRENT_AGENT') return;
        backupData.data[STORAGE_KEYS[key]] = getAgentData(STORAGE_KEYS[key]);
    });
    const backups = JSON.parse(localStorage.getItem('mgr_backups') || '[]');
    backups.push(backupData);
    if (backups.length > 10) backups.shift();
    localStorage.setItem('mgr_backups', JSON.stringify(backups));
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MGR_Backup_${agentCode}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const backupInfo = JSON.parse(localStorage.getItem('mgr_backup_info') || '{}');
    backupInfo[agentCode] = { lastBackup: new Date().toISOString() };
    localStorage.setItem('mgr_backup_info', JSON.stringify(backupInfo));
    if (!silent) {
        showNotification('数据备份完成', 'success');
        loadBackupStatus();
    }
}

function restoreBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const backupData = JSON.parse(event.target.result);
                const agentCode = getCurrentAgent();
                if (backupData.agentCode !== agentCode) {
                    if (!confirm(`此备份属于 Agent Code: ${backupData.agentCode}，当前登录为: ${agentCode}。是否继续恢复？`)) {
                        return;
                    }
                }
                Object.keys(backupData.data).forEach(key => {
                    if (key !== 'AGENTS' && key !== 'CURRENT_AGENT') {
                        const allData = JSON.parse(localStorage.getItem(key) || '{}');
                        allData[agentCode] = backupData.data[key];
                        localStorage.setItem(key, JSON.stringify(allData));
                    }
                });
                showNotification('数据恢复完成', 'success');
                loadAllData();
            } catch (error) {
                showNotification('备份文件格式错误', 'error');
                console.error('Restore error:', error);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function loadSyncStatus() {
    const agentCode = getCurrentAgent();
    if (!agentCode) return;
    const settings = getSyncSettings();
    const syncEnabledCheckbox = document.getElementById('autoSyncEnabled');
    const syncIntervalSelect = document.getElementById('syncInterval');
    if (syncEnabledCheckbox) syncEnabledCheckbox.checked = settings.enabled;
    if (syncIntervalSelect) syncIntervalSelect.value = settings.interval;
    const syncInfo = JSON.parse(localStorage.getItem('mgr_sync_info') || '{}');
    const agentSyncInfo = syncInfo[agentCode];
    const syncStatusValue = document.getElementById('syncStatusValue');
    const lastSyncTime = document.getElementById('lastSyncTime');
    if (syncStatusValue) syncStatusValue.textContent = settings.enabled ? '已启用' : '未启用';
    if (lastSyncTime) lastSyncTime.textContent = agentSyncInfo?.lastSync 
        ? new Date(agentSyncInfo.lastSync).toLocaleString('zh-CN') 
        : '-';
}

function loadBackupStatus() {
    const agentCode = getCurrentAgent();
    if (!agentCode) return;
    const settings = getBackupSettings();
    const backupEnabledCheckbox = document.getElementById('autoBackupEnabled');
    const backupIntervalSelect = document.getElementById('backupInterval');
    if (backupEnabledCheckbox) backupEnabledCheckbox.checked = settings.enabled;
    if (backupIntervalSelect) backupIntervalSelect.value = settings.interval;
    const backupInfo = JSON.parse(localStorage.getItem('mgr_backup_info') || '{}');
    const agentBackupInfo = backupInfo[agentCode];
    const backupStatusValue = document.getElementById('backupStatusValue');
    const lastBackupTime = document.getElementById('lastBackupTime');
    if (backupStatusValue) backupStatusValue.textContent = settings.enabled ? '已启用' : '未启用';
    if (lastBackupTime) lastBackupTime.textContent = agentBackupInfo?.lastBackup 
        ? new Date(agentBackupInfo.lastBackup).toLocaleString('zh-CN') 
        : '-';
}

function scheduleBackup() {
    const agentCode = getCurrentAgent();
    if (!agentCode) return;
    const backupInfo = JSON.parse(localStorage.getItem('mgr_backup_info') || '{}');
    const agentBackupInfo = backupInfo[agentCode];
    const settings = getBackupSettings();
    if (!agentBackupInfo || !agentBackupInfo.lastBackup) {
        manualBackup(true);
        return;
    }
    const lastBackup = new Date(agentBackupInfo.lastBackup);
    const now = new Date();
    const timeSinceBackup = now - lastBackup;
    if (timeSinceBackup >= settings.interval) {
        manualBackup(true);
    }
}

function initializeSyncAndBackup() {
    if (isAutoSyncEnabled()) {
        startAutoSync();
    }
    if (isAutoBackupEnabled()) {
        startAutoBackup();
        scheduleBackup();
    }
}

// Data Integrity Check and Fix
let dataIssues = [];

function checkDataIntegrity() {
    const agentCode = getCurrentAgent();
    if (!agentCode) {
        showNotification('请先登录', 'error');
        return;
    }

    showNotification('正在检查数据...', 'info');
    dataIssues = [];
    
    // 检查所有数据类型
    checkCustomers();
    checkFamily();
    checkKIV();
    checkGoals();
    checkVisits();
    checkMonthly();
    checkReferrals();
    checkCalendarEvents();
    checkQuadrant();
    
    // 显示结果
    displayCheckResults();
}

function checkCustomers() {
    const customers = getAgentData(STORAGE_KEYS.CUSTOMERS);
    const customerIds = new Set();
    
    customers.forEach((customer, index) => {
        // 检查必需字段
        if (!customer.id) {
            dataIssues.push({
                type: 'customers',
                severity: 'error',
                message: `客户记录 #${index + 1} 缺少ID`,
                item: customer,
                fix: () => {
                    customer.id = Date.now().toString() + index;
                }
            });
        }
        
        // 检查重复ID
        if (customer.id && customerIds.has(customer.id)) {
            dataIssues.push({
                type: 'customers',
                severity: 'error',
                message: `客户记录 #${index + 1} ID重复: ${customer.id}`,
                item: customer,
                fix: () => {
                    customer.id = Date.now().toString() + index;
                }
            });
        }
        if (customer.id) customerIds.add(customer.id);
        
        // 检查必需字段
        if (!customer.lifeAssuredName || customer.lifeAssuredName.trim() === '') {
            dataIssues.push({
                type: 'customers',
                severity: 'warning',
                message: `客户记录 #${index + 1} 缺少Life Assured姓名`,
                item: customer
            });
        }
        
        // 检查数据类型
        if (customer.age && (isNaN(customer.age) || customer.age < 0 || customer.age > 150)) {
            dataIssues.push({
                type: 'customers',
                severity: 'warning',
                message: `客户记录 #${index + 1} 年龄无效: ${customer.age}`,
                item: customer,
                fix: () => {
                    customer.age = null;
                }
            });
        }
        
        if (customer.premiumAmount && (isNaN(customer.premiumAmount) || customer.premiumAmount < 0)) {
            dataIssues.push({
                type: 'customers',
                severity: 'warning',
                message: `客户记录 #${index + 1} 保费金额无效: ${customer.premiumAmount}`,
                item: customer,
                fix: () => {
                    customer.premiumAmount = 0;
                }
            });
        }
        
        // 检查coverage对象
        if (customer.coverage) {
            Object.keys(customer.coverage).forEach(key => {
                const value = customer.coverage[key];
                if (value !== null && value !== undefined && (isNaN(value) || value < 0)) {
                    dataIssues.push({
                        type: 'customers',
                        severity: 'warning',
                        message: `客户记录 #${index + 1} 保障金额无效 (${key}): ${value}`,
                        item: customer,
                        fix: () => {
                            customer.coverage[key] = 0;
                        }
                    });
                }
            });
        }
    });
}

function checkFamily() {
    const family = getAgentData(STORAGE_KEYS.FAMILY);
    const customers = getAgentData(STORAGE_KEYS.CUSTOMERS);
    const customerIds = new Set(customers.map(c => c.id));
    const familyIds = new Set();
    
    family.forEach((member, index) => {
        // 检查ID
        if (!member.id) {
            dataIssues.push({
                type: 'family',
                severity: 'error',
                message: `家庭成员记录 #${index + 1} 缺少ID`,
                item: member,
                fix: () => {
                    member.id = Date.now().toString() + index;
                }
            });
        }
        
        if (member.id && familyIds.has(member.id)) {
            dataIssues.push({
                type: 'family',
                severity: 'error',
                message: `家庭成员记录 #${index + 1} ID重复: ${member.id}`,
                item: member,
                fix: () => {
                    member.id = Date.now().toString() + index;
                }
            });
        }
        if (member.id) familyIds.add(member.id);
        
        // 检查关联的客户是否存在
        if (member.parentCustomerId && !customerIds.has(member.parentCustomerId)) {
            dataIssues.push({
                type: 'family',
                severity: 'error',
                message: `家庭成员记录 #${index + 1} 引用的客户不存在: ${member.parentCustomerId}`,
                item: member,
                fix: () => {
                    member.parentCustomerId = null;
                }
            });
        }
        
        if (member.customerId && !customerIds.has(member.customerId)) {
            dataIssues.push({
                type: 'family',
                severity: 'warning',
                message: `家庭成员记录 #${index + 1} 引用的客户ID不存在: ${member.customerId}`,
                item: member,
                fix: () => {
                    member.customerId = null;
                    member.isExistingCustomer = false;
                }
            });
        }
    });
}

function checkKIV() {
    const kiv = getAgentData(STORAGE_KEYS.KIV);
    const kivIds = new Set();
    
    kiv.forEach((item, index) => {
        if (!item.id) {
            dataIssues.push({
                type: 'kiv',
                severity: 'error',
                message: `KIV记录 #${index + 1} 缺少ID`,
                item: item,
                fix: () => {
                    item.id = Date.now().toString() + index;
                }
            });
        }
        
        if (item.id && kivIds.has(item.id)) {
            dataIssues.push({
                type: 'kiv',
                severity: 'error',
                message: `KIV记录 #${index + 1} ID重复: ${item.id}`,
                item: item,
                fix: () => {
                    item.id = Date.now().toString() + index;
                }
            });
        }
        if (item.id) kivIds.add(item.id);
        
        // 检查日期格式
        if (item.nextMeeting && !isValidDate(item.nextMeeting)) {
            dataIssues.push({
                type: 'kiv',
                severity: 'warning',
                message: `KIV记录 #${index + 1} 下次见面日期格式无效: ${item.nextMeeting}`,
                item: item,
                fix: () => {
                    item.nextMeeting = null;
                }
            });
        }
        
        if (item.premiumAmount && (isNaN(item.premiumAmount) || item.premiumAmount < 0)) {
            dataIssues.push({
                type: 'kiv',
                severity: 'warning',
                message: `KIV记录 #${index + 1} 保费金额无效: ${item.premiumAmount}`,
                item: item,
                fix: () => {
                    item.premiumAmount = 0;
                }
            });
        }
    });
}

function checkGoals() {
    const goals = getAgentData(STORAGE_KEYS.GOALS);
    const goalIds = new Set();
    
    goals.forEach((goal, index) => {
        if (!goal.id) {
            dataIssues.push({
                type: 'goals',
                severity: 'error',
                message: `目标记录 #${index + 1} 缺少ID`,
                item: goal,
                fix: () => {
                    goal.id = Date.now().toString() + index;
                }
            });
        }
        
        if (goal.id && goalIds.has(goal.id)) {
            dataIssues.push({
                type: 'goals',
                severity: 'error',
                message: `目标记录 #${index + 1} ID重复: ${goal.id}`,
                item: goal,
                fix: () => {
                    goal.id = Date.now().toString() + index;
                }
            });
        }
        if (goal.id) goalIds.add(goal.id);
        
        if (goal.targetAmount && (isNaN(goal.targetAmount) || goal.targetAmount < 0)) {
            dataIssues.push({
                type: 'goals',
                severity: 'warning',
                message: `目标记录 #${index + 1} 目标金额无效: ${goal.targetAmount}`,
                item: goal,
                fix: () => {
                    goal.targetAmount = 0;
                }
            });
        }
        
        if (goal.currentAmount && (isNaN(goal.currentAmount) || goal.currentAmount < 0)) {
            dataIssues.push({
                type: 'goals',
                severity: 'warning',
                message: `目标记录 #${index + 1} 当前金额无效: ${goal.currentAmount}`,
                item: goal,
                fix: () => {
                    goal.currentAmount = 0;
                }
            });
        }
        
        if (goal.dueDate && !isValidDate(goal.dueDate)) {
            dataIssues.push({
                type: 'goals',
                severity: 'warning',
                message: `目标记录 #${index + 1} 到期日期格式无效: ${goal.dueDate}`,
                item: goal,
                fix: () => {
                    goal.dueDate = null;
                }
            });
        }
    });
}

function checkVisits() {
    const visits = getAgentData(STORAGE_KEYS.VISITS);
    const visitIds = new Set();
    
    visits.forEach((visit, index) => {
        if (!visit.id) {
            dataIssues.push({
                type: 'visits',
                severity: 'error',
                message: `3访汇报记录 #${index + 1} 缺少ID`,
                item: visit,
                fix: () => {
                    visit.id = Date.now().toString() + index;
                }
            });
        }
        
        if (visit.id && visitIds.has(visit.id)) {
            dataIssues.push({
                type: 'visits',
                severity: 'error',
                message: `3访汇报记录 #${index + 1} ID重复: ${visit.id}`,
                item: visit,
                fix: () => {
                    visit.id = Date.now().toString() + index;
                }
            });
        }
        if (visit.id) visitIds.add(visit.id);
        
        if (visit.date && !isValidDate(visit.date)) {
            dataIssues.push({
                type: 'visits',
                severity: 'warning',
                message: `3访汇报记录 #${index + 1} 日期格式无效: ${visit.date}`,
                item: visit,
                fix: () => {
                    visit.date = new Date().toISOString().split('T')[0];
                }
            });
        }
        
        if (visit.age && (isNaN(visit.age) || visit.age < 0 || visit.age > 150)) {
            dataIssues.push({
                type: 'visits',
                severity: 'warning',
                message: `3访汇报记录 #${index + 1} 年龄无效: ${visit.age}`,
                item: visit,
                fix: () => {
                    visit.age = null;
                }
            });
        }
        
        if (visit.income && (isNaN(visit.income) || visit.income < 0)) {
            dataIssues.push({
                type: 'visits',
                severity: 'warning',
                message: `3访汇报记录 #${index + 1} 收入无效: ${visit.income}`,
                item: visit,
                fix: () => {
                    visit.income = null;
                }
            });
        }
        
        if (visit.premium && (isNaN(visit.premium) || visit.premium < 0)) {
            dataIssues.push({
                type: 'visits',
                severity: 'warning',
                message: `3访汇报记录 #${index + 1} 保费无效: ${visit.premium}`,
                item: visit,
                fix: () => {
                    visit.premium = null;
                }
            });
        }
    });
}

function checkMonthly() {
    const monthly = getAgentData(STORAGE_KEYS.MONTHLY);
    const monthlyIds = new Set();
    
    monthly.forEach((item, index) => {
        if (!item.id) {
            dataIssues.push({
                type: 'monthly',
                severity: 'error',
                message: `Monthly Cake记录 #${index + 1} 缺少ID`,
                item: item,
                fix: () => {
                    item.id = Date.now().toString() + index;
                }
            });
        }
        
        if (item.id && monthlyIds.has(item.id)) {
            dataIssues.push({
                type: 'monthly',
                severity: 'error',
                message: `Monthly Cake记录 #${index + 1} ID重复: ${item.id}`,
                item: item,
                fix: () => {
                    item.id = Date.now().toString() + index;
                }
            });
        }
        if (item.id) monthlyIds.add(item.id);
    });
}

function checkReferrals() {
    const referrals = getAgentData(STORAGE_KEYS.REFERRALS);
    const referralIds = new Set();
    
    referrals.forEach((referral, index) => {
        if (!referral.id) {
            dataIssues.push({
                type: 'referrals',
                severity: 'error',
                message: `推荐记录 #${index + 1} 缺少ID`,
                item: referral,
                fix: () => {
                    referral.id = Date.now().toString() + index;
                }
            });
        }
        
        if (referral.id && referralIds.has(referral.id)) {
            dataIssues.push({
                type: 'referrals',
                severity: 'error',
                message: `推荐记录 #${index + 1} ID重复: ${referral.id}`,
                item: referral,
                fix: () => {
                    referral.id = Date.now().toString() + index;
                }
            });
        }
        if (referral.id) referralIds.add(referral.id);
    });
}

function checkCalendarEvents() {
    const events = getAgentData(STORAGE_KEYS.CALENDAR_EVENTS);
    const eventIds = new Set();
    
    events.forEach((event, index) => {
        if (!event.id) {
            dataIssues.push({
                type: 'calendar',
                severity: 'error',
                message: `日历事件 #${index + 1} 缺少ID`,
                item: event,
                fix: () => {
                    event.id = Date.now().toString() + index;
                }
            });
        }
        
        if (event.id && eventIds.has(event.id)) {
            dataIssues.push({
                type: 'calendar',
                severity: 'error',
                message: `日历事件 #${index + 1} ID重复: ${event.id}`,
                item: event,
                fix: () => {
                    event.id = Date.now().toString() + index;
                }
            });
        }
        if (event.id) eventIds.add(event.id);
        
        if (event.date && !isValidDate(event.date)) {
            dataIssues.push({
                type: 'calendar',
                severity: 'warning',
                message: `日历事件 #${index + 1} 日期格式无效: ${event.date}`,
                item: event,
                fix: () => {
                    event.date = new Date().toISOString().split('T')[0];
                }
            });
        }
    });
}

function checkQuadrant() {
    try {
        const quadrantData = getAgentData(STORAGE_KEYS.QUADRANT);
        if (quadrantData && typeof quadrantData !== 'object') {
            dataIssues.push({
                type: 'quadrant',
                severity: 'error',
                message: '四宫格数据格式错误',
                item: quadrantData,
                fix: () => {
                    saveAgentData(STORAGE_KEYS.QUADRANT, {});
                }
            });
        }
    } catch (e) {
        dataIssues.push({
            type: 'quadrant',
            severity: 'error',
            message: '四宫格数据无法读取',
            item: null,
            fix: () => {
                saveAgentData(STORAGE_KEYS.QUADRANT, {});
            }
        });
    }
}

function isValidDate(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

function displayCheckResults() {
    const resultsDiv = document.getElementById('checkResults');
    const contentDiv = document.getElementById('checkResultsContent');
    const fixBtn = document.getElementById('fixDataBtn');
    
    if (!resultsDiv || !contentDiv) return;
    
    resultsDiv.style.display = 'block';
    
    if (dataIssues.length === 0) {
        contentDiv.innerHTML = `
            <div class="check-result-item success">
                <i class="fas fa-check-circle"></i>
                <span>数据检查完成，未发现任何问题！</span>
            </div>
        `;
        fixBtn.style.display = 'none';
        showNotification('数据检查完成，未发现问题', 'success');
        return;
    }
    
    const errorCount = dataIssues.filter(i => i.severity === 'error').length;
    const warningCount = dataIssues.filter(i => i.severity === 'warning').length;
    
    let html = `
        <div class="check-summary">
            <div class="summary-item error">
                <i class="fas fa-exclamation-circle"></i>
                <span>错误: ${errorCount}</span>
            </div>
            <div class="summary-item warning">
                <i class="fas fa-exclamation-triangle"></i>
                <span>警告: ${warningCount}</span>
            </div>
        </div>
        <div class="check-issues">
    `;
    
    // 按类型分组
    const issuesByType = {};
    dataIssues.forEach(issue => {
        if (!issuesByType[issue.type]) {
            issuesByType[issue.type] = [];
        }
        issuesByType[issue.type].push(issue);
    });
    
    Object.keys(issuesByType).forEach(type => {
        const typeName = {
            'customers': '客户',
            'family': '家庭成员',
            'kiv': 'KIV',
            'goals': '目标',
            'visits': '3访汇报',
            'monthly': 'Monthly Cake',
            'referrals': '推荐',
            'calendar': '日历事件',
            'quadrant': '四宫格'
        }[type] || type;
        
        html += `<div class="issue-type-group">
            <h4>${typeName} (${issuesByType[type].length})</h4>
        `;
        
        issuesByType[type].forEach((issue, idx) => {
            const icon = issue.severity === 'error' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle';
            const className = issue.severity === 'error' ? 'error' : 'warning';
            html += `
                <div class="check-result-item ${className}">
                    <i class="fas ${icon}"></i>
                    <span>${issue.message}</span>
                    ${issue.fix ? '<i class="fas fa-wrench fix-icon" title="可自动修复"></i>' : ''}
                </div>
            `;
        });
        
        html += `</div>`;
    });
    
    html += `</div>`;
    contentDiv.innerHTML = html;
    
    // 如果有可修复的问题，显示修复按钮
    const fixableIssues = dataIssues.filter(i => i.fix);
    if (fixableIssues.length > 0) {
        fixBtn.style.display = 'inline-block';
    } else {
        fixBtn.style.display = 'none';
    }
    
    showNotification(`检查完成：发现 ${errorCount} 个错误，${warningCount} 个警告`, 
        errorCount > 0 ? 'error' : 'warning');
}

function fixDataIssues() {
    const agentCode = getCurrentAgent();
    if (!agentCode) {
        showNotification('请先登录', 'error');
        return;
    }
    
    const fixableIssues = dataIssues.filter(i => i.fix);
    if (fixableIssues.length === 0) {
        showNotification('没有可自动修复的问题', 'info');
        return;
    }
    
    if (!confirm(`确定要修复 ${fixableIssues.length} 个问题吗？建议先备份数据。`)) {
        return;
    }
    
    showNotification('正在修复数据...', 'info');
    
    // 按类型分组修复
    const issuesByType = {};
    fixableIssues.forEach(issue => {
        if (!issuesByType[issue.type]) {
            issuesByType[issue.type] = [];
        }
        issuesByType[issue.type].push(issue);
    });
    
    // 执行修复
    Object.keys(issuesByType).forEach(type => {
        const issues = issuesByType[type];
        issues.forEach(issue => {
            if (issue.fix) {
                issue.fix();
            }
        });
        
        // 保存修复后的数据
        const keyMap = {
            'customers': STORAGE_KEYS.CUSTOMERS,
            'family': STORAGE_KEYS.FAMILY,
            'kiv': STORAGE_KEYS.KIV,
            'goals': STORAGE_KEYS.GOALS,
            'visits': STORAGE_KEYS.VISITS,
            'monthly': STORAGE_KEYS.MONTHLY,
            'referrals': STORAGE_KEYS.REFERRALS,
            'calendar': STORAGE_KEYS.CALENDAR_EVENTS,
            'quadrant': STORAGE_KEYS.QUADRANT
        };
        
        const storageKey = keyMap[type];
        if (storageKey) {
            const data = getAgentData(storageKey);
            saveAgentData(storageKey, data);
        }
    });
    
    showNotification(`已修复 ${fixableIssues.length} 个问题`, 'success');
    
    // 重新检查
    setTimeout(() => {
        checkDataIntegrity();
    }, 500);
}

