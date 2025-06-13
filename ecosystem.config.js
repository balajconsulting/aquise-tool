module.exports = {
  apps: [
    {
      name: 'aquise-backend',
      script: 'src/index.js',
      cwd: '/opt/aquise-tool/backend',
      env: { NODE_ENV: 'production' },
      instances: 1,
      autorestart: true,
      watch: false
    },
    {
      name: 'captcha-solver',
      script: '/opt/aquise-tool/backend/captcha_solver/venv/bin/python3',
      args: 'app.py',
      cwd: '/opt/aquise-tool/backend/captcha_solver',
      instances: 1,
      autorestart: true,
      watch: false
    }
  ]
};
