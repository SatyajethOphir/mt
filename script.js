/* ==========================================================================
   TEEN HUSTLE GOAL TRACKER & COUNTDOWN - ENGINE CODE
   ========================================================================== */

// Profile Constants (Born 26-04-2007)
const BIRTH_DAY = 26;
const BIRTH_MONTH = 4; // April
const BIRTH_YEAR = 2007;
const TARGET_FINANCIAL = 10000000; // 1 Crore INR (1,00,00,000)

// Standard mindsets array
const MOTIVATIONAL_QUOTES = [
    { text: "Your teens are built for compound learning, rapid execution, and taking brave risks.", author: "Teen Growth Syndicate" },
    { text: "Compound interest is the eighth wonder of the world. He who understands it, earns it.", author: "Albert Einstein" },
    { text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" },
    { text: "The secret to wealth is simple: find a way to do more for others than anyone else is doing.", author: "Tony Robbins" },
    { text: "Wealth is the asset that compounds quietly while you learn. Optimize for equity over short-term wage.", author: "Naval Ravikant" },
    { text: "Don't look for customers for your products. Create products for your customers.", author: "Seth Godin" },
    { text: "An investment in knowledge always pays the best interest dividend.", author: "Benjamin Franklin" },
    { text: "Consistency is the ultimate competitive advantage. Most fail due to simple boredom.", author: "James Clear" }
];

// Seed history when no previous tracking exists
const SEED_HISTORY = [
    { id: 'seed-saas', date: new Date(Date.now() - 48 * 3600000).toISOString(), amount: 1200000, source: 'Micro-SaaS', note: 'AI agent custom workflows & automated data parsers client retainer' },
    { id: 'seed-freelance', date: new Date(Date.now() - 24 * 3600000).toISOString(), amount: 300000, source: 'Freelancing', note: 'High-end UI/UX overhaul and brand layout architecture work' }
];

// Document State Layer
let incomeHistory = JSON.parse(localStorage.getItem('incomeHistory')) || [];

// Ensure all items have a unique id (migration step to support dynamic deletions on legacy entries)
let wasUpdated = false;
if (incomeHistory.length === 0) {
    incomeHistory = [...SEED_HISTORY];
    wasUpdated = true;
} else {
    incomeHistory = incomeHistory.map((item, idx) => {
        if (!item.id) {
            item.id = 'migrated-' + idx + '-' + Math.random().toString(36).substr(2, 9);
            wasUpdated = true;
        }
        return item;
    });
}

if (wasUpdated) {
    localStorage.setItem('incomeHistory', JSON.stringify(incomeHistory));
}

// Compute total income based on history total
let totalIncome = incomeHistory.reduce((acc, curr) => acc + curr.amount, 0);

let streakCount = parseInt(localStorage.getItem('streakCount')) || 7; // default fallback streak
let lastStreakDate = localStorage.getItem('lastStreakDate') || "";

// DOM Selectors
const daysIndicator = document.getElementById('days');
const hoursIndicator = document.getElementById('hours');
const minutesIndicator = document.getElementById('minutes');
const secondsIndicator = document.getElementById('seconds');
const targetBirthDateLbl = document.getElementById('target-birth-date');
const turningAgeLbl = document.getElementById('turning-age-badge');

const currentEarnedInput = document.getElementById('current-earned-input');
const accumulatedEarnedLbl = document.getElementById('accumulated-earned');
const remainingEarnedLbl = document.getElementById('remaining-earned');
const progressPercentLbl = document.getElementById('progress-percent');
const progressBarFill = document.getElementById('progress-bar-fill');

const selectPresetBtn1 = document.getElementById('preset-10k');
const selectPresetBtn2 = document.getElementById('preset-50k');

const addIncomeInput = document.getElementById('add-income-value');
const addIncomeSource = document.getElementById('add-income-source');
const addIncomeNote = document.getElementById('add-income-note');
const addIncomeForm = document.getElementById('income-form');

const streakCounterEl = document.getElementById('streak-count-value');
const streakBtn = document.getElementById('streak-btn');
const toastBlock = document.getElementById('toast-alert');
const toastMsgBlock = document.getElementById('toast-msg');

const mindsetQuote = document.getElementById('mindset-quote');
const mindsetAuthor = document.getElementById('mindset-author');

// Roadmap Pipeline DOM Selectors 
const valSaasEl = document.getElementById('pipeline-val-saas');
const barSaasEl = document.getElementById('pipeline-bar-saas');
const shareSaasEl = document.getElementById('pipeline-share-saas');

const valFreelanceEl = document.getElementById('pipeline-val-freelance');
const barFreelanceEl = document.getElementById('pipeline-bar-freelance');
const shareFreelanceEl = document.getElementById('pipeline-share-freelance');

const valContentEl = document.getElementById('pipeline-val-content');
const barContentEl = document.getElementById('pipeline-bar-content');
const shareContentEl = document.getElementById('pipeline-share-content');

const valConsultingEl = document.getElementById('pipeline-val-consulting');
const barConsultingEl = document.getElementById('pipeline-bar-consulting');
const shareConsultingEl = document.getElementById('pipeline-share-consulting');

const valOtherEl = document.getElementById('pipeline-val-other');
const barOtherEl = document.getElementById('pipeline-bar-other');
const shareOtherEl = document.getElementById('pipeline-share-other');

const timelineContainer = document.getElementById('timeline-container');
const resetHistoryBtn = document.getElementById('reset-history-btn');

// Toast alert dispatcher
function showToast(message) {
    if (!toastBlock) return;
    toastMsgBlock.textContent = message;
    toastBlock.classList.add('show');
    
    setTimeout(() => {
        toastBlock.classList.remove('show');
    }, 3500);
}

// 1. COUNTDOWN MATH & TIMER
function getNextBirthday() {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // April (Month 3 since Date month is 0-indexed)
    let nextBday = new Date(currentYear, BIRTH_MONTH - 1, BIRTH_DAY, 0, 0, 0, 0);
    
    // If birthday already elapsed in this current year, set to the subsequent year
    if (nextBday.getTime() <= now.getTime()) {
        nextBday.setFullYear(currentYear + 1);
    }
    return nextBday;
}

function updateCountdown() {
    const now = new Date();
    const nextBday = getNextBirthday();
    
    const timeDelta = nextBday.getTime() - now.getTime();
    
    // turning age computation
    const turningAge = nextBday.getFullYear() - BIRTH_YEAR;
    if (turningAgeLbl) {
        turningAgeLbl.textContent = `TURNING ${turningAge}`;
    }
    
    if (targetBirthDateLbl) {
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        targetBirthDateLbl.textContent = nextBday.toLocaleDateString('en-US', options);
    }

    if (timeDelta <= 0) {
        // Celebrating birthday
        if (daysIndicator) daysIndicator.textContent = "00";
        if (hoursIndicator) hoursIndicator.textContent = "00";
        if (minutesIndicator) minutesIndicator.textContent = "00";
        if (secondsIndicator) secondsIndicator.textContent = "00";
        return;
    }

    const days = Math.floor(timeDelta / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDelta % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDelta % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDelta % (1000 * 60)) / 1000);

    if (daysIndicator) daysIndicator.textContent = String(days).padStart(2, '0');
    if (hoursIndicator) hoursIndicator.textContent = String(hours).padStart(2, '0');
    if (minutesIndicator) minutesIndicator.textContent = String(minutes).padStart(2, '0');
    if (secondsIndicator) secondsIndicator.textContent = String(seconds).padStart(2, '0');
}

