// ==========================================
// TrustTunnel Web Server & Port Detector
// ==========================================

const { Client } = require('ssh2');

const config = {
  host: '23.177.184.139',
  port: 22,
  username: 'root',
  password: 'HTZeEsXJ'
};

const conn = new Client();

conn.on('ready', () => {
  console.log('✔ SSH Connected. Detecting active services and ports...');
  
  // 1. Check listening ports and process names
  // 2. Check ufw firewall status
  // 3. Check systemctl status for nginx and caddy
  const cmd = 'ss -tulpn && echo "--- FIREWALL ---" && ufw status || iptables -L -n -v | head -n 20 && ' +
              'echo "--- SYSTEM SERVICES ---" && ' +
              'systemctl status nginx --no-pager || true && ' +
              'systemctl status caddy --no-pager || true';
              
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    let stdout = '';
    stream.on('close', () => {
      console.log('\n--- SERVER PORT & SERVICE DIAGNOSTICS ---');
      console.log(stdout);
      console.log('-----------------------------------------');
      conn.end();
    }).on('data', (data) => {
      stdout += data.toString();
    });
  });
}).connect(config);
