// ==========================================================
// TrustTunnel Remote Server Automated Installer & Deployer
// ==========================================================

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = {
  host: '23.177.184.139',
  port: 22,
  username: 'root',
  password: 'HTZeEsXJ'
};

const conn = new Client();
const defaultPassword = require('crypto').randomBytes(8).toString('hex');

console.log('----------------------------------------------------------');
console.log(' Starting Automated TrustTunnel Remote Server Deployment...');
console.log(` Target Server: ${config.host}`);
console.log('----------------------------------------------------------\n');

conn.on('ready', () => {
  console.log('✔ SSH Connection established successfully!');
  
  // Sequence of deployment steps
  runCommand('uname -a && cat /etc/os-release')
    .then(osInfo => {
      console.log('\n--- Server Environment Info ---');
      console.log(osInfo);
      console.log('-------------------------------\n');
      
      console.log('Step 1: Check and Install Node.js on remote server...');
      return installNodeIfNeeded();
    })
    .then(() => {
      console.log('\nStep 2: Download and install official TrustTunnel server...');
      return installTrustTunnel();
    })
    .then(() => {
      console.log('\nStep 3: Creating TrustTunnel directory structure and generating self-signed TLS certificates...');
      return setupTrustTunnelCerts();
    })
    .then(() => {
      console.log('\nStep 4: Writing default TrustTunnel configurations...');
      return writeTrustTunnelConfigs();
    })
    .then(() => {
      console.log('\nStep 5: Preparing directories for Web Panel and uploading assets...');
      return uploadWebPanelAssets();
    })
    .then(() => {
      console.log('\nStep 6: Writing Systemd Service definitions on remote server...');
      return writeSystemdServices();
    })
    .then(() => {
      console.log('\nStep 7: Installing Web Panel production dependencies...');
      return runCommand('cd /opt/trusttunnel-panel && npm install --production');
    })
    .then(() => {
      console.log('\nStep 8: Reloading systemd, enabling, and starting all services...');
      return runCommand('systemctl daemon-reload && systemctl enable trusttunnel && systemctl restart trusttunnel && systemctl enable trusttunnel-panel && systemctl restart trusttunnel-panel');
    })
    .then(() => {
      console.log('\nStep 9: Verifying running services status...');
      return Promise.all([
        runCommand('systemctl status trusttunnel --no-pager | head -n 15'),
        runCommand('systemctl status trusttunnel-panel --no-pager | head -n 15')
      ]);
    })
    .then(([ttStatus, panelStatus]) => {
      console.log('\n--- TrustTunnel Service Status ---');
      console.log(ttStatus);
      console.log('\n--- Web Panel Service Status ---');
      console.log(panelStatus);
      console.log('----------------------------------\n');
      
      console.log('==========================================================');
      console.log('🎉 SUCCESS: TrustTunnel Panel Deployment Completed!');
      console.log(`👉 Access the Panel at: http://${config.host}:3000`);
      console.log(`👉 TrustTunnel is listening on Port: 8443 (obfuscated SOCKS5)`);
      console.log('==========================================================');
      
      conn.end();
    })
    .catch(err => {
      console.error('\n❌ DEPLOYMENT FAILED with error:', err);
      conn.end();
    });
}).connect(config);

