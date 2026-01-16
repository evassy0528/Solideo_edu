/**
 * Main Application - Socket.io Client & UI Updates
 */

// Socket.io connection
const socket = io();

// Store system info globally
window.systemInfo = null;

// DOM Elements
const elements = {
    systemName: document.getElementById('system-name'),
    lastUpdated: document.getElementById('last-updated'),
    startTracking: document.getElementById('start-tracking'),

    // CPU
    cpuLoad: document.getElementById('cpu-load'),
    cpuTemp: document.getElementById('cpu-temp'),
    cpuGauge: document.getElementById('cpu-gauge'),
    cpuCores: document.getElementById('cpu-cores'),

    // Memory
    memUsedBadge: document.getElementById('mem-used-badge'),
    memoryBarFill: document.getElementById('memory-bar-fill'),
    memUsedLabel: document.getElementById('mem-used-label'),
    memTotalLabel: document.getElementById('mem-total-label'),
    memActive: document.getElementById('mem-active'),
    memAvailable: document.getElementById('mem-available'),
    memSwap: document.getElementById('mem-swap'),

    // GPU
    gpuInfo: document.getElementById('gpu-info'),
    gpuTemp: document.getElementById('gpu-temp'),

    // Network
    netDownload: document.getElementById('net-download'),
    netUpload: document.getElementById('net-upload'),
    netTotalRx: document.getElementById('net-total-rx'),
    netTotalTx: document.getElementById('net-total-tx'),

    // Disk
    diskRead: document.getElementById('disk-read'),
    diskWrite: document.getElementById('disk-write'),

    // Processes
    processesBody: document.getElementById('processes-body'),

    // System Info
    systemInfo: document.getElementById('system-info')
};

// Initialize application
function init() {
    // Initialize charts
    window.chartUtils.initCharts();

    // Set up event listeners
    elements.startTracking.addEventListener('click', () => {
        window.pdfReport.startTracking();
    });

    // Socket event listeners
    socket.on('connect', () => {
        console.log('Connected to server');
        elements.lastUpdated.style.color = '';
        elements.lastUpdated.textContent = `마지막 업데이트: ${new Date().toLocaleTimeString('ko-KR')}`;
    });

    socket.on('systemInfo', (info) => {
        window.systemInfo = info;
        updateSystemInfo(info);
    });

    socket.on('metrics', (metrics) => {
        updateUI(metrics);
        window.chartUtils.updateCharts(metrics);

        // Add to tracking if active
        if (window.pdfReport.isTracking()) {
            window.pdfReport.addTrackingMetrics(metrics);
        }
    });

    socket.on('metricsError', (error) => {
        console.error('Metrics error from server:', error);
        // Show error to user
        elements.lastUpdated.textContent = `⚠️ 에러: ${error.message}`;
        elements.lastUpdated.style.color = '#ef4444';
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        elements.lastUpdated.textContent = '❌ 서버와의 연결 끊김';
        elements.lastUpdated.style.color = '#ef4444';
    });
}

// Update system info display
function updateSystemInfo(info) {
    elements.systemName.textContent = `${info.system?.manufacturer || ''} ${info.system?.model || 'Unknown System'}`;

    // Clear previous content
    elements.systemInfo.innerHTML = '';

    if (info.os) {
        const infoRows = [
            { label: '호스트', value: info.os.hostname || 'N/A' },
            { label: 'OS', value: info.os.distro || 'N/A' },
            { label: '버전', value: info.os.release || 'N/A' },
            { label: '아키텍처', value: info.os.arch || 'N/A' }
        ];

        infoRows.forEach(row => {
            const infoRow = document.createElement('div');
            infoRow.className = 'info-row';

            const labelSpan = document.createElement('span');
            labelSpan.className = 'label';
            labelSpan.textContent = row.label;

            const valueSpan = document.createElement('span');
            valueSpan.className = 'value';
            valueSpan.textContent = row.value;

            infoRow.appendChild(labelSpan);
            infoRow.appendChild(valueSpan);
            elements.systemInfo.appendChild(infoRow);
        });
    }

    if (info.cpu) {
        const cpuRows = [
            { label: 'CPU', value: info.cpu.brand || 'N/A' },
            { label: '코어', value: `${info.cpu.physicalCores || 0} Physical / ${info.cpu.cores || 0} Logical` }
        ];

        cpuRows.forEach(row => {
            const infoRow = document.createElement('div');
            infoRow.className = 'info-row';

            const labelSpan = document.createElement('span');
            labelSpan.className = 'label';
            labelSpan.textContent = row.label;

            const valueSpan = document.createElement('span');
            valueSpan.className = 'value';
            valueSpan.textContent = row.value;

            infoRow.appendChild(labelSpan);
            infoRow.appendChild(valueSpan);
            elements.systemInfo.appendChild(infoRow);
        });
    }
}