// 2. FINANCIAL PROGRESS ENGINE & SAVES
function recalculateMetrics() {
    // Recompute total in real-time from active logs
    totalIncome = incomeHistory.reduce((acc, curr) => acc + curr.amount, 0);

    // Save state to store
    localStorage.setItem('totalIncome', totalIncome.toString());
    localStorage.setItem('incomeHistory', JSON.stringify(incomeHistory));
    
    // Sync direct input box value
    if (currentEarnedInput && document.activeElement !== currentEarnedInput) {
        currentEarnedInput.value = totalIncome;
    }
    
    // Math indicators
    const remaining = Math.max(0, TARGET_FINANCIAL - totalIncome);
    const percentage = Math.min((totalIncome / TARGET_FINANCIAL) * 100, 100);
    
    // Render
    if (accumulatedEarnedLbl) {
        accumulatedEarnedLbl.textContent = "₹" + totalIncome.toLocaleString('en-IN');
    }
    if (remainingEarnedLbl) {
        remainingEarnedLbl.textContent = "₹" + remaining.toLocaleString('en-IN');
    }
    if (progressPercentLbl) {
        progressPercentLbl.textContent = percentage.toFixed(2) + "%";
    }
    if (progressBarFill) {
        progressBarFill.style.width = percentage + "%";
    }
    
    // Update metadata progress log
    localStorage.setItem('updatedProgress', percentage.toFixed(4));

    // Update the visual dynamic Capital Pathway and Milestones!
    renderRoadmapPipelines();
    renderTimelineLogs();
}

