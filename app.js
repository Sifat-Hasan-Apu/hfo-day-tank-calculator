// HFO Day Tank Volume Calculator - Main Application Logic

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

    // Show breakdown
    showBreakdown(breakdownCard, breakdownContent, result, dipHeight);
}

function showBreakdown(card, content, result, dipHeight) {
    if (result.hasFraction && dipHeight >= 230) {
        // Show breakdown for fractional values
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
        // Exact value from chart
        content.innerHTML = `
            <div class="breakdown-row">
                <span class="breakdown-label">চার্ট থেকে সরাসরি মান</span>
                <span class="breakdown-value">${formatNumber(Math.round(result.total))} লিটার</span>
            </div>
        `;
        card.classList.add('show');
    } else {
        // Interpolated value
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
    // Check if exact value exists in calibration data
    if (calibrationData.hasOwnProperty(dip)) {
        return {
            total: calibrationData[dip],
            hasFraction: false
        };
    }

    // For DIP values 230mm and above, use fractional table
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

    // Linear interpolation for values below 230mm
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
    // Check if exact value exists in calibration data
    if (calibrationData.hasOwnProperty(dip)) {
        return calibrationData[dip];
    }

    // For DIP values 230mm and above, use fractional table
    if (dip >= 230) {
        // Get the base 10mm value (floor to nearest 10)
        const baseDip = Math.floor(dip / 10) * 10;
        const fraction = dip % 10;

        // Check if base value exists
        if (calibrationData.hasOwnProperty(baseDip)) {
            const baseVolume = calibrationData[baseDip];
            // Add fractional volume if fraction exists
            if (fraction > 0 && fractionalTable.hasOwnProperty(fraction)) {
                return baseVolume + fractionalTable[fraction];
            }
            return baseVolume;
        }
    }

    // For values below 230mm or if base not found, use linear interpolation
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

    // Edge cases
    if (lowerDip === null) return calibrationData[dipValues[0]];
    if (upperDip === null) return calibrationData[dipValues[dipValues.length - 1]];
    if (lowerDip === upperDip) return calibrationData[lowerDip];

    // Linear interpolation
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
