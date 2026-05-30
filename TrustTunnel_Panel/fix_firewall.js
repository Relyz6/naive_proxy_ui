// ==========================================
// TrustTunnel Firewall Configurator
// ==========================================

const { Client } = require('ssh2');

const config = {
  host: '23.177.184.139',
  port: 22,
  username: 'root',
  password: 'HTZeEsXJ'
};

const conn = new Client();

console.log('✔ Connecting to server to open TrustTunnel firewall ports...');

conn.on('ready', () => {
  console.log('✔ Connected. Allowing port 8443 (TCP & UDP) in UFW...');
  
  const cmd = 'ufw allow 8443/tcp && ufw allow 8443/udp && ufw reload && ufw status';
  
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    
    let stdout = '';
    stream.on('close', (code) => {
      console.log(`\n✔ Firewall updated successfully (Exit Code: ${code})!`);
      console.log('\n--- Active UFW Rules ---');
      console.log(stdout);
      console.log('------------------------');
      
      // Let's also check TrustTunnel service logs just to make sure it is running cleanly
      conn.exec('systemctl status trusttunnel --no-pager | head -n 10', (err2, stream2) => {
        let ttStatus = '';
        stream2.on('close', () => {
          console.log('\n--- TrustTunnel Service Status ---');
          console.log(ttStatus);
          console.log('----------------------------------');
          conn.end();
        }).on('data', (d) => { ttStatus += d.toString(); });
      });
      
    }).on('data', (data) => {
      stdout += data.toString();
    });
  });
}).connect(config);
