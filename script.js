class MathMasterApp {
    constructor() {
        this.currentUser = null;
        this.currentCategory = 'add';
        this.currentLevel = 1;
        this.currentAnswer = 0;
        this.currentN1 = 0;
        this.currentN2 = 0;
        this.attemptsOnProblem = 0;
        this.correctStreakInLevel = 0;
        this.targetStreak = 5; 
        this.loginTimestamp = null;
        
        this.initListeners();
    }

    initListeners() {
        document.getElementById('authBtn').addEventListener('click', () => this.handleAuth());
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        document.getElementById('submitAnswerBtn').addEventListener('click', () => this.checkAnswer());
        document.getElementById('answerInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.checkAnswer();
        });
    }

    handleAuth() {
        const username = document.getElementById('usernameInput').value.trim();
        const pin = document.getElementById('pinInput').value.trim();
        const errBox = document.getElementById('authError');

        if (!username || pin.length < 4) {
            errBox.textContent = "Please enter a valid username and a minimum 4-digit PIN.";
            return;
        }

        let users = JSON.parse(localStorage.getItem('mathmaster_ai_users') || '{}');
        this.loginTimestamp = new Date();
        const loginTimeString = this.loginTimestamp.toLocaleString();

        if (users[username]) {
            if (users[username].pin !== pin) {
                errBox.textContent = "Incorrect PIN for this username.";
                return;
            }
            users[username].lastLogin = loginTimeString;
        } else {
            users[username] = {
                pin: pin,
                lastLogin: loginTimeString,
                sessions: [],
                progress: {
                    add: { unlockedLevel: 1 },
                    sub: { unlockedLevel: 1 },
                    mul: { unlockedLevel: 1 },
                    div: { unlockedLevel: 1 }
                }
            };
        }

        localStorage.setItem('mathmaster_ai_users', JSON.stringify(users));
        this.currentUser = username;
        
        document.getElementById('sessionUser').textContent = `User: ${username}`;
        document.getElementById('sessionLoginTime').textContent = `In: ${loginTimeString}`;
        document.getElementById('sessionLogoutRecord').textContent = `Out: Active`;
        
        this.showDashboard();
    }

    handleLogout() {
        const logoutTime = new Date();
        const logoutTimeString = logoutTime.toLocaleString();
        
        let users = JSON.parse(localStorage.getItem('mathmaster_ai_users') || '{}');
        if (users[this.currentUser]) {
            if (!users[this.currentUser].sessions) users[this.currentUser].sessions = [];
            users[this.currentUser].sessions.unshift({
                in: users[this.currentUser].lastLogin,
                out: logoutTimeString
            });
            if (users[this.currentUser].sessions.length > 5) users[this.currentUser].sessions.pop();
            localStorage.setItem('mathmaster_ai_users', JSON.stringify(users));
        }

        alert(`Session securely terminated at ${logoutTimeString}. Returning to login.`);
        this.currentUser = null;
        document.getElementById('usernameInput').value = '';
        document.getElementById('pinInput').value = '';
        document.getElementById('authError').textContent = '';
        this.showView('authView');
    }

    showView(viewId) {
        ['authView', 'dashboardView', 'levelView', 'quizView'].forEach(id => {
            document.getElementById(id).classList.add('hidden');
        });
        document.getElementById(viewId).classList.remove('hidden');
    }

    showDashboard() {
        this.updateDashboardProgress();
        this.renderSessionHistory();
        this.showView('dashboardView');
    }

    updateDashboardProgress() {
        let users = JSON.parse(localStorage.getItem('mathmaster_ai_users') || '{}');
        let userProg = users[this.currentUser]?.progress || {};

        ['add', 'sub', 'mul', 'div'].forEach(cat => {
            let unlocked = userProg[cat]?.unlockedLevel || 1;
            document.getElementById(`prog-${cat}`).textContent = unlocked;
        });
    }

    renderSessionHistory() {
        let users = JSON.parse(localStorage.getItem('mathmaster_ai_users') || '{}');
        let sessions = users[this.currentUser]?.sessions || [];
        let box = document.getElementById('sessionHistoryBox');

        if (sessions.length === 0) {
            box.innerHTML = "No prior completed sessions logged yet.";
            return;
        }

        let html = '<ul style="margin:0; padding-left:15px;">';
        sessions.forEach(s => {
            html += `<li>Logged In: <strong>${s.in}</strong> | Logged Out: <strong>${s.out}</strong></li>`;
        });
        html += '</ul>';
        box.innerHTML = html;
    }

    selectCategory(cat) {
        this.currentCategory = cat;
        const titles = { add: 'Addition Mastery', sub: 'Subtraction Mastery', mul: 'Multiplication Mastery', div: 'Division Mastery' };
        const lessons = {
            add: 'Levels 1–20 focus on single digits. Levels 21–50 introduce double-digit carrying. Levels 51–100 test complex multi-digit addition.',
            sub: 'Levels 1–20 focus on basic subtraction. Levels 21–50 introduce borrowing logic. Levels 51–100 cover wider number ranges.',
            mul: 'Levels 1–20 cover times tables (1–12). Levels 21–50 combine double digits. Levels 51–100 involve advanced factors.',
            div: 'Levels 1–20 practice clean division. Levels 21–50 cover larger dividends. Levels 51–100 test full quotient mastery.'
        };

        document.getElementById('levelCategoryTitle').textContent = titles[cat];
        document.getElementById('lessonText').textContent = lessons[cat];
        this.renderLevelGrid();
        this.showView('levelView');
    }

    renderLevelGrid() {
        let users = JSON.parse(localStorage.getItem('mathmaster_ai_users') || '{}');
        let unlockedMax = users[this.currentUser]?.progress[this.currentCategory]?.unlockedLevel || 1;
        
        let container = document.getElementById('levelGridContainer');
        container.innerHTML = '';

        for (let i = 1; i <= 100; i++) {
            let btn = document.createElement('button');
            btn.className = 'level-btn';
            btn.textContent = i;
            if (i < unlockedMax) {
                btn.classList.add('completed');
                btn.onclick = () => this.startQuiz(i);
            } else if (i === unlockedMax) {
                btn.classList.add('unlocked');
                btn.onclick = () => this.startQuiz(i);
            } else {
                btn.disabled = true;
            }
            container.appendChild(btn);
        }
    }

    startQuiz(level) {
        this.currentLevel = level;
        this.correctStreakInLevel = 0;
        document.getElementById('quizLevelIndicator').textContent = `${this.currentCategory.toUpperCase()} — Level ${level}`;
        document.getElementById('quizScore').textContent = '0';
        document.getElementById('celebrationContainer').innerHTML = '';
        this.showView('quizView');
        this.generateProblem();
    }

    generateProblem() {
        document.getElementById('answerInput').value = '';
        document.getElementById('inputSection').classList.remove('hidden');
        document.getElementById('celebrationContainer').innerHTML = '';
        
        let feedback = document.getElementById('quizFeedback');
        feedback.textContent = '';
        feedback.className = 'feedback';
        
        let workingContainer = document.getElementById('workingContainer');
        workingContainer.classList.add('hidden');
        workingContainer.innerHTML = '';

        this.attemptsOnProblem = 0;
        document.getElementById('targetStreakInfo').textContent = `Correct answers to clear level: ${this.correctStreakInLevel} / ${this.targetStreak}`;

        let lvl = this.currentLevel;
        let maxRange = lvl <= 20 ? 10 : (lvl <= 50 ? 50 : 200);

        switch (this.currentCategory) {
            case 'add':
                this.currentN1 = Math.floor(Math.random() * maxRange) + 1;
                this.currentN2 = Math.floor(Math.random() * maxRange) + 1;
                this.currentAnswer = this.currentN1 + this.currentN2;
                document.getElementById('problemDisplay').textContent = `${this.currentN1} + ${this.currentN2} = ?`;
                break;
            case 'sub':
                this.currentN1 = Math.floor(Math.random() * maxRange) + 5;
                this.currentN2 = Math.floor(Math.random() * this.currentN1) + 1;
                this.currentAnswer = this.currentN1 - this.currentN2;
                document.getElementById('problemDisplay').textContent = `${this.currentN1} - ${this.currentN2} = ?`;
                break;
            case 'mul':
                let mRange = lvl <= 20 ? 10 : (lvl <= 50 ? 20 : 50);
                this.currentN1 = Math.floor(Math.random() * mRange) + 1;
                this.currentN2 = Math.floor(Math.random() * 12) + 1;
                this.currentAnswer = this.currentN1 * this.currentN2;
                document.getElementById('problemDisplay').textContent = `${this.currentN1} × ${this.currentN2} = ?`;
                break;
            case 'div':
                let dRange = lvl <= 20 ? 10 : (lvl <= 50 ? 15 : 25);
                this.currentN2 = Math.floor(Math.random() * dRange) + 1;
                let multiplier = Math.floor(Math.random() * dRange) + 1;
                this.currentN1 = this.currentN2 * multiplier;
                this.currentAnswer = multiplier;
                document.getElementById('problemDisplay').textContent = `${this.currentN1} ÷ ${this.currentN2} = ?`;
                break;
        }
        document.getElementById('answerInput').focus();
    }

    checkAnswer() {
        let userVal = parseFloat(document.getElementById('answerInput').value);
        let feedback = document.getElementById('quizFeedback');

        if (isNaN(userVal)) {
            feedback.textContent = "Please enter a valid number.";
            feedback.className = "feedback error";
            return;
        }

        if (userVal === this.currentAnswer) {
            this.correctStreakInLevel++;
            let currentScore = parseInt(document.getElementById('quizScore').textContent) + 10;
            document.getElementById('quizScore').textContent = currentScore;
            
            // Trigger celebration effect
            this.triggerCelebration();

            if (this.correctStreakInLevel >= this.targetStreak) {
                this.saveProgressUnlock();
                setTimeout(() => this.showLevels(), 2500);
            } else {
                setTimeout(() => this.generateProblem(), 2200);
            }
        } else {
            this.attemptsOnProblem++;
            if (this.attemptsOnProblem >= 2) {
                feedback.textContent = `Incorrect after 2 attempts. Study the working below at your own pace:`;
                feedback.className = "feedback error";
                document.getElementById('inputSection').classList.add('hidden');
                this.displayWorking();
            } else {
                feedback.textContent = `Incorrect. Try again! (${2 - this.attemptsOnProblem} attempt left)`;
                feedback.className = "feedback error";
                document.getElementById('answerInput').value = '';
                document.getElementById('answerInput').focus();
            }
        }
    }

    triggerCelebration() {
        document.getElementById('inputSection').classList.add('hidden');
        let celebrationContainer = document.getElementById('celebrationContainer');
        
        let messages = [
            "🌟 Brilliant! You nailed it!",
            "🎉 Outstanding work, Math Master!",
            "🚀 Fantastic job! Keep crushing it!",
            "⭐ Spot on! Your skills are shining!"
        ];
        let randomMsg = messages[Math.floor(Math.random() * messages.length)];

        celebrationContainer.innerHTML = `
            <div class="celebration-banner">
                <h3>${randomMsg}</h3>
                <p>Streak Progress: ${this.correctStreakInLevel} / ${this.targetStreak} correct</p>
            </div>
        `;

        // Create Confetti inside the quiz card container
        let card = document.getElementById('quizView');
        for (let i = 0; i < 25; i++) {
            let confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.backgroundColor = ['#F2C230', '#B4472A', '#2e7d32', '#16281F', '#43a047'][Math.floor(Math.random() * 5)];
            confetti.style.animationDuration = `${0.8 + Math.random() * 1.2}s`;
            confetti.style.animationDelay = `${Math.random() * 0.3}s`;
            card.appendChild(confetti);
            setTimeout(() => confetti.remove(), 2000);
        }
    }

    displayWorking() {
        let workingContainer = document.getElementById('workingContainer');
        workingContainer.classList.remove('hidden');
        let n1 = this.currentN1;
        let n2 = this.currentN2;
        let html = `<h3 style="margin-top:0; color:var(--rust-deep);">Step-by-Step Study Guide (${this.currentCategory.toUpperCase()})</h3>`;

        if (this.currentCategory === 'add') {
            let t1 = '|'.repeat(Math.min(n1, 25)) + (n1 > 25 ? '...' : '');
            let t2 = '|'.repeat(Math.min(n2, 25)) + (n2 > 25 ? '...' : '');
            html += `<p>${n1} is represented as: <code>${t1}</code></p>`;
            html += `<p>${n2} is represented as: <code>${t2}</code></p>`;
            html += `<p>Combining them together gives <strong>${this.currentAnswer}</strong>.</p>`;
        } else if (this.currentCategory === 'sub') {
            let t1 = '|'.repeat(Math.min(n1, 30));
            html += `<p>Start with ${n1} items: <code>[${t1}]</code></p>`;
            html += `<p>Cross out/take away ${n2} items. You are left with <strong>${this.currentAnswer}</strong>.</p>`;
        } else if (this.currentCategory === 'mul') {
            html += `<p>Multiplication is repeated addition. Add ${n1} in groups of ${n2}:</p>`;
            let groupArr = Array(Math.min(n2, 5)).fill(n1).join(' + ');
            html += `<p><code>${groupArr}</code> ${n2 > 5 ? '(...)' : ''} = <strong>${this.currentAnswer}</strong></p>`;
        } else if (this.currentCategory === 'div') {
            html += `<p>Division splits the total amount (${n1}) into equal portions of ${n2}.</p>`;
            html += `<p>You can fit ${n2} into ${n1} exactly <strong>${this.currentAnswer}</strong> times.</p>`;
        }

        html += `<button class="btn btn-primary" onclick="app.generateProblem()" style="margin-top: 10px;">Got it! Next Problem →</button>`;
        workingContainer.innerHTML = html;
    }

    saveProgressUnlock() {
        let users = JSON.parse(localStorage.getItem('mathmaster_ai_users') || '{}');
        let userProg = users[this.currentUser].progress[this.currentCategory];
        
        if (this.currentLevel >= userProg.unlockedLevel && this.currentLevel < 100) {
            userProg.unlockedLevel = this.currentLevel + 1;
            localStorage.setItem('mathmaster_ai_users', JSON.stringify(users));
        }
    }

    showLevels() {
        this.selectCategory(this.currentCategory);
    }
}

const app = new MathMasterApp();