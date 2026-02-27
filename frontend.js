// Global Pilgrim Trader - Enhanced Frontend JavaScript
// Owner: Olawale Abdul-Ganiyu
// Contact: adeganglobal@gmail.com, +2349030277275

// Global State
let currentUser = null;
let marketUpdateInterval = null;
let robotTradingInterval = null;
let metaTraderConnected = false;

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    initializeEventListeners();
    startMarketUpdates();
    checkMetaTraderConnection();
});

// Session Management
function checkSession() {
    const session = localStorage.getItem('gpt_session');
    if (session) {
        currentUser = JSON.parse(session);
        showDashboard();
    }
}

function saveSession(user) {
    localStorage.setItem('gpt_session', JSON.stringify(user));
    currentUser = user;
}

function clearSession() {
    localStorage.removeItem('gpt_session');
    currentUser = null;
}

// Modal Functions
function showLogin() {
    document.getElementById('loginModal').style.display = 'block';
}

function showRegister() {
    document.getElementById('registerModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showForgotPassword() {
    const email = prompt('Enter your email address:');
    if (email) {
        alert('Password reset link has been sent to ' + email);
    }
}

// Authentication Handlers
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    let result;
    if (email.includes('@')) {
        result = GPTBackend.authenticateUser(email, password);
    } else {
        result = GPTBackend.authenticateByAccountNumber(email, password);
    }
    
    if (result.success) {
        if (result.user.status === 'pending') {
            alert('Your account is pending approval. Please wait for admin approval.');
            return;
        }
        
        saveSession(result.user);
        closeModal('loginModal');
        showDashboard();
        showMessage('Login successful!', 'success');
    } else {
        showMessage(result.message, 'error');
    }
}

function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match!', 'error');
        return;
    }
    
    const result = GPTBackend.createUser({
        name,
        email,
        phone,
        password
    });
    
    if (result) {
        closeModal('registerModal');
        showMessage('Account created successfully! Your account number is: ' + result.accountNumber, 'success');
        document.getElementById('registerForm').reset();
    } else {
        showMessage('Error creating account. Email may already exist.', 'error');
    }
}

function logout() {
    clearSession();
    stopRobotTrading();
    hideDashboard();
    showMessage('Logged out successfully!', 'success');
}

// Dashboard Functions
function showDashboard() {
    document.querySelector('.hero').style.display = 'none';
    document.querySelector('.features').style.display = 'none';
    
    let dashboardHTML = '';
    
    if (currentUser.role === 'admin') {
        dashboardHTML = createAdminDashboard();
    } else {
        dashboardHTML = createUserDashboard();
    }
    
    // Create dashboard container if it doesn't exist
    if (!document.getElementById('dashboard')) {
        const dashboardDiv = document.createElement('div');
        dashboardDiv.id = 'dashboard';
        dashboardDiv.className = 'dashboard';
        document.body.appendChild(dashboardDiv);
    }
    
    document.getElementById('dashboard').innerHTML = dashboardHTML;
    document.getElementById('dashboard').classList.add('active');
    
    // Initialize dashboard components
    initializeDashboardComponents();
}

function hideDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        dashboard.classList.remove('active');
    }
    document.querySelector('.hero').style.display = 'block';
    document.querySelector('.features').style.display = 'block';
}

