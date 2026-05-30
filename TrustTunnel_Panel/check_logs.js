// ==========================================
// TrustTunnel Remote Log Diagnostics
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
  console.log('✔ SSH Connected. Fetching logs...');
  
  conn.exec('journalctl -u trusttunnel -n 30 --no-pager', (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    let stdout = '';
    stream.on('close', (code) => {
      console.log('\n--- TRUSTTUNNEL LOGS ---');
      console.log(stdout);
      console.log('------------------------');
      conn.end();
    }).on('data', (data) => {
      stdout += data.toString();
    });
  });
}).connect(config);