// Update UI with new metrics
function updateUI(metrics) {
    // Update timestamp
    elements.lastUpdated.textContent = `마지막 업데이트: ${new Date().toLocaleTimeString('ko-KR')}`;

    // Update CPU
    updateCPU(metrics.cpu);

    // Update Memory
    updateMemory(metrics.memory);

    // Update GPU
    updateGPU(metrics.gpu);

    // Update Network
    updateNetwork(metrics.network);

    // Update Disk I/O
    updateDiskIO(metrics.diskIO);

    // Update Processes
    updateProcesses(metrics.processes);
}

// Update CPU display
function updateCPU(cpu) {
    const load = parseFloat(cpu.currentLoad);

    elements.cpuLoad.textContent = load.toFixed(0);

    // Update gauge
    const offset = 126 - (load / 100) * 126;
    elements.cpuGauge.style.strokeDashoffset = offset;
    elements.cpuGauge.style.stroke = getColorForValue(load);

    // Update temperature badge
    if (cpu.temperature) {
        elements.cpuTemp.textContent = `${cpu.temperature}°C`;
        elements.cpuTemp.style.borderColor = getColorForTemp(cpu.temperature);
        elements.cpuTemp.style.color = getColorForTemp(cpu.temperature);
    }

    // Update cores
    if (cpu.cores && cpu.cores.length > 0) {
        elements.cpuCores.innerHTML = ''; // Clear previous
        cpu.cores.forEach(core => {
            const coreItem = document.createElement('div');
            coreItem.className = 'core-item';

            const coreNum = document.createElement('span');
            coreNum.className = 'core-num';
            coreNum.textContent = `Core ${core.core}`;

            const coreLoad = document.createElement('span');
            coreLoad.className = 'core-load';
            coreLoad.style.color = getColorForValue(parseFloat(core.load));
            coreLoad.textContent = `${core.load}%`;

            coreItem.appendChild(coreNum);
            coreItem.appendChild(coreLoad);
            elements.cpuCores.appendChild(coreItem);
        });
    }
}

// Update Memory display
function updateMemory(mem) {
    const usedPercent = parseFloat(mem.usedPercent);
    const usedGB = mem.used / (1024 * 1024 * 1024);
    const totalGB = mem.total / (1024 * 1024 * 1024);

    elements.memUsedBadge.textContent = `${usedGB.toFixed(1)} GB`;
    elements.memoryBarFill.style.width = `${usedPercent}%`;
    elements.memUsedLabel.textContent = `${usedGB.toFixed(1)} GB used`;
    elements.memTotalLabel.textContent = `${totalGB.toFixed(1)} GB total`;

    elements.memActive.textContent = formatBytes(mem.active);
    elements.memAvailable.textContent = formatBytes(mem.available);
    elements.memSwap.textContent = formatBytes(mem.swapUsed);
}