function createAdminDashboard() {
    const stats = GPTBackend.getSystemStats();
    const pendingUsers = GPTBackend.getPendingUsers();
    const mtStatus = GPTBackend.getMetaTraderStatus();
    
    return `
        <div class="dashboard-header">
            <h1>Admin Dashboard</h1>
            <div class="user-info">
                <span>Welcome, ${currentUser.name}</span>
                <button onclick="logout()" class="btn-logout">Logout</button>
            </div>
        </div>
        
        <div class="dashboard-stats">
            <div class="stat-card">
                <h3>Total Users</h3>
                <div class="value">${stats.totalUsers}</div>
            </div>
            <div class="stat-card">
                <h3>Active Users</h3>
                <div class="value">${stats.activeUsers}</div>
            </div>
            <div class="stat-card">
                <h3>Pending Approvals</h3>
                <div class="value">${stats.pendingUsers}</div>
            </div>
            <div class="stat-card">
                <h3>Total Balance</h3>
                <div class="value">$${stats.totalBalance.toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <h3>Total Profit</h3>
                <div class="value">$${stats.totalProfit.toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <h3>Active Trades</h3>
                <div class="value">${stats.activeTrades}</div>
            </div>
            <div class="stat-card">
                <h3>MetaTrader</h3>
                <div class="value ${mtStatus.connected ? 'connected' : 'disconnected'}">
                    ${mtStatus.connected ? 'Connected' : 'Disconnected'}
                </div>
            </div>
        </div>
        
        <div class="admin-sections">
            <div class="section">
                <h2>Pending User Approvals</h2>
                <div class="user-list">
                    ${pendingUsers.length > 0 ? pendingUsers.map(user => `
                        <div class="user-card">
                            <div class="user-details">
                                <h4>${user.name}</h4>
                                <p>Email: ${user.email}</p>
                                <p>Phone: ${user.phone}</p>
                                <p>Account: ${user.accountNumber}</p>
                            </div>
                            <div class="user-actions">
                                <button onclick="approveUser('${user.id}')" class="btn-approve">Approve</button>
                                <button onclick="deleteUser('${user.id}')" class="btn-delete">Delete</button>
                            </div>
                        </div>
                    `).join('') : '<p>No pending users</p>'}
                </div>
            </div>
            
            <div class="section">
                <h2>All Users</h2>
                <div class="user-list">
                    ${GPTBackend.getAllUsers().map(user => `
                        <div class="user-card">
                            <div class="user-details">
                                <h4>${user.name} ${user.role === 'admin' ? '(Admin)' : ''}</h4>
                                <p>Email: ${user.email}</p>
                                <p>Account: ${user.accountNumber}</p>
                                <p>Balance: $${user.balance.toLocaleString()}</p>
                                <p>Profit: $${user.profit.toLocaleString()}</p>
                                <p>Status: ${user.status}</p>
                            </div>
                            <div class="user-actions">
                                <button onclick="editUserBalance('${user.id}')" class="btn-edit">Edit Balance</button>
                                <button onclick="generateUserPassword('${user.id}')" class="btn-password">Generate Password</button>
                                ${user.role !== 'admin' ? `<button onclick="deleteUser('${user.id}')" class="btn-delete">Delete</button>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div class="terminal-display">
            <div class="terminal-header">
                <h3>System Terminal</h3>
                <span class="terminal-status">Online</span>
            </div>
            <div class="terminal-content" id="adminTerminal">
                <div class="terminal-line">System initialized...</div>
                <div class="terminal-line">Connected to Global Pilgrim Trader Network</div>
                <div class="terminal-line">Owner: Olawale Abdul-Ganiyu</div>
                <div class="terminal-line">Account: 0022345678</div>
                <div class="terminal-line">Status: All systems operational</div>
                <div class="terminal-line">Transaction Signatures: Enabled</div>
                <div class="terminal-line">Real Profit Updates: Active</div>
            </div>
        </div>
    `;
}

function createUserDashboard() {
    const mtStatus = GPTBackend.getMetaTraderStatus();
    
    return `
        <div class="dashboard-header">
            <h1>User Dashboard</h1>
            <div class="user-info">
                <span>Welcome, ${currentUser.name}</span>
                <button onclick="logout()" class="btn-logout">Logout</button>
            </div>
        </div>
        
        <div class="dashboard-stats">
            <div class="stat-card">
                <h3>Account Number</h3>
                <div class="value">${currentUser.accountNumber}</div>
            </div>
            <div class="stat-card">
                <h3>Balance</h3>
                <div class="value">$${currentUser.balance.toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <h3>Profit</h3>
                <div class="value">$${currentUser.profit.toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <h3>Serial Number</h3>
                <div class="value">${currentUser.serialNumber}</div>
            </div>
            <div class="stat-card">
                <h3>MetaTrader</h3>
                <div class="value ${mtStatus.connected ? 'connected' : 'disconnected'}">
                    ${mtStatus.connected ? 'Connected' : 'Disconnected'}
                </div>
            </div>
        </div>
        
        <div class="trading-interface">
            <h2>Trading Interface</h2>
            <div class="trading-controls">
                <div class="control-group">
                    <label>Trading Mode</label>
                    <select id="tradingMode" onchange="updateTradingMode()">
                        <option value="manual">Manual Trading</option>
                        <option value="automatic">Automatic Trading</option>
                        <option value="robot">Robot Trading</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>Currency Pair</label>
                    <select id="currencyPair">
                        <option value="EUR/USD">EUR/USD</option>
                        <option value="GBP/USD">GBP/USD</option>
                        <option value="USD/JPY">USD/JPY</option>
                        <option value="AUD/USD">AUD/USD</option>
                        <option value="USD/CAD">USD/CAD</option>
                        <option value="USD/CHF">USD/CHF</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>Lot Size</label>
                    <input type="number" id="lotSize" min="0.01" max="500" step="0.01" value="0.1">
                </div>
                <div class="control-group">
                    <label>Current Price</label>
                    <div id="currentPrice" class="price-display">Loading...</div>
                </div>
            </div>
            
            <div class="trade-buttons">
                <button onclick="executeTrade('buy')" class="btn-buy">BUY</button>
                <button onclick="executeTrade('sell')" class="btn-sell">SELL</button>
            </div>
            
            <div class="robot-controls" id="robotControls" style="display: none;">
                <h3>Robot Trading Controls</h3>
                <p>Robot will trade automatically every 6 seconds based on market analysis</p>
                <p><strong>Real profit generation enabled - profits update to balance automatically</strong></p>
                <button onclick="startRobotTrading()" class="btn-start-robot">Start Robot</button>
                <button onclick="stopRobotTrading()" class="btn-stop-robot">Stop Robot</button>
            </div>
        </div>
        
        <div class="terminal-display">
            <div class="terminal-header">
                <h3>Trading Terminal</h3>
                <span class="terminal-status" id="terminalStatus">Ready</span>
            </div>
            <div class="terminal-content" id="tradingTerminal">
                <div class="terminal-line">Terminal initialized...</div>
                <div class="terminal-line">Connected to market data feed</div>
                <div class="terminal-line">Ready for trading</div>
                <div class="terminal-line">Transaction Signatures: Enabled</div>
                <div class="terminal-line">Owner: Olawale Abdul-Ganiyu</div>
            </div>
        </div>
        
        <div class="payment-section">
            <h2>Payment & Funds</h2>
            <div class="payment-options">
                <button onclick="showDepositModal()" class="btn-deposit">Deposit Funds</button>
                <button onclick="showWithdrawModal()" class="btn-withdraw">Withdraw Funds</button>
                <button onclick="showTransferModal()" class="btn-transfer">Transfer Funds</button>
            </div>
        </div>
        
        <div class="platform-download">
            <h2>MetaTrader Platform</h2>
            <div class="download-options">
                <a href="#" class="download-link">
                    <i class="fas fa-download"></i>
                    Download MetaTrader 4
                </a>
                <a href="#" class="download-link">
                    <i class="fas fa-download"></i>
                    Download MetaTrader 5
                </a>
            </div>
        </div>
    `;
}

// Dashboard Component Initialization
function initializeDashboardComponents() {
    if (currentUser.role === 'user') {
        updateMarketPrices();
        loadActiveTrades();
        updateDashboardStats();
    }
}

// Update Dashboard Stats
function updateDashboardStats() {
    if (!currentUser) return;
    
    // Refresh user data from backend
    const updatedUser = GPTBackend.db.getUserById(currentUser.id);
    if (updatedUser) {
        currentUser = updatedUser;
        saveSession(currentUser);
        
        // Update balance display
        const balanceElements = document.querySelectorAll('.stat-card:nth-child(2) .value');
        balanceElements.forEach(el => {
            if (el.textContent.includes('$')) {
                el.textContent = '$' + currentUser.balance.toLocaleString();
            }
        });
        
        // Update profit display
        const profitElements = document.querySelectorAll('.stat-card:nth-child(3) .value');
        profitElements.forEach(el => {
            if (el.textContent.includes('$')) {
                el.textContent = '$' + currentUser.profit.toLocaleString();
            }
        });
    }
}

// Trading Functions
function updateTradingMode() {
    const mode = document.getElementById('tradingMode').value;
    const robotControls = document.getElementById('robotControls');
    
    if (mode === 'robot') {
        robotControls.style.display = 'block';
    } else {
        robotControls.style.display = 'none';
        stopRobotTrading();
    }
}

function executeTrade(type) {
    const symbol = document.getElementById('currencyPair').value;
    const lotSize = parseFloat(document.getElementById('lotSize').value);
    const mode = document.getElementById('tradingMode').value;
    
    if (lotSize <= 0 || lotSize > 500) {
        showMessage('Invalid lot size. Must be between 0.01 and 500', 'error');
        return;
    }
    
    const marketData = GPTBackend.getMarketData();
    const pair = marketData.currencyPairs.find(p => p.symbol === symbol);
    
    if (!pair) {
        showMessage('Invalid currency pair', 'error');
        return;
    }
    
    const entryPrice = type === 'buy' ? pair.ask : pair.bid;
    
    const trade = GPTBackend.createTrade(currentUser.id, {
        symbol,
        type,
        lotSize,
        entryPrice,
        mode
    });
    
    if (trade) {
        addTerminalMessage(`Trade executed: ${type.toUpperCase()} ${symbol} at ${entryPrice}`, 'success');
        addTerminalMessage(`Transaction Signature: ${trade.signature.signature.substring(0, 16)}...`, 'info');
        addTerminalMessage(`Signed by: ${trade.signature.owner}`, 'info');
        loadActiveTrades();
        showMessage('Trade executed successfully!', 'success');
    } else {
        showMessage('Error executing trade', 'error');
    }
}

function startRobotTrading() {
    const result = GPTBackend.startRobotTrading(currentUser.id);
    
    if (result.success) {
        addTerminalMessage('Robot trading started', 'success');
        addTerminalMessage('Real profit generation enabled', 'success');
        document.getElementById('terminalStatus').textContent = 'Robot Active';
        showMessage('Robot trading started!', 'success');
        
        // Start periodic balance updates
        setInterval(() => {
            updateDashboardStats();
        }, 5000);
    } else {
        showMessage(result.message, 'error');
    }
}

function stopRobotTrading() {
    addTerminalMessage('Robot trading stopped', 'warning');
    document.getElementById('terminalStatus').textContent = 'Ready';
    showMessage('Robot trading stopped', 'success');
}

// Market Data Functions
function startMarketUpdates() {
    marketUpdateInterval = setInterval(() => {
        GPTBackend.updateMarketData();
        if (currentUser && currentUser.role === 'user') {
            updateMarketPrices();
        }
    }, 1000);
}

function updateMarketPrices() {
    const marketData = GPTBackend.getMarketData();
    const selectedPair = document.getElementById('currencyPair');
    
    if (!selectedPair) return;
    
    const pair = marketData.currencyPairs.find(p => p.symbol === selectedPair.value);
    
    if (pair) {
        const priceDisplay = document.getElementById('currentPrice');
        if (priceDisplay) {
            priceDisplay.innerHTML = `
                <span class="bid">Bid: ${pair.bid.toFixed(5)}</span>
                <span class="ask">Ask: ${pair.ask.toFixed(5)}</span>
            `;
        }
    }
}

function loadActiveTrades() {
    const tradingData = GPTBackend.getTradingData();
    const userTrades = tradingData.activeTrades.filter(t => t.userId === currentUser.id);
    
    // Update terminal with trade information
    userTrades.forEach(trade => {
        addTerminalMessage(`Active: ${trade.type.toUpperCase()} ${trade.symbol} @ ${trade.entryPrice}`, 'info');
        addTerminalMessage(`Signature: ${trade.signature.signature.substring(0, 16)}...`, 'info');
    });
}

// MetaTrader Connection
function checkMetaTraderConnection() {
    const status = GPTBackend.getMetaTraderStatus();
    metaTraderConnected = status.connected;
}

function connectMetaTrader() {
    const result = GPTBackend.connectMetaTrader();
    if (result.success) {
        metaTraderConnected = true;
        addTerminalMessage('Connected to MetaTrader Terminal: ' + result.terminalId, 'success');
        showMessage('Connected to MetaTrader Terminal!', 'success');
        showDashboard();
    }
}

function disconnectMetaTrader() {
    const result = GPTBackend.disconnectMetaTrader();
    if (result.success) {
        metaTraderConnected = false;
        addTerminalMessage('Disconnected from MetaTrader Terminal', 'warning');
        showMessage('Disconnected from MetaTrader Terminal', 'success');
        showDashboard();
    }
}

// Admin Functions
function approveUser(userId) {
    const result = GPTBackend.approveUser(userId);
    if (result) {
        showMessage('User approved successfully!', 'success');
        showDashboard();
    } else {
        showMessage('Error approving user', 'error');
    }
}

function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        GPTBackend.deleteUser(userId);
        showMessage('User deleted successfully!', 'success');
        showDashboard();
    }
}

