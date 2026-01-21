module.exports = {
  apps: [
    // Backend сервер (основной)
    {
      name: 'genchik-crm-backend',
      script: './server/index.js',
      cwd: '/home/millix-vm/apps/genchik_crm',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      error_file: '/home/millix-vm/logs/backend-error.log',
      out_file: '/home/millix-vm/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    // Frontend статика
    {
      name: 'genchik-crm-frontend',
      script: 'serve',
      args: '-s dist -l 3002',
      cwd: '/home/millix-vm/apps/genchik_crm',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/home/millix-vm/logs/frontend-error.log',
      out_file: '/home/millix-vm/logs/frontend-out.log'
    }
  ]
};