// Update GPU display
function updateGPU(gpuList) {
    elements.gpuInfo.innerHTML = ''; // Clear previous

    if (!gpuList || gpuList.length === 0) {
        const noGpu = document.createElement('p');
        noGpu.className = 'loading';
        noGpu.textContent = 'GPU 정보 없음';
        elements.gpuInfo.appendChild(noGpu);
        return;
    }

    gpuList.forEach((gpu) => {
        const gpuItem = document.createElement('div');
        gpuItem.className = 'gpu-item';

        const title = document.createElement('h3');
        title.textContent = `${gpu.vendor} ${gpu.model}`;

        const statsDiv = document.createElement('div');
        statsDiv.className = 'gpu-stats';

        const stats = [
            { label: 'VRAM', value: gpu.vram ? gpu.vram + ' MB' : 'N/A' },
            { label: '온도', value: gpu.temperatureGpu ? gpu.temperatureGpu + '°C' : 'N/A' },
            { label: '사용률', value: gpu.utilizationGpu ? gpu.utilizationGpu + '%' : 'N/A' },
            { label: '메모리 사용', value: gpu.memoryUsed ? formatBytes(gpu.memoryUsed * 1024 * 1024) : 'N/A' }
        ];

        stats.forEach(stat => {
            const statDiv = document.createElement('div');
            statDiv.className = 'gpu-stat';

            const labelSpan = document.createElement('span');
            labelSpan.className = 'stat-label';
            labelSpan.textContent = stat.label;

            const valueSpan = document.createElement('span');
            valueSpan.className = 'stat-value';
            valueSpan.textContent = stat.value;

            statDiv.appendChild(labelSpan);
            statDiv.appendChild(valueSpan);
            statsDiv.appendChild(statDiv);
        });

        gpuItem.appendChild(title);
        gpuItem.appendChild(statsDiv);
        elements.gpuInfo.appendChild(gpuItem);
    });

    // Update GPU temp badge
    if (gpuList[0].temperatureGpu) {
        elements.gpuTemp.textContent = `${gpuList[0].temperatureGpu}°C`;
    }
}

// Update Network display
function updateNetwork(networkList) {
    let totalRxSec = 0, totalTxSec = 0;
    let totalRxBytes = 0, totalTxBytes = 0;

    networkList.forEach(net => {
        totalRxSec += net.rxSec || 0;
        totalTxSec += net.txSec || 0;
        totalRxBytes += net.rxBytes || 0;
        totalTxBytes += net.txBytes || 0;
    });

    elements.netDownload.textContent = formatBytes(totalRxSec) + '/s';
    elements.netUpload.textContent = formatBytes(totalTxSec) + '/s';
    elements.netTotalRx.textContent = formatBytes(totalRxBytes);
    elements.netTotalTx.textContent = formatBytes(totalTxBytes);
}

// Update Disk I/O display
function updateDiskIO(diskIO) {
    elements.diskRead.textContent = formatBytes(diskIO.readPerSec) + '/s';
    elements.diskWrite.textContent = formatBytes(diskIO.writePerSec) + '/s';
}

// Update Processes table
function updateProcesses(processes) {
    elements.processesBody.innerHTML = ''; // Clear previous

    if (!processes || processes.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.className = 'loading';
        td.textContent = '프로세스 정보 없음';
        tr.appendChild(td);
        elements.processesBody.appendChild(tr);
        return;
    }

    processes.forEach(proc => {
        const tr = document.createElement('tr');

        const nameCell = document.createElement('td');
        nameCell.className = 'proc-name';
        nameCell.title = proc.name;
        nameCell.textContent = proc.name;

        const pidCell = document.createElement('td');
        pidCell.textContent = proc.pid;

        const cpuCell = document.createElement('td');
        cpuCell.className = 'proc-cpu';
        cpuCell.textContent = `${proc.cpu}%`;

        const memCell = document.createElement('td');
        memCell.className = 'proc-mem';
        memCell.textContent = `${proc.mem}%`;

        tr.appendChild(nameCell);
        tr.appendChild(pidCell);
        tr.appendChild(cpuCell);
        tr.appendChild(memCell);
        elements.processesBody.appendChild(tr);
    });
}

// Utility functions
function formatBytes(bytes) {
    return window.chartUtils.formatBytes(bytes);
}

function getColorForValue(value) {
    if (value < 50) return '#10b981';
    if (value < 75) return '#f59e0b';
    return '#ef4444';
}

function getColorForTemp(temp) {
    if (temp < 50) return '#10b981';
    if (temp < 70) return '#f59e0b';
    return '#ef4444';
}

// Start application
document.addEventListener('DOMContentLoaded', init);
