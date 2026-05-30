// ==========================================
// TrustTunnel Remote Caddyfile Reader
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
  console.log('✔ SSH Connected. Reading /etc/caddy/Caddyfile...');
  
  conn.exec('cat /etc/caddy/Caddyfile', (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    let stdout = '';
    stream.on('close', () => {
      console.log('\n--- REMOTE CADDYFILE ---');
      console.log(stdout);
      console.log('------------------------');
      conn.end();
    }).on('data', (data) => {
      stdout += data.toString();
    });
  });
}).connect(config);