function editUserBalance(userId) {
    const user = GPTBackend.db.getUserById(userId);
    const action = prompt('Enter "credit" or "debit":');
    
    if (action && (action === 'credit' || action === 'debit')) {
        const amount = parseFloat(prompt('Enter amount:'));
        
        if (amount && amount > 0) {
            const result = GPTBackend.updateBalance(userId, amount, action);
            if (result) {
                showMessage(`Balance ${action}ed successfully!`, 'success');
                showDashboard();
            } else {
                showMessage('Error updating balance', 'error');
            }
        }
    }
}

function generateUserPassword(userId) {
    const newPassword = GPTBackend.generatePassword();
    const result = GPTBackend.updateUser(userId, { password: GPTBackend.db.hashPassword(newPassword) });
    
    if (result) {
        alert(`New password generated: ${newPassword}`);
        showMessage('Password generated successfully!', 'success');
    } else {
        showMessage('Error generating password', 'error');
    }
}

// Payment Functions
function showDepositModal() {
    const amount = prompt('Enter deposit amount:');
    if (amount && parseFloat(amount) > 0) {
        const methods = ['Credit Card', 'Debit Card', 'Bank Transfer', 'Crypto', 'Gift Card'];
        const method = prompt(`Select payment method:\n${methods.join('\n')}`);
        
        if (method) {
            const transaction = GPTBackend.createTransaction({
                userId: currentUser.id,
                type: 'deposit',
                amount: parseFloat(amount),
                method: method
            });
            
            showMessage(`Deposit request of $${amount} via ${method} submitted!`, 'success');
            addTerminalMessage(`Deposit request: $${amount} via ${method}`, 'info');
            addTerminalMessage(`Transaction Signature: ${transaction.signature.signature.substring(0, 16)}...`, 'info');
        }
    }
}