// Update separate pipeline totals and progress
function renderRoadmapPipelines() {
    const sums = {
        'Micro-SaaS': 0,
        'Freelancing': 0,
        'Content Creation': 0,
        'Consulting': 0,
        'Other': 0
    };

    // Calculate sum of each source
    incomeHistory.forEach(item => {
        const src = sums.hasOwnProperty(item.source) ? item.source : 'Other';
        sums[src] += item.amount;
    });

    // Render Micro-SaaS
    if (valSaasEl && barSaasEl && shareSaasEl) {
        valSaasEl.textContent = "₹" + sums['Micro-SaaS'].toLocaleString('en-IN');
        const share = (sums['Micro-SaaS'] / TARGET_FINANCIAL) * 100;
        barSaasEl.style.width = Math.min(share, 100) + "%";
        shareSaasEl.textContent = `${share.toFixed(2)}% achieved`;
    }

    // Render Freelancing
    if (valFreelanceEl && barFreelanceEl && shareFreelanceEl) {
        valFreelanceEl.textContent = "₹" + sums['Freelancing'].toLocaleString('en-IN');
        const share = (sums['Freelancing'] / TARGET_FINANCIAL) * 100;
        barFreelanceEl.style.width = Math.min(share, 100) + "%";
        shareFreelanceEl.textContent = `${share.toFixed(2)}% achieved`;
    }

    // Render Content Creation
    if (valContentEl && barContentEl && shareContentEl) {
        valContentEl.textContent = "₹" + sums['Content Creation'].toLocaleString('en-IN');
        const share = (sums['Content Creation'] / TARGET_FINANCIAL) * 100;
        barContentEl.style.width = Math.min(share, 100) + "%";
        shareContentEl.textContent = `${share.toFixed(2)}% achieved`;
    }

    // Render Consulting
    if (valConsultingEl && barConsultingEl && shareConsultingEl) {
        valConsultingEl.textContent = "₹" + sums['Consulting'].toLocaleString('en-IN');
        const share = (sums['Consulting'] / TARGET_FINANCIAL) * 100;
        barConsultingEl.style.width = Math.min(share, 100) + "%";
        shareConsultingEl.textContent = `${share.toFixed(2)}% achieved`;
    }

    // Render Other Operations
    if (valOtherEl && barOtherEl && shareOtherEl) {
        valOtherEl.textContent = "₹" + sums['Other'].toLocaleString('en-IN');
        const share = (sums['Other'] / TARGET_FINANCIAL) * 100;
        barOtherEl.style.width = Math.min(share, 100) + "%";
        shareOtherEl.textContent = `${share.toFixed(2)}% achieved`;
    }
}

