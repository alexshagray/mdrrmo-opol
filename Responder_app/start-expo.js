const { spawn } = require('child_process');
const os = require('os');

function getLocalIp() {
  const nets = os.networkInterfaces();
  let fallbackIp = '127.0.0.1';
  const preferredIps = [];
  const otherIps = [];

  for (const name of Object.keys(nets)) {
    // Skip virtual network adapters like WSL, VirtualBox, VMware, vEthernet, etc.
    const isVirtual = /virtual|vbox|vmware|loopback|wsl|vEthernet/i.test(name);
    const isPreferred = /wi-fi|wifi|wlan|wireless|ethernet|local/i.test(name);

    for (const net of nets[name]) {
      // Look for non-internal IPv4 addresses
      const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
      if (net.family === familyV4Value && !net.internal) {
        if (isPreferred && !isVirtual) {
          preferredIps.push(net.address);
        } else if (!isVirtual) {
          otherIps.push(net.address);
        } else {
          fallbackIp = net.address;
        }
      }
    }
  }

  if (preferredIps.length > 0) return preferredIps[0];
  if (otherIps.length > 0) return otherIps[0];
  return fallbackIp;
}

const localIp = getLocalIp();
console.log(`\n======================================================`);
console.log(`[Metro Wireless Config]`);
console.log(`- Detected local network IP: ${localIp}`);
console.log(`- Setting REACT_NATIVE_PACKAGER_HOSTNAME = ${localIp}`);
console.log(`======================================================\n`);

process.env.REACT_NATIVE_PACKAGER_HOSTNAME = localIp;

const args = process.argv.slice(2);
const command = 'npx';
// Run expo start with any arguments passed to this wrapper script
const commandArgs = ['expo', 'start', ...args];

const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    REACT_NATIVE_PACKAGER_HOSTNAME: localIp
  }
});

child.on('close', (code) => {
  process.exit(code || 0);
});
