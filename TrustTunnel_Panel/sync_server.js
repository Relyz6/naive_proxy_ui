// ==========================================
// TrustTunnel Quick Server Updater
// ==========================================

const { Client } = require('ssh2');
const fs = require('fs');

const config = {
  host: '23.177.184.139',
  port: 22,
  username: 'root',
  password: 'HTZeEsXJ'
};

const conn = new Client();

console.log('✔ Connecting to server for hot update...');

conn.on('ready', () => {
  console.log('✔ Connected. Opening SFTP session...');
  
  conn.sftp((err, sftp) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    
    console.log('✔ Uploading updated server.js to remote panel...');
    sftp.fastPut('./server.js', '/opt/trusttunnel-panel/server.js', (err2) => {
      if (err2) {
        console.error('❌ Failed to upload server.js:', err2);
        conn.end();
        return;
      }
      
      console.log('✔ Uploaded! Restarting trusttunnel-panel service...');
      conn.exec('systemctl restart trusttunnel-panel && systemctl status trusttunnel-panel --no-pager | head -n 12', (err3, stream) => {
        if (err3) {
          console.error(err3);
          conn.end();
          return;
        }
        let stdout = '';
        stream.on('close', (code) => {
          console.log(`\n✔ Panel restarted successfully (Exit Code: ${code})!`);
          console.log('\n--- Web Panel Status ---');
          console.log(stdout);
          console.log('------------------------');
          conn.end();
        }).on('data', (d) => { stdout += d.toString(); });
      });
    });
  });
}).connect(config);
