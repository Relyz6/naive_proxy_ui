// ==========================================
// TrustTunnel Remote Wizard Checker
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
  console.log('✔ SSH Connected. Running setup_wizard --help...');
  
  conn.exec('/opt/trusttunnel/setup_wizard --help || true', (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    let stdout = '';
    stream.on('close', () => {
      console.log('\n--- WIZARD HELP ---');
      console.log(stdout);
      console.log('-------------------');
      conn.end();
    }).on('data', (data) => {
      stdout += data.toString();
    });
  });
}).connect(config);
