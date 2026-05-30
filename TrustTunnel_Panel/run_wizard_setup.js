// ==========================================================
// TrustTunnel Remote Non-Interactive Setup & Inspection
// ==========================================================

const { Client } = require('ssh2');

const config = {
  host: '23.177.184.139',
  port: 22,
  username: 'root',
  password: 'HTZeEsXJ'
};

const conn = new Client();

conn.on('ready', () => {
  console.log('✔ SSH Connected. Running non-interactive setup_wizard...');
  
  const cmd = 'cd /opt/trusttunnel && rm -f vpn.toml hosts.toml credentials.toml rules.toml && ' +
              './setup_wizard -m non-interactive ' +
              '-a 0.0.0.0:8443 ' +
              '-c admin:secretpass ' +
              '-n 23.177.184.139 ' +
              '--cert-type self-signed ' +
              '--lib-settings vpn.toml ' +
              '--hosts-settings hosts.toml';
              
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    let stdout = '';
    stream.on('close', (code) => {
      console.log(`\n✔ Wizard finished with exit code ${code}. Output:`);
      console.log(stdout);
      
      // Let's print the contents of vpn.toml and credentials.toml
      conn.exec('cat /opt/trusttunnel/vpn.toml && echo "---" && cat /opt/trusttunnel/credentials.toml', (err2, stream2) => {
        let filesText = '';
        stream2.on('close', () => {
          console.log('\n--- GENERATED FILES CONTENTS ---');
          console.log(filesText);
          console.log('--------------------------------');
          conn.end();
        }).on('data', (d) => { filesText += d.toString(); });
      });
      
    }).on('data', (data) => {
      stdout += data.toString();
    });
  });
}).connect(config);
