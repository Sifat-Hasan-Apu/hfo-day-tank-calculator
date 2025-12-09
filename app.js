// HFO Day Tank Volume Calculator - Main Application Logic

// ========== সার্চ অ্যানালিটিক্স Feature ==========
let searchHistory = JSON.parse(localStorage.getItem('hfoSearchHistory')) || {};
let recentSearches = JSON.parse(localStorage.getItem('hfoRecentSearches')) || [];

function trackSearch(dipValue, volume, result) {
    const key = Math.round(dipValue).toString();
    searchHistory[key] = (searchHistory[key] || 0) + 1;

    // Track recent searches with details
    const searchRecord = {
        dip: dipValue,
        volume: Math.round(volume),
        timestamp: Date.now(),
        hasFraction: result.hasFraction,
        baseDip: result.baseDip,
        baseVolume: result.baseVolume,
        fraction: result.fraction,
        fractionVolume: result.fractionVolume
    };

    recentSearches.unshift(searchRecord);
    if (recentSearches.length > 20) recentSearches.pop();

    localStorage.setItem('hfoSearchHistory', JSON.stringify(searchHistory));
    localStorage.setItem('hfoRecentSearches', JSON.stringify(recentSearches));
}

function openReportModal() {
    const modal = document.getElementById('reportModal');
    const modalBody = document.getElementById('modalBody');

    modalBody.innerHTML = generateReportHTML();

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
    document.body.style.overflow = 'hidden';
}