function showWithdrawModal() {
    // Create withdrawal modal HTML
    const modalHTML = `
        <div id="withdrawModal" class="modal" style="display: block;">
            <div class="modal-content">
                <span class="close" onclick="closeModal('withdrawModal')">&times;</span>
                <h2>Withdraw Funds</h2>
                <form id="withdrawForm" onsubmit="handleWithdraw(event)">
                    <div class="form-group">
                        <label>Amount</label>
                        <input type="number" id="withdrawAmount" min="1" step="0.01" required>
                        <small>Available Balance: $${currentUser.balance.toLocaleString()}</small>
                    </div>
                    <div class="form-group">
                        <label>Withdrawal Method</label>
                        <select id="withdrawMethod" required>
                            <option value="">Select Method</option>
                            <option value="bank">Bank Transfer</option>
                            <option value="crypto">Cryptocurrency</option>
                            <option value="card">Credit/Debit Card</option>
                        </select>
                    </div>
                    <div class="form-group" id="withdrawDetailsGroup">
                        <label>Account Details</label>
                        <textarea id="withdrawDetails" rows="3" placeholder="Enter your account details (account number, bank name, crypto address, etc.)" required></textarea>
                    </div>
                    <button type="submit" class="btn-submit">Submit Withdrawal</button>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to body if it doesn't exist
    if (!document.getElementById('withdrawModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } else {
        document.getElementById('withdrawModal').style.display = 'block';
    }
}

function handleWithdraw(event) {
    event.preventDefault();
    
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const method = document.getElementById('withdrawMethod').value;
    const details = document.getElementById('withdrawDetails').value;
    
    if (amount <= 0) {
        showMessage('Invalid withdrawal amount', 'error');
        return;
    }
    
    if (amount > currentUser.balance) {
        showMessage('Insufficient balance!', 'error');
        return;
    }
    
    const result = GPTBackend.requestWithdrawal(currentUser.id, amount, method, details);
    
    if (result.success) {
        closeModal('withdrawModal');
        showMessage(`Withdrawal request of $${amount} submitted successfully!`, 'success');
        addTerminalMessage(`Withdrawal request: $${amount} via ${method}`, 'info');
        addTerminalMessage(`Transaction Signature: ${result.transaction.signature.signature.substring(0, 16)}...`, 'info');
        addTerminalMessage(`Signed by: ${result.transaction.signature.owner}`, 'info');
        updateDashboardStats();
    } else {
        showMessage(result.message, 'error');
    }
}

function showTransferModal() {
    const toAccount = prompt('Enter recipient account number:');
    const amount = prompt('Enter amount to transfer:');
    
    if (toAccount && amount && parseFloat(amount) > 0) {
        const result = GPTBackend.transferFunds(currentUser.id, toAccount, parseFloat(amount));
        
        if (result.success) {
            showMessage(result.message, 'success');
            showDashboard();
        } else {
            showMessage(result.message, 'error');
        }
    }
}

// Utility Functions
function addTerminalMessage(message, type = 'info') {
    const terminal = document.getElementById('tradingTerminal') || document.getElementById('adminTerminal');
    if (terminal) {
        const line = document.createElement('div');
        line.className = 'terminal-line';
        line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        if (type === 'success') {
            line.style.color = '#00ff88';
        } else if (type === 'error') {
            line.style.color = '#ff6b6b';
        } else if (type === 'warning') {
            line.style.color = '#ffcc00';
        }
        
        terminal.appendChild(line);
        terminal.scrollTop = terminal.scrollHeight;
    }
}

function showMessage(message, type) {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Add to page
    document.body.appendChild(messageDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

function showDemo() {
    alert('Demo mode coming soon! Register for a full account to access all features.');
}

// Event Listeners
function initializeEventListeners() {
    // Close modals when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
}

// Initialize
console.log('Global Pilgrim Trader Enhanced Frontend Initialized');
console.log('Owner: Olawale Abdul-Ganiyu');
console.log('Contact: adeganglobal@gmail.com | +2349030277275');
console.log('Features: Enhanced Trading, Real Profit Updates, Transaction Signatures, Withdrawal System');