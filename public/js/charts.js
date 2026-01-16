/**
 * Chart.js configuration and utilities
 */

// Global chart configuration
Chart.defaults.color = '#a0a0b0';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
Chart.defaults.font.family = 'Inter, sans-serif';

// Chart instances
let cpuChart, memoryChart, networkChart, diskChart;

// Data history for charts
const MAX_DATA_POINTS = 60; // 60 seconds of data
const chartData = {
    labels: [],
    cpu: [],
    memory: [],
    networkRx: [],
    networkTx: []
};

// Initialize time labels
function initTimeLabels() {
    const now = new Date();
    for (let i = MAX_DATA_POINTS - 1; i >= 0; i--) {
        const time = new Date(now - i * 1000);
        chartData.labels.push(formatTime(time));
        chartData.cpu.push(0);
        chartData.memory.push(0);
        chartData.networkRx.push(0);
        chartData.networkTx.push(0);
    }
}

function formatTime(date) {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Initialize CPU Chart
function initCpuChart() {
    const ctx = document.getElementById('cpu-chart').getContext('2d');

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 120);
    gradient.addColorStop(0, 'rgba(74, 158, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(74, 158, 255, 0)');

    cpuChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'CPU Usage',
                data: chartData.cpu,
                borderColor: '#4a9eff',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30, 30, 50, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#a0a0b0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: (ctx) => `CPU: ${ctx.raw.toFixed(1)}%`
                    }
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        callback: (val) => val + '%',
                        maxTicksLimit: 5
                    }
                }
            }
        }
    });
}

// Initialize Memory Chart
function initMemoryChart() {
    const ctx = document.getElementById('memory-chart').getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 120);
    gradient.addColorStop(0, 'rgba(168, 85, 247, 0.5)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');

    memoryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Memory Usage',
                data: chartData.memory,
                borderColor: '#a855f7',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30, 30, 50, 0.9)',
                    callbacks: {
                        label: (ctx) => `Memory: ${ctx.raw.toFixed(1)}%`
                    }
                }
            },
            scales: {
                x: { display: false },
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        callback: (val) => val + '%',
                        maxTicksLimit: 5
                    }
                }
            }
        }
    });
}

// Initialize Network Chart
function initNetworkChart() {
    const ctx = document.getElementById('network-chart').getContext('2d');

    networkChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [
                {
                    label: 'Download',
                    data: chartData.networkRx,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'Upload',
                    data: chartData.networkTx,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30, 30, 50, 0.9)',
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${formatBytes(ctx.raw)}/s`
                    }
                }
            },
            scales: {
                x: { display: false },
                y: {
                    min: 0,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        callback: (val) => formatBytes(val, true),
                        maxTicksLimit: 5
                    }
                }
            }
        }
    });
}

// Initialize Disk Chart
function initDiskChart(diskData) {
    const ctx = document.getElementById('disk-chart').getContext('2d');

    // Only destroy if chart exists and disk count changed
    if (diskChart && diskChart.data.labels.length !== diskData.filter(d => d.size > 0).length) {
        diskChart.destroy();
        diskChart = null;
    }

    const colors = [
        '#4a9eff',
        '#a855f7',
        '#10b981',
        '#f59e0b',
        '#ef4444',
        '#06b6d4'
    ];

    const labels = [];
    const usedData = [];
    const freeData = [];
    const bgColors = [];
    const legendContainer = document.getElementById('disk-legend');
    legendContainer.innerHTML = '';

    diskData.forEach((disk, index) => {
        if (disk.size > 0) {
            const label = disk.mount || disk.fs;
            labels.push(label);
            usedData.push(disk.used);
            freeData.push(disk.available);
            bgColors.push(colors[index % colors.length]);

            // Create legend item safely (prevent XSS)
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';

            const colorSpan = document.createElement('span');
            colorSpan.className = 'legend-color';
            colorSpan.style.background = colors[index % colors.length];

            const textSpan = document.createElement('span');
            textSpan.textContent = `${label}: ${disk.usedPercent}% (${formatBytes(disk.used)} / ${formatBytes(disk.size)})`;

            legendItem.appendChild(colorSpan);
            legendItem.appendChild(textSpan);
            legendContainer.appendChild(legendItem);
        }
    });

    if (!diskChart) {
        // Create chart only once
        diskChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: usedData,
                    backgroundColor: bgColors,
                    borderColor: 'rgba(15, 15, 26, 0.8)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '65%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(30, 30, 50, 0.9)',
                        callbacks: {
                            label: (ctx) => {
                                const total = diskData[ctx.dataIndex].size;
                                const used = ctx.raw;
                                const percent = ((used / total) * 100).toFixed(1);
                                return `${formatBytes(used)} used (${percent}%)`;
                            }
                        }
                    }
                }
            }
        });
    } else {
        // Update existing chart
        diskChart.data.labels = labels;
        diskChart.data.datasets[0].data = usedData;
        diskChart.data.datasets[0].backgroundColor = bgColors;
        diskChart.update('none');
    }
}

// Update charts with new data
function updateCharts(metrics) {
    const now = new Date();

    // Update labels
    chartData.labels.push(formatTime(now));
    chartData.labels.shift();

    // Update CPU data
    const cpuLoad = parseFloat(metrics.cpu.currentLoad);
    chartData.cpu.push(cpuLoad);
    chartData.cpu.shift();

    // Update Memory data
    const memUsed = parseFloat(metrics.memory.usedPercent);
    chartData.memory.push(memUsed);
    chartData.memory.shift();

    // Update Network data
    let totalRx = 0, totalTx = 0;
    metrics.network.forEach(n => {
        totalRx += n.rxSec || 0;
        totalTx += n.txSec || 0;
    });
    chartData.networkRx.push(totalRx);
    chartData.networkRx.shift();
    chartData.networkTx.push(totalTx);
    chartData.networkTx.shift();

    // Update chart instances
    if (cpuChart) {
        cpuChart.data.labels = chartData.labels;
        cpuChart.data.datasets[0].data = chartData.cpu;
        cpuChart.update('none');
    }

    if (memoryChart) {
        memoryChart.data.labels = chartData.labels;
        memoryChart.data.datasets[0].data = chartData.memory;
        memoryChart.update('none');
    }

    if (networkChart) {
        networkChart.data.labels = chartData.labels;
        networkChart.data.datasets[0].data = chartData.networkRx;
        networkChart.data.datasets[1].data = chartData.networkTx;
        networkChart.update('none');
    }

    // Update disk chart
    if (metrics.disk && metrics.disk.length > 0) {
        initDiskChart(metrics.disk);
    }
}

// Initialize all charts
function initCharts() {
    initTimeLabels();
    initCpuChart();
    initMemoryChart();
    initNetworkChart();
}

// Format bytes to human readable
function formatBytes(bytes, short = false) {
    if (bytes === 0) return short ? '0' : '0 B';

    const k = 1024;
    const sizes = short ? ['B', 'K', 'M', 'G', 'T'] : ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Export for use in other files
window.chartUtils = {
    initCharts,
    updateCharts,
    formatBytes,
    chartData
};
