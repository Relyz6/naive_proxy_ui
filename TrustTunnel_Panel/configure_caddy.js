// ==========================================================
// TrustTunnel Caddy HTTPS & Subdomain Configurator
// ==========================================================

const { Client } = require('ssh2');

const config = {
  host: '23.177.184.139',
  port: 22,
  username: 'root',
  password: 'HTZeEsXJ'
};

const subdomain = 'tt-panel-USA.gamesclub.su';
const conn = new Client();

console.log(`✔ Connecting to server to set up HTTPS on: ${subdomain}...`);

conn.on('ready', () => {
  console.log('✔ Connected. Reading current Caddyfile...');
  
  conn.exec('cat /etc/caddy/Caddyfile', (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    
    let caddyfileContent = '';
    stream.on('close', () => {
      // Check if subdomain is already in Caddyfile to avoid duplicate entries
      if (caddyfileContent.includes(subdomain)) {
        console.log(`ℹ Subdomain ${subdomain} is already present in Caddyfile!`);
        conn.end();
        return;
      }
      
      console.log('✔ Appending reverse-proxy configuration to Caddyfile...');
      const newBlock = `\n# TrustTunnel Web Panel HTTPS Proxy\n${subdomain} {\n\ttls ceo@gamesclub.su\n\treverse_proxy 127.0.0.1:3000\n}\n`;
      
      const updatedCaddyfile = caddyfileContent.trim() + '\n' + newBlock;
      
      // Open SFTP to write updated Caddyfile
      conn.sftp((err2, sftp) => {
        if (err2) {
          console.error(err2);
          conn.end();
          return;
        }
        
        sftp.writeFile('/etc/caddy/Caddyfile', updatedCaddyfile, 'utf-8', (err3) => {
          if (err3) {
            console.error('❌ Failed to write Caddyfile:', err3);
            conn.end();
            return;
          }
          
          console.log('✔ Caddyfile updated. Testing config and reloading Caddy...');
          conn.exec('caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy', (err4, stream2) => {
            if (err4) {
              console.error(err4);
              conn.end();
              return;
            }
            let stdout = '';
            stream2.on('close', (code) => {
              if (code === 0) {
                console.log('✔ Caddy reloaded successfully! SSL certificate is being provisioned.');
                console.log('==========================================================');
                console.log('🎉 HTTPS ACTIVE: Caddy Reverse Proxy is online!');
                console.log(`👉 Access secure Panel at: https://${subdomain}`);
                console.log('==========================================================');
              } else {
                console.error(`❌ Caddy reload failed with exit code: ${code}`);
                console.log(stdout);
              }
              conn.end();
            }).on('data', (d) => { stdout += d.toString(); });
          });
        });
      });
      
    }).on('data', (data) => {
      caddyfileContent += data.toString();
    });
  });
}).connect(config);
