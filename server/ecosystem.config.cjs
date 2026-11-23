// PM2: pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [{
    name: 'afilink',
    script: 'src/index.js',
    node_args: '--max-old-space-size=128',
    max_memory_restart: '180M',   // VPS 1 GB: restart otomatis kalau membengkak
    env: { NODE_ENV: 'production' },
  }],
};
