const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const si = require('systeminformation');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Serve static files
app.use(express.static('public'));

// Get system info once on startup
let systemInfo = {};

async function initSystemInfo() {
  try {
    const [cpu, system, osInfo, graphics] = await Promise.all([
      si.cpu(),
      si.system(),
      si.osInfo(),
      si.graphics()
    ]);
    
    systemInfo = {
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
        speed: cpu.speed
      },
      system: {
        manufacturer: system.manufacturer,
        model: system.model
      },
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch,
        hostname: os.hostname()
      },
      graphics: graphics.controllers.map(g => ({
        vendor: g.vendor,
        model: g.model,
        vram: g.vram
      }))
    };
  } catch (error) {
    console.error('Error getting system info:', error);
  }
}

// Collect real-time metrics
async function collectMetrics() {
  try {
    const [
      cpuLoad,
      cpuTemp,
      mem,
      fsSize,
      diskIO,
      networkStats,
      processes,
      graphics
    ] = await Promise.all([
      si.currentLoad(),
      si.cpuTemperature(),
      si.mem(),
      si.fsSize(),
      si.disksIO(),
      si.networkStats(),
      si.processes(),
      si.graphics()
    ]);

    // CPU Data
    const cpuData = {
      currentLoad: cpuLoad.currentLoad.toFixed(1),
      cores: cpuLoad.cpus.map((c, i) => ({
        core: i,
        load: c.load.toFixed(1)
      })),
      temperature: cpuTemp.main || null,
      temperatureCores: cpuTemp.cores || []
    };

    // Memory Data
    const memData = {
      total: mem.total,
      used: mem.used,
      free: mem.free,
      active: mem.active,
      available: mem.available,
      swapTotal: mem.swaptotal,
      swapUsed: mem.swapused,
      usedPercent: ((mem.used / mem.total) * 100).toFixed(1)
    };

    // Disk Data
    const diskData = fsSize.map(disk => ({
      fs: disk.fs,
      type: disk.type,
      size: disk.size,
      used: disk.used,
      available: disk.available,
      usedPercent: disk.use.toFixed(1),
      mount: disk.mount
    }));

    // Disk I/O
    const diskIOData = {
      readPerSec: diskIO.rIO_sec || 0,
      writePerSec: diskIO.wIO_sec || 0,
      totalReadBytes: diskIO.rIO || 0,
      totalWriteBytes: diskIO.wIO || 0
    };

    // Network Data
    const networkData = networkStats
      .filter(n => n.iface !== 'lo0' && (n.rx_sec > 0 || n.tx_sec > 0 || n.rx_bytes > 0))
      .map(n => ({
        iface: n.iface,
        rxSec: n.rx_sec,
        txSec: n.tx_sec,
        rxBytes: n.rx_bytes,
        txBytes: n.tx_bytes
      }));

    // Top Processes
    const topProcesses = processes.list
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 10)
      .map(p => ({
        name: p.name,
        pid: p.pid,
        cpu: p.cpu.toFixed(1),
        mem: p.mem.toFixed(1),
        command: p.command ? p.command.substring(0, 50) : ''
      }));

    // GPU Data
    const gpuData = graphics.controllers.map(g => ({
      vendor: g.vendor,
      model: g.model,
      vram: g.vram,
      temperatureGpu: g.temperatureGpu || null,
      utilizationGpu: g.utilizationGpu || null,
      memoryUsed: g.memoryUsed || null,
      memoryTotal: g.memoryTotal || null
    }));

    return {
      timestamp: new Date().toISOString(),
      cpu: cpuData,
      memory: memData,
      disk: diskData,
      diskIO: diskIOData,
      network: networkData,
      processes: topProcesses,
      gpu: gpuData,
      systemInfo: systemInfo
    };
  } catch (error) {
    console.error('Error collecting metrics:', error);
    return null;
  }
}

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send system info immediately
  socket.emit('systemInfo', systemInfo);

  // Send metrics every second
  const metricsInterval = setInterval(async () => {
    const metrics = await collectMetrics();
    if (metrics) {
      socket.emit('metrics', metrics);
    }
  }, 1000);

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    clearInterval(metricsInterval);
  });
});

// Start server
initSystemInfo().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🖥️  System Monitor running at http://localhost:${PORT}\n`);
  });
});
