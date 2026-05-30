// ==========================================
// TrustTunnel Remote Server Explorer
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
  console.log('✔ SSH Connected. Exploring /opt/trusttunnel/...');
  
  // List files, and check if there are templates
  conn.exec('ls -la /opt/trusttunnel/ && ls -la /opt/trusttunnel/certs/ || true', (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    let stdout = '';
    stream.on('close', () => {
      console.log('\n--- REMOTE FILES ---');
      console.log(stdout);
      console.log('--------------------');
      
      // Let's run help on trusttunnel_endpoint to see if there are config flags
      conn.exec('/opt/trusttunnel/trusttunnel_endpoint --help || true', (err2, stream2) => {
        let helpText = '';
        stream2.on('close', () => {
          console.log('\n--- ENDPOINT HELP ---');
          console.log(helpText);
          console.log('---------------------');
          conn.end();
        }).on('data', (d) => { helpText += d.toString(); });
      });
      
    }).on('data', (data) => {
      stdout += data.toString();
    });
  });
}).connect(config);