function closeReportModal() {
    const modal = document.getElementById('reportModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }, 300);
}

function generateReportHTML() {
    const totalSearches = Object.values(searchHistory).reduce((a, b) => a + b, 0);

    if (totalSearches === 0) {
        return `
            <div class="no-data">
                <div class="no-data-icon">📊</div>
                <p>এখনো কোনো সার্চ করা হয়নি</p>
                <p style="font-size: 12px; margin-top: 8px;">ডিপ উচ্চতা দিয়ে সার্চ করুন, তারপর এখানে অ্যানালিটিক্স দেখতে পাবেন</p>
            </div>
        `;
    }

    // Calculate stats
    const entries = Object.entries(searchHistory);
    const uniqueDips = entries.length;
    const totalRanges = Math.ceil(14925 / 100); // 150 ranges (0-14925)

    // Group by 100mm ranges
    const rangeData = {};
    entries.forEach(([dip, count]) => {
        const rangeStart = Math.floor(parseInt(dip) / 100) * 100;
        const rangeEnd = Math.min(rangeStart + 99, 14925);
        const rangeKey = `${rangeStart}-${rangeEnd}`;
        rangeData[rangeKey] = (rangeData[rangeKey] || 0) + count;
    });

    // Sort ranges by count
    const sortedRanges = Object.entries(rangeData)
        .sort((a, b) => b[1] - a[1]);

    const maxRangeCount = sortedRanges.length > 0 ? sortedRanges[0][1] : 1;
    const mostPopularRange = sortedRanges.length > 0 ? sortedRanges[0][0] : '-';
    const rangesCovered = Object.keys(rangeData).length;
    const coveragePercent = ((rangesCovered / totalRanges) * 100).toFixed(1);

    // Generate summary HTML
    let html = `
        <div class="report-section">
            <div class="section-title">📈 সারাংশ</div>
            <div class="summary-grid">
                <div class="stat-card">
                    <div class="stat-value">${totalSearches.toLocaleString('bn-BD')}</div>
                    <div class="stat-label">মোট সার্চ</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${uniqueDips.toLocaleString('bn-BD')}</div>
                    <div class="stat-label">ভিন্ন ডিপ মান</div>
                </div>
                <div class="stat-card highlight">
                    <div class="stat-value">${mostPopularRange}</div>
                    <div class="stat-label">জনপ্রিয় রেঞ্জ (মিমি)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${coveragePercent}%</div>
                    <div class="stat-label">কভারেজ (০-১৪৯২৫)</div>
                </div>
            </div>
        </div>
        
        <div class="report-section">
            <div class="section-title">📊 রেঞ্জ অনুযায়ী সার্চ বিতরণ</div>
            <div class="range-stats">
                <span>📍 ${rangesCovered} টি রেঞ্জে সার্চ হয়েছে (সর্বমোট ${totalRanges} রেঞ্জ)</span>
            </div>
            <div class="range-chart">
    `;

    // Show all ranges that have data
    sortedRanges.forEach(([range, count]) => {
        const percentage = (count / maxRangeCount) * 100;
        const countPercent = ((count / totalSearches) * 100).toFixed(1);
        html += `
            <div class="range-bar-container">
                <span class="range-label">${range}</span>
                <div class="range-bar-wrapper">
                    <div class="range-bar" style="width: ${percentage}%">
                        <span class="range-percent">${countPercent}%</span>
                    </div>
                </div>
                <span class="range-count">${count}</span>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    return html;
}

function generateExplanation(search) {
    if (search.hasFraction && search.baseDip) {
        return `✅ ডিপ ${search.dip} মিমি = মূল ${search.baseDip} মিমি (${search.baseVolume.toLocaleString('bn-BD')} লি.) + ভগ্নাংশ ${search.fraction} মিমি (+${search.fractionVolume.toLocaleString('bn-BD')} লি.) = মোট ${search.volume.toLocaleString('bn-BD')} লিটার`;
    } else if (calibrationData && calibrationData[search.dip]) {
        return `✅ ডিপ ${search.dip} মিমি চার্টে সরাসরি আছে = ${search.volume.toLocaleString('bn-BD')} লিটার`;
    } else {
        return `✅ ডিপ ${search.dip} মিমি ইন্টারপোলেশন দ্বারা গণনা = ${search.volume.toLocaleString('bn-BD')} লিটার`;
    }
}

function clearSearchHistory() {
    if (confirm('সকল সার্চ হিস্টোরি মুছে ফেলতে চান?')) {
        searchHistory = {};
        recentSearches = [];
        localStorage.removeItem('hfoSearchHistory');
        localStorage.removeItem('hfoRecentSearches');

        const modalBody = document.getElementById('modalBody');
        if (modalBody) {
            modalBody.innerHTML = generateReportHTML();
        }
    }
}

// Close modal on overlay click
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal-overlay')) {
        closeReportModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeReportModal();
    }
});

// ========== Main Calculator ==========
function calculateVolume() {
    const input = document.getElementById('dipHeight');
    const resultSection = document.getElementById('resultSection');
    const resultValue = document.getElementById('resultValue');
    const infoCard = document.getElementById('infoCard');
    const displayDip = document.getElementById('displayDip');
    const lowerValue = document.getElementById('lowerValue');
    const upperValue = document.getElementById('upperValue');
    const breakdownCard = document.getElementById('breakdownCard');
    const breakdownContent = document.getElementById('breakdownContent');

    const dipHeight = parseFloat(input.value);

    // Validation - Maximum is 14925mm
    if (isNaN(dipHeight) || dipHeight < 0 || dipHeight > 14925) {
        input.classList.add('error');
        setTimeout(() => input.classList.remove('error'), 500);
        resultValue.textContent = 'ত্রুটি!';
        resultSection.classList.add('active');
        infoCard.classList.remove('show');
        breakdownCard.classList.remove('show');
        return;
    }

    // Calculate volume and get breakdown info
    const result = getVolumeWithBreakdown(dipHeight);

    // Update UI
    resultValue.textContent = formatNumber(Math.round(result.total));
    resultSection.classList.add('active');

    // Show info card
    displayDip.textContent = dipHeight + ' মিমি';

    // Find nearest values
    const nearest = findNearestValues(dipHeight);
    lowerValue.textContent = nearest.lower.dip + ' মিমি = ' + formatNumber(nearest.lower.volume) + ' লিটার';
    upperValue.textContent = nearest.upper.dip + ' মিমি = ' + formatNumber(nearest.upper.volume) + ' লিটার';

    infoCard.classList.add('show');

    // Track this search for analytics
    trackSearch(dipHeight, result.total, result);

    // Show breakdown
    showBreakdown(breakdownCard, breakdownContent, result, dipHeight);
}

function showBreakdown(card, content, result, dipHeight) {
    if (result.hasFraction && dipHeight >= 230) {
        content.innerHTML = `
            <div class="breakdown-row">
                <span class="breakdown-label">মূল উচ্চতা (${result.baseDip} মিমি)</span>
                <span class="breakdown-value">${formatNumber(result.baseVolume)} লিটার</span>
            </div>
            <div class="breakdown-row">
                <span class="breakdown-label">ভগ্নাংশ যোগ (${result.fraction} মিমি)</span>
                <span class="breakdown-value">+ ${formatNumber(result.fractionVolume)} লিটার</span>
            </div>
            <div class="breakdown-row total">
                <span class="breakdown-label">মোট ভলিউম</span>
                <span class="breakdown-value">${formatNumber(Math.round(result.total))} লিটার</span>
            </div>
        `;
        card.classList.add('show');
    } else if (calibrationData.hasOwnProperty(dipHeight)) {
        content.innerHTML = `
            <div class="breakdown-row">
                <span class="breakdown-label">চার্ট থেকে সরাসরি মান</span>
                <span class="breakdown-value">${formatNumber(Math.round(result.total))} লিটার</span>
            </div>
        `;
        card.classList.add('show');
    } else {
        content.innerHTML = `
            <div class="breakdown-row">
                <span class="breakdown-label">ইন্টারপোলেশন দ্বারা গণনা</span>
                <span class="breakdown-value">${formatNumber(Math.round(result.total))} লিটার</span>
            </div>
        `;
        card.classList.add('show');
    }
}

function getVolumeWithBreakdown(dip) {
    if (calibrationData.hasOwnProperty(dip)) {
        return {
            total: calibrationData[dip],
            hasFraction: false
        };
    }

    if (dip >= 230) {
        const baseDip = Math.floor(dip / 10) * 10;
        const fraction = dip % 10;

        if (calibrationData.hasOwnProperty(baseDip)) {
            const baseVolume = calibrationData[baseDip];
            if (fraction > 0 && fractionalTable.hasOwnProperty(fraction)) {
                return {
                    total: baseVolume + fractionalTable[fraction],
                    hasFraction: true,
                    baseDip: baseDip,
                    baseVolume: baseVolume,
                    fraction: fraction,
                    fractionVolume: fractionalTable[fraction]
                };
            }
            return {
                total: baseVolume,
                hasFraction: false,
                baseDip: baseDip,
                baseVolume: baseVolume
            };
        }
    }

    let lowerDip = null;
    let upperDip = null;

    for (let i = 0; i < dipValues.length; i++) {
        if (dipValues[i] <= dip) {
            lowerDip = dipValues[i];
        }
        if (dipValues[i] >= dip && upperDip === null) {
            upperDip = dipValues[i];
        }
    }

    if (lowerDip === null) return { total: calibrationData[dipValues[0]], hasFraction: false };
    if (upperDip === null) return { total: calibrationData[dipValues[dipValues.length - 1]], hasFraction: false };
    if (lowerDip === upperDip) return { total: calibrationData[lowerDip], hasFraction: false };

    const lowerVolume = calibrationData[lowerDip];
    const upperVolume = calibrationData[upperDip];
    const ratio = (dip - lowerDip) / (upperDip - lowerDip);

    return {
        total: lowerVolume + (upperVolume - lowerVolume) * ratio,
        hasFraction: false
    };
}

function getVolumeFromDip(dip) {
    if (calibrationData.hasOwnProperty(dip)) {
        return calibrationData[dip];
    }

    if (dip >= 230) {
        const baseDip = Math.floor(dip / 10) * 10;
        const fraction = dip % 10;

        if (calibrationData.hasOwnProperty(baseDip)) {
            const baseVolume = calibrationData[baseDip];
            if (fraction > 0 && fractionalTable.hasOwnProperty(fraction)) {
                return baseVolume + fractionalTable[fraction];
            }
            return baseVolume;
        }
    }

    let lowerDip = null;
    let upperDip = null;

    for (let i = 0; i < dipValues.length; i++) {
        if (dipValues[i] <= dip) {
            lowerDip = dipValues[i];
        }
        if (dipValues[i] >= dip && upperDip === null) {
            upperDip = dipValues[i];
        }
    }

    if (lowerDip === null) return calibrationData[dipValues[0]];
    if (upperDip === null) return calibrationData[dipValues[dipValues.length - 1]];
    if (lowerDip === upperDip) return calibrationData[lowerDip];

    const lowerVolume = calibrationData[lowerDip];
    const upperVolume = calibrationData[upperDip];
    const ratio = (dip - lowerDip) / (upperDip - lowerDip);

    return lowerVolume + (upperVolume - lowerVolume) * ratio;
}

function findNearestValues(dip) {
    let lowerDip = dipValues[0];
    let upperDip = dipValues[dipValues.length - 1];

    for (let i = 0; i < dipValues.length; i++) {
        if (dipValues[i] <= dip) {
            lowerDip = dipValues[i];
        }
        if (dipValues[i] >= dip) {
            upperDip = dipValues[i];
            break;
        }
    }

    return {
        lower: { dip: lowerDip, volume: calibrationData[lowerDip] },
        upper: { dip: upperDip, volume: calibrationData[upperDip] }
    };
}

function formatNumber(num) {
    return num.toLocaleString('bn-BD');
}

// Allow Enter key to calculate
document.getElementById('dipHeight').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        calculateVolume();
    }
});

// Auto-calculate on input (with debounce)
let debounceTimer;
document.getElementById('dipHeight').addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (this.value !== '') {
            calculateVolume();
        }
    }, 500);
});
