module.exports = {
  apps: [
    {
      name: 'neighs-of-thunder',
      script: 'node_modules/.bin/tsx',
      args: 'server.ts',
      exec_mode: 'fork',
      instances: 1,
      watch: false,
      time: true,
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
        PORT: '3000'
      }
    }
  ]
}
