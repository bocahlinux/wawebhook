module.exports = {
  apps: [
    {
      name: "wa-webhook",
      script: "app.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      time: true,
      out_file: "logs/pm2-out.log",
      error_file: "logs/pm2-error.log",
      env: {
        NODE_ENV: "development",
        PORT: 8181
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 8181
      }
    }
  ]
};
