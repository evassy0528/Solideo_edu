/**
 * PDF Report Generation Module
 * Tracks system metrics for 5 minutes and generates a PDF report
 */

// Tracking state
let isTracking = false;
let trackingStartTime = null;
let trackingInterval = null;
let trackingData = [];

const TRACKING_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Start 5-minute tracking
function startTracking() {
    if (isTracking) return;

    isTracking = true;
    trackingStartTime = new Date();
    trackingData = [];

    // Update UI
    document.getElementById('start-tracking').disabled = true;
    document.getElementById('start-tracking').innerHTML = '<span>⏳</span> 추적 중...';
    document.getElementById('tracking-status').classList.remove('hidden');

    // Update timer every second
    trackingInterval = setInterval(() => {
        const elapsed = Date.now() - trackingStartTime.getTime();
        const remaining = TRACKING_DURATION - elapsed;

        if (remaining <= 0) {
            stopTracking();
            return;
        }

        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        document.getElementById('tracking-time').textContent =
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);

    console.log('Started 5-minute tracking');
}

// Add metrics to tracking data
function addTrackingMetrics(metrics) {
    if (!isTracking) return;

    trackingData.push({
        timestamp: new Date(),
        cpu: parseFloat(metrics.cpu.currentLoad),
        cpuTemp: metrics.cpu.temperature,
        memory: parseFloat(metrics.memory.usedPercent),
        memoryUsed: metrics.memory.used,
        memoryTotal: metrics.memory.total,
        networkRx: metrics.network.reduce((sum, n) => sum + (n.rxSec || 0), 0),
        networkTx: metrics.network.reduce((sum, n) => sum + (n.txSec || 0), 0),
        disk: metrics.disk,
        processes: metrics.processes,
        gpu: metrics.gpu
    });
}

// Stop tracking and generate PDF
function stopTracking() {
    if (!isTracking) return;

    isTracking = false;
    clearInterval(trackingInterval);

    // Update UI
    document.getElementById('tracking-status').classList.add('hidden');
    document.getElementById('start-tracking').disabled = false;
    document.getElementById('start-tracking').innerHTML = '<span>📊</span> 5분 추적 시작';

    console.log(`Tracking complete. Collected ${trackingData.length} data points.`);

    // Generate PDF report
    generatePDFReport();
}

// Generate PDF Report
async function generatePDFReport() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // Helper functions
    const addNewPage = () => {
        pdf.addPage();
        yPos = margin;
    };

    const checkNewPage = (height) => {
        if (yPos + height > pageHeight - margin) {
            addNewPage();
        }
    };

    // Colors
    const primaryColor = [74, 158, 255];
    const textColor = [50, 50, 50];
    const grayColor = [120, 120, 120];

    // Calculate statistics
    const stats = calculateStatistics();

    // ========== PAGE 1: Title & Summary ==========

    // Title
    pdf.setFillColor(30, 30, 50);
    pdf.rect(0, 0, pageWidth, 45, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('System Resource Monitoring Report', pageWidth / 2, 22, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated: ${new Date().toLocaleString('en-US')}`, pageWidth / 2, 32, { align: 'center' });
    pdf.text(`Tracking Period: ${trackingStartTime.toLocaleTimeString('en-US')} ~ ${new Date().toLocaleTimeString('en-US')} (5 min)`, pageWidth / 2, 38, { align: 'center' });

    yPos = 55;

    // System Info Section
    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('System Information', margin, yPos);
    yPos += 8;

    pdf.setTextColor(...textColor);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    const sysInfo = window.systemInfo || {};
    const infoLines = [
        `Host: ${sysInfo.os?.hostname || 'N/A'}`,
        `OS: ${sysInfo.os?.distro || 'N/A'} ${sysInfo.os?.release || ''}`,
        `CPU: ${sysInfo.cpu?.manufacturer || ''} ${sysInfo.cpu?.brand || 'N/A'} (${sysInfo.cpu?.cores || 0} cores)`,
        `GPU: ${sysInfo.graphics?.[0]?.model || 'N/A'}`
    ];

    infoLines.forEach(line => {
        pdf.text(line, margin, yPos);
        yPos += 5;
    });

    yPos += 10;

    // Summary Statistics Table
    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary Statistics', margin, yPos);
    yPos += 8;

    // Table header
    const colWidths = [45, 35, 35, 35, 30];
    const headers = ['Metric', 'Average', 'Min', 'Max', 'Current'];

    pdf.setFillColor(74, 158, 255);
    pdf.rect(margin, yPos, contentWidth, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');

    let xPos = margin + 2;
    headers.forEach((header, i) => {
        pdf.text(header, xPos, yPos + 5.5);
        xPos += colWidths[i];
    });
    yPos += 8;

    // Table rows
    const rows = [
        ['CPU Usage (%)', stats.cpu.avg.toFixed(1), stats.cpu.min.toFixed(1), stats.cpu.max.toFixed(1), stats.cpu.current.toFixed(1)],
        ['Memory Usage (%)', stats.memory.avg.toFixed(1), stats.memory.min.toFixed(1), stats.memory.max.toFixed(1), stats.memory.current.toFixed(1)],
        ['Download (KB/s)', (stats.networkRx.avg / 1024).toFixed(1), (stats.networkRx.min / 1024).toFixed(1), (stats.networkRx.max / 1024).toFixed(1), (stats.networkRx.current / 1024).toFixed(1)],
        ['Upload (KB/s)', (stats.networkTx.avg / 1024).toFixed(1), (stats.networkTx.min / 1024).toFixed(1), (stats.networkTx.max / 1024).toFixed(1), (stats.networkTx.current / 1024).toFixed(1)]
    ];

    if (stats.cpuTemp.avg > 0) {
        rows.splice(1, 0, ['CPU Temp (C)', stats.cpuTemp.avg.toFixed(1), stats.cpuTemp.min.toFixed(1), stats.cpuTemp.max.toFixed(1), stats.cpuTemp.current.toFixed(1)]);
    }

    pdf.setTextColor(...textColor);
    pdf.setFont('helvetica', 'normal');

    rows.forEach((row, rowIndex) => {
        if (rowIndex % 2 === 0) {
            pdf.setFillColor(245, 245, 250);
            pdf.rect(margin, yPos, contentWidth, 7, 'F');
        }

        xPos = margin + 2;
        row.forEach((cell, i) => {
            pdf.text(String(cell), xPos, yPos + 5);
            xPos += colWidths[i];
        });
        yPos += 7;
    });

    yPos += 15;

    // ========== Charts Section ==========
    checkNewPage(80);

    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Time Series Charts', margin, yPos);
    yPos += 10;

    // Capture charts as images
    try {
        const cpuChartCanvas = document.getElementById('cpu-chart');
        const memoryChartCanvas = document.getElementById('memory-chart');
        const networkChartCanvas = document.getElementById('network-chart');

        if (cpuChartCanvas) {
            const cpuImg = cpuChartCanvas.toDataURL('image/png');
            pdf.setFontSize(10);
            pdf.setTextColor(...textColor);
            pdf.text('CPU Usage Trend', margin, yPos);
            yPos += 3;
            pdf.addImage(cpuImg, 'PNG', margin, yPos, contentWidth, 35);
            yPos += 40;
        }

        checkNewPage(50);

        if (memoryChartCanvas) {
            const memImg = memoryChartCanvas.toDataURL('image/png');
            pdf.text('Memory Usage Trend', margin, yPos);
            yPos += 3;
            pdf.addImage(memImg, 'PNG', margin, yPos, contentWidth, 35);
            yPos += 40;
        }

        checkNewPage(50);

        if (networkChartCanvas) {
            const netImg = networkChartCanvas.toDataURL('image/png');
            pdf.text('Network Traffic Trend', margin, yPos);
            yPos += 3;
            pdf.addImage(netImg, 'PNG', margin, yPos, contentWidth, 35);
            yPos += 40;
        }
    } catch (e) {
        console.error('Error capturing charts:', e);
    }

    // ========== Disk Usage Section ==========
    addNewPage();

    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Disk Usage', margin, yPos);
    yPos += 10;

    const latestData = trackingData[trackingData.length - 1];
    if (latestData && latestData.disk) {
        const diskHeaders = ['Mount Path', 'Total', 'Used', 'Available', 'Usage %'];
        const diskColWidths = [50, 30, 30, 30, 25];

        pdf.setFillColor(74, 158, 255);
        pdf.rect(margin, yPos, contentWidth, 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');

        xPos = margin + 2;
        diskHeaders.forEach((header, i) => {
            pdf.text(header, xPos, yPos + 5.5);
            xPos += diskColWidths[i];
        });
        yPos += 8;

        pdf.setTextColor(...textColor);
        pdf.setFont('helvetica', 'normal');

        latestData.disk.forEach((disk, rowIndex) => {
            if (disk.size > 0) {
                if (rowIndex % 2 === 0) {
                    pdf.setFillColor(245, 245, 250);
                    pdf.rect(margin, yPos, contentWidth, 7, 'F');
                }

                const row = [
                    disk.mount || disk.fs,
                    formatBytesSimple(disk.size),
                    formatBytesSimple(disk.used),
                    formatBytesSimple(disk.available),
                    disk.usedPercent + '%'
                ];

                xPos = margin + 2;
                row.forEach((cell, i) => {
                    pdf.text(String(cell).substring(0, 20), xPos, yPos + 5);
                    xPos += diskColWidths[i];
                });
                yPos += 7;
            }
        });
    }

    yPos += 15;

    // ========== Top Processes Section ==========
    checkNewPage(60);

    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Top Processes (by CPU)', margin, yPos);
    yPos += 10;

    if (latestData && latestData.processes) {
        const procHeaders = ['Process Name', 'PID', 'CPU %', 'MEM %'];
        const procColWidths = [80, 30, 30, 30];

        pdf.setFillColor(74, 158, 255);
        pdf.rect(margin, yPos, contentWidth, 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');

        xPos = margin + 2;
        procHeaders.forEach((header, i) => {
            pdf.text(header, xPos, yPos + 5.5);
            xPos += procColWidths[i];
        });
        yPos += 8;

        pdf.setTextColor(...textColor);
        pdf.setFont('helvetica', 'normal');

        latestData.processes.slice(0, 10).forEach((proc, rowIndex) => {
            if (rowIndex % 2 === 0) {
                pdf.setFillColor(245, 245, 250);
                pdf.rect(margin, yPos, contentWidth, 7, 'F');
            }

            const row = [
                proc.name.substring(0, 35),
                String(proc.pid),
                proc.cpu,
                proc.mem
            ];

            xPos = margin + 2;
            row.forEach((cell, i) => {
                pdf.text(String(cell), xPos, yPos + 5);
                xPos += procColWidths[i];
            });
            yPos += 7;
        });
    }

    // Footer
    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setTextColor(...grayColor);
        pdf.setFontSize(8);
        pdf.text(`Page ${i} / ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text('System Resource Monitor Report', pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    // Open PDF in new browser tab instead of downloading
    const pdfBlobUrl = pdf.output('bloburl');
    window.open(pdfBlobUrl, '_blank');

    console.log(`PDF report generated and opened in new tab`);
    alert(`Report opened in new tab!`);
}

// Calculate statistics from tracking data
function calculateStatistics() {
    const stats = {
        cpu: { avg: 0, min: Infinity, max: -Infinity, current: 0 },
        cpuTemp: { avg: 0, min: Infinity, max: -Infinity, current: 0 },
        memory: { avg: 0, min: Infinity, max: -Infinity, current: 0 },
        networkRx: { avg: 0, min: Infinity, max: -Infinity, current: 0 },
        networkTx: { avg: 0, min: Infinity, max: -Infinity, current: 0 }
    };

    if (trackingData.length === 0) return stats;

    let cpuSum = 0, cpuTempSum = 0, memSum = 0, rxSum = 0, txSum = 0;
    let cpuTempCount = 0;

    trackingData.forEach(data => {
        // CPU
        cpuSum += data.cpu;
        stats.cpu.min = Math.min(stats.cpu.min, data.cpu);
        stats.cpu.max = Math.max(stats.cpu.max, data.cpu);

        // CPU Temp
        if (data.cpuTemp && data.cpuTemp > 0) {
            cpuTempSum += data.cpuTemp;
            cpuTempCount++;
            stats.cpuTemp.min = Math.min(stats.cpuTemp.min, data.cpuTemp);
            stats.cpuTemp.max = Math.max(stats.cpuTemp.max, data.cpuTemp);
        }

        // Memory
        memSum += data.memory;
        stats.memory.min = Math.min(stats.memory.min, data.memory);
        stats.memory.max = Math.max(stats.memory.max, data.memory);

        // Network
        rxSum += data.networkRx;
        txSum += data.networkTx;
        stats.networkRx.min = Math.min(stats.networkRx.min, data.networkRx);
        stats.networkRx.max = Math.max(stats.networkRx.max, data.networkRx);
        stats.networkTx.min = Math.min(stats.networkTx.min, data.networkTx);
        stats.networkTx.max = Math.max(stats.networkTx.max, data.networkTx);
    });

    const n = trackingData.length;
    const latest = trackingData[n - 1];

    stats.cpu.avg = cpuSum / n;
    stats.cpu.current = latest.cpu;

    stats.cpuTemp.avg = cpuTempCount > 0 ? cpuTempSum / cpuTempCount : 0;
    stats.cpuTemp.current = latest.cpuTemp || 0;
    if (stats.cpuTemp.min === Infinity) stats.cpuTemp.min = 0;
    if (stats.cpuTemp.max === -Infinity) stats.cpuTemp.max = 0;

    stats.memory.avg = memSum / n;
    stats.memory.current = latest.memory;

    stats.networkRx.avg = rxSum / n;
    stats.networkRx.current = latest.networkRx;

    stats.networkTx.avg = txSum / n;
    stats.networkTx.current = latest.networkTx;

    // Fix infinity values
    Object.values(stats).forEach(s => {
        if (s.min === Infinity) s.min = 0;
        if (s.max === -Infinity) s.max = 0;
    });

    return stats;
}

// Format bytes simple
function formatBytesSimple(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Format date for filename
function formatDateForFile(date) {
    return date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
}

// Export for use in app.js
window.pdfReport = {
    startTracking,
    addTrackingMetrics,
    isTracking: () => isTracking
};
