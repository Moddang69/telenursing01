/**
 * ecosystem.config.cjs
 * PM2 Process Manager Config — ใช้กรณี Deploy บน VM/Bare Metal โดยไม่ใช้ Docker
 * รันด้วยคำสั่ง: pm2 start ecosystem.config.cjs --env production
 */
module.exports = {
  apps: [
    {
      name: 'telenursing-backend',
      script: './server.js',
      instances: 1, // Prototype: 1 instance พอ (Socket.io ต้องใช้ Redis Adapter ถ้าจะ scale > 1 instance ในอนาคต)
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
