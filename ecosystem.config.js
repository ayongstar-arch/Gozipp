module.exports = {
    apps: [
        {
            name: 'winno-backend',
            script: 'dist/main.js',
            instances: 'max',
            exec_mode: 'cluster',
            autorestart: true,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
            }
        },
        {
            name: 'winno-frontend',
            script: 'node_modules/next/dist/bin/next',
            args: 'start',
            instances: 1,
            autorestart: true,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'development',
                PORT: 3000
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 5173
            }
        }
    ]
};