// Render dynamic audit trail milestone records
function renderTimelineLogs() {
    if (!timelineContainer) return;
    timelineContainer.innerHTML = "";

    if (incomeHistory.length === 0) {
        timelineContainer.innerHTML = `<div class="timeline-empty">Empty capital channel ledger. Submit dynamic entries above!</div>`;
        return;
    }

    // Reverse chronological order (latest logs first)
    const sorted = [...incomeHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(item => {
        const dateObj = new Date(item.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Determine badge style
        let tagClass = 'tag-other';
        if (item.source === 'Micro-SaaS') tagClass = 'tag-saas';
        else if (item.source === 'Freelancing') tagClass = 'tag-freelance';
        else if (item.source === 'Content Creation') tagClass = 'tag-content';
        else if (item.source === 'Consulting') tagClass = 'tag-consulting';

        const card = document.createElement('div');
        card.className = 'timeline-card';
        card.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-head" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <span class="timeline-tag ${tagClass}">${item.source}</span>
                    <span class="timeline-sum">+ ₹${item.amount.toLocaleString('en-IN')}</span>
                </div>
                <button class="delete-timeline-btn" data-id="${item.id}" title="Delete milestone entry">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
            <div class="timeline-stamp" style="margin-top: 0.25rem;">${formattedDate}</div>
            <div class="timeline-msg" style="margin-top: 0.25rem;">${item.note || 'Dynamic income acceleration entry'}</div>
        `;
        timelineContainer.appendChild(card);
    });

    // Hydrate newly added lucide trash icons
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}

// Handler: Live direct inputs edit with fully functional button support
const saveTotalBtn = document.getElementById('save-total-btn');

function handleDirectEdit() {
    if (!currentEarnedInput) return;
    let val = parseFloat(currentEarnedInput.value);
    if (isNaN(val) || val < 0) {
        showToast("Please enter a valid numeric value! 🛡️");
        return;
    }

    const difference = val - totalIncome;
    if (difference === 0) {
        showToast("Current pool is already matches this value! 🛡️");
        return;
    }

    // Record compensation adjustment log in the ledger
    incomeHistory.push({
        id: 'direct-edit-' + Date.now(),
        date: new Date().toISOString(),
        amount: difference,
        source: 'Other',
        note: 'Manual capital pool balance calibration'
    });
    recalculateMetrics();
    showToast(`Total calibrated by ₹${difference >= 0 ? '+' : ''}${difference.toLocaleString('en-IN')}! 🛡️`);
}

if (currentEarnedInput) {
    currentEarnedInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleDirectEdit();
            currentEarnedInput.blur();
        }
    });
}

if (saveTotalBtn) {
    saveTotalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleDirectEdit();
    });
}

// Handler: Active Income Manual Add
if (addIncomeForm) {
    addIncomeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const addedVal = parseFloat(addIncomeInput.value);
        if (isNaN(addedVal) || addedVal <= 0) {
            showToast("Specify a positive numeric sum, hustler!");
            return;
        }

        const source = addIncomeSource ? addIncomeSource.value : 'Other';
        const note = addIncomeNote && addIncomeNote.value.trim() !== "" 
            ? addIncomeNote.value.trim() 
            : `Compounded allocation via ${source} channel`;

        // Register in history ledger
        incomeHistory.push({
            id: 'manual-' + Date.now(),
            date: new Date().toISOString(),
            amount: addedVal,
            source: source,
            note: note
        });
        
        // Reset inputs
        addIncomeInput.value = "";
        if (addIncomeNote) addIncomeNote.value = "";
        
        recalculateMetrics();
        showToast(`Added ₹${addedVal.toLocaleString('en-IN')} successfully to ${source}! 🔥`);
    });
}

// Quick presets injectors with automatic source tracking
if (selectPresetBtn1) {
    selectPresetBtn1.addEventListener('click', () => {
        incomeHistory.push({
            id: 'preset-' + Date.now(),
            date: new Date().toISOString(),
            amount: 10000,
            source: 'Freelancing',
            note: 'Swift preset injector: Custom styling contract sprint payout'
        });
        recalculateMetrics();
        showToast("Preset +₹10,000 added with 'Freelancing' tags!");
    });
}

if (selectPresetBtn2) {
    selectPresetBtn2.addEventListener('click', () => {
        incomeHistory.push({
            id: 'preset-' + Date.now(),
            date: new Date().toISOString(),
            amount: 50000,
            source: 'Micro-SaaS',
            note: 'Swift preset injector: Automated retainer platform subscription check'
        });
        recalculateMetrics();
        showToast("Preset +₹50,000 added with 'Micro-SaaS' tags!");
    });
}

// Handler: Reset history ledger to original state
if (resetHistoryBtn) {
    resetHistoryBtn.addEventListener('click', () => {
        if (confirm("Reset current history log and pipeline balances to starting seeds? This action cannot be undone.")) {
            incomeHistory = [...SEED_HISTORY];
            localStorage.setItem('incomeHistory', JSON.stringify(incomeHistory));
            recalculateMetrics();
            showToast("Ledger history restored to baseline tracks!");
        }
    });
}

// Handler: Individual timeline entry deletion with defensive type conversions
if (timelineContainer) {
    timelineContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.delete-timeline-btn');
        if (btn) {
            const itemId = btn.getAttribute('data-id');
            const itemToDelete = incomeHistory.find(item => String(item.id) === String(itemId));
            if (!itemToDelete) return;

            if (confirm(`Are you sure you want to delete this entry from your timeline?\n\n• Source: ${itemToDelete.source}\n• Amount: ₹${itemToDelete.amount.toLocaleString('en-IN')}\n• Note: ${itemToDelete.note || "No note"}`)) {
                incomeHistory = incomeHistory.filter(item => String(item.id) !== String(itemId));
                recalculateMetrics();
                showToast("Milestone entry deleted successfully! 🗑️");
            }
        }
    });
}

// 3. REFREShed QUOTES ENGINE
function initQuote() {
    const randIdx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    const selected = MOTIVATIONAL_QUOTES[randIdx];
    if (mindsetQuote && mindsetAuthor) {
        mindsetQuote.textContent = `"${selected.text}"`;
        mindsetAuthor.textContent = `— ${selected.author}`;
    }
}

// 4. HABIT/STREAK KEEPERS
function checkStreakValidity() {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Reset streak if last checked date is older than yesterday
    if (lastStreakDate && lastStreakDate !== todayStr && lastStreakDate !== yesterdayStr) {
        streakCount = 0;
        localStorage.setItem('streakCount', streakCount.toString());
    }
    
    if (streakCounterEl) {
        streakCounterEl.textContent = streakCount;
    }
    
    if (lastStreakDate === todayStr && streakBtn) {
        streakBtn.disabled = true;
        streakBtn.innerHTML = '<i data-lucide="check"></i> Secured for Today';
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }
}

if (streakBtn) {
    streakBtn.addEventListener('click', () => {
        const todayStr = new Date().toISOString().split('T')[0];
        if (lastStreakDate === todayStr) return;
        
        streakCount++;
        lastStreakDate = todayStr;
        
        localStorage.setItem('streakCount', streakCount.toString());
        localStorage.setItem('lastStreakDate', lastStreakDate);
        
        if (streakCounterEl) streakCounterEl.textContent = streakCount;
        
        streakBtn.disabled = true;
        streakBtn.innerHTML = '<i data-lucide="check"></i> Secured';
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
        showToast("Consistency streak secured! Keep compound accelerating!");
    });
}

// --- BOOT ON LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    // Initial tickers
    updateCountdown();
    setInterval(updateCountdown, 1000);
    
    recalculateMetrics();
    initQuote();
    checkStreakValidity();
});