// ==========================================
// SSH Execution Helpers
// ==========================================
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    console.log(`[EXEC] ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Command "${cmd}" exited with code ${code}. Error: ${stderr || stdout}`));
        } else {
          resolve(stdout.trim());
        }
      }).on('data', (data) => {
        stdout += data.toString();
      }).stderr.on('data', (data) => {
        stderr += data.toString();
      });
    });
  });
}

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    console.log(`[SFTP UPLOAD] ${localPath} -> ${remotePath}`);
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function writeRemoteFile(sftp, remotePath, content) {
  return new Promise((resolve, reject) => {
    console.log(`[SFTP WRITE] -> ${remotePath}`);
    sftp.writeFile(remotePath, content, 'utf-8', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ==========================================
// Specific Deployment Tasks
// ==========================================

function installNodeIfNeeded() {
  return runCommand('node -v')
    .then(version => {
      console.log(`✔ Node.js is already installed: ${version}`);
    })
    .catch(() => {
      console.log('ℹ Node.js not detected. Installing Node.js v20 LTS...');
      // Detect OS distribution
      return runCommand('cat /etc/os-release')
        .then(osRelease => {
          if (osRelease.includes('ubuntu') || osRelease.includes('debian')) {
            return runCommand('apt-get update && apt-get install -y curl gnupg')
              .then(() => runCommand('curl -fsSL https://deb.nodesource.com/setup_20.x | bash -'))
              .then(() => runCommand('apt-get install -y nodejs'));
          } else {
            // CentOS / Rocky / Fedora / RHEL
            return runCommand('curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -')
              .then(() => runCommand('yum install -y nodejs'));
          }
        });
    });
}

function installTrustTunnel() {
  // Silent run with auto answer yes
  return runCommand('curl -fsSL https://raw.githubusercontent.com/TrustTunnel/TrustTunnel/refs/heads/master/scripts/install.sh | sh -s -- -a y')
    .then(output => {
      console.log('✔ TrustTunnel server installed to /opt/trusttunnel successfully!');
    });
}

function setupTrustTunnelCerts() {
  // Setup is fully managed by the official setup_wizard in Step 4
  return Promise.resolve();
}

function writeTrustTunnelConfigs() {
  const cmd = `cd /opt/trusttunnel && rm -f vpn.toml hosts.toml credentials.toml rules.toml && ` +
              `./setup_wizard -m non-interactive ` +
              `-a 0.0.0.0:8443 ` +
              `-c client_1:${defaultPassword} ` +
              `-n ${config.host} ` +
              `--cert-type self-signed ` +
              `--lib-settings vpn.toml ` +
              `--hosts-settings hosts.toml`;
  return runCommand(cmd).then(() => {
    console.log('✔ Successfully generated all TrustTunnel configs using official setup_wizard!');
  });
}

function uploadWebPanelAssets() {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      
      runCommand('mkdir -p /opt/trusttunnel-panel/public')
        .then(() => {
          const files = [
            { local: './package.json', remote: '/opt/trusttunnel-panel/package.json' },
            { local: './server.js', remote: '/opt/trusttunnel-panel/server.js' },
            { local: './public/index.html', remote: '/opt/trusttunnel-panel/public/index.html' },
            { local: './public/index.css', remote: '/opt/trusttunnel-panel/public/index.css' },
            { local: './public/app.js', remote: '/opt/trusttunnel-panel/public/app.js' }
          ];
          
          let uploadChain = Promise.resolve();
          files.forEach(f => {
            uploadChain = uploadChain.then(() => uploadFile(sftp, f.local, f.remote));
          });
          
          // Generate server-specific db.json with pre-populated first user
          const dbData = {
            settings: {
              serverHost: config.host,
              serverPort: 8443,
              vpnTomlPath: "/opt/trusttunnel/vpn.toml",
              credentialsTomlPath: "/opt/trusttunnel/credentials.toml",
              restartCommand: "systemctl restart trusttunnel",
              customSni: "",
              skipVerification: true, // Since certificate is self-signed!
              dnsUpstreams: ["1.1.1.1", "8.8.8.8"]
            },
            users: [
              {
                username: "client_1",
                password: defaultPassword,
                notes: "First Secure Tunnel",
                enabled: true,
                createdAt: new Date().toISOString()
              }
            ]
          };
          
          return uploadChain.then(() => {
            return writeRemoteFile(sftp, '/opt/trusttunnel-panel/db.json', JSON.stringify(dbData, null, 2));
          });
        })
        .then(() => resolve())
        .catch(reject);
    });
  });
}

function writeSystemdServices() {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      
      const ttService = `[Unit]
Description=TrustTunnel Endpoint Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/trusttunnel
ExecStart=/opt/trusttunnel/trusttunnel_endpoint /opt/trusttunnel/vpn.toml /opt/trusttunnel/hosts.toml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
`;

      const panelService = `[Unit]
Description=TrustTunnel Web Panel
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/trusttunnel-panel
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
`;

      writeRemoteFile(sftp, '/etc/systemd/system/trusttunnel.service', ttService)
        .then(() => writeRemoteFile(sftp, '/etc/systemd/system/trusttunnel-panel.service', panelService))
        .then(() => resolve())
        .catch(reject);
    });
  });
}
