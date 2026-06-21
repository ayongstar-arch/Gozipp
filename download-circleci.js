const https = require('https');
const fs = require('fs');

https.get('https://api.github.com/repos/CircleCI-Public/circleci-cli/releases/latest', {
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const release = JSON.parse(data);
    const asset = release.assets.find(a => a.name.includes('windows_amd64.zip'));
    if (asset) {
      console.log('Found URL:', asset.browser_download_url);
    } else {
      console.log('Not found');
    }
  });
});
