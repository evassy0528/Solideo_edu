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

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
}

// Update system info display
function updateSystemInfo(info) {
    elements.systemName.textContent = `${info.system?.manufacturer || ''} ${info.system?.model || 'Unknown System'}`;

    let html = '';

    if (info.os) {
        html += `
      <div class="info-row">
        <span class="label">호스트</span>
        <span class="value">${info.os.hostname || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="label">OS</span>
        <span class="value">${info.os.distro || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="label">버전</span>
        <span class="value">${info.os.release || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="label">아키텍처</span>
        <span class="value">${info.os.arch || 'N/A'}</span>
      </div>
    `;
    }

    if (info.cpu) {
        html += `
      <div class="info-row">
        <span class="label">CPU</span>
        <span class="value">${info.cpu.brand || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="label">코어</span>
        <span class="value">${info.cpu.physicalCores || 0} Physical / ${info.cpu.cores || 0} Logical</span>
      </div>
    `;
    }

    elements.systemInfo.innerHTML = html;
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
        let coresHtml = '';
        cpu.cores.forEach(core => {
            coresHtml += `
        <div class="core-item">
          <span class="core-num">Core ${core.core}</span>
          <span class="core-load" style="color: ${getColorForValue(parseFloat(core.load))}">${core.load}%</span>
        </div>
      `;
        });
        elements.cpuCores.innerHTML = coresHtml;
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
    if (!gpuList || gpuList.length === 0) {
        elements.gpuInfo.innerHTML = '<p class="loading">GPU 정보 없음</p>';
        return;
    }

    let html = '';

    gpuList.forEach((gpu, index) => {
        html += `
      <div class="gpu-item">
        <h3>${gpu.vendor} ${gpu.model}</h3>
        <div class="gpu-stats">
          <div class="gpu-stat">
            <span class="stat-label">VRAM</span>
            <span class="stat-value">${gpu.vram ? gpu.vram + ' MB' : 'N/A'}</span>
          </div>
          <div class="gpu-stat">
            <span class="stat-label">온도</span>
            <span class="stat-value">${gpu.temperatureGpu ? gpu.temperatureGpu + '°C' : 'N/A'}</span>
          </div>
          <div class="gpu-stat">
            <span class="stat-label">사용률</span>
            <span class="stat-value">${gpu.utilizationGpu ? gpu.utilizationGpu + '%' : 'N/A'}</span>
          </div>
          <div class="gpu-stat">
            <span class="stat-label">메모리 사용</span>
            <span class="stat-value">${gpu.memoryUsed ? formatBytes(gpu.memoryUsed * 1024 * 1024) : 'N/A'}</span>
          </div>
        </div>
      </div>
    `;
    });

    elements.gpuInfo.innerHTML = html;

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
    if (!processes || processes.length === 0) {
        elements.processesBody.innerHTML = '<tr><td colspan="4" class="loading">프로세스 정보 없음</td></tr>';
        return;
    }

    let html = '';
    processes.forEach(proc => {
        html += `
      <tr>
        <td class="proc-name" title="${proc.name}">${proc.name}</td>
        <td>${proc.pid}</td>
        <td class="proc-cpu">${proc.cpu}%</td>
        <td class="proc-mem">${proc.mem}%</td>
      </tr>
    `;
    });

    elements.processesBody.innerHTML = html;
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
