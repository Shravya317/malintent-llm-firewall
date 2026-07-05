const https = require('https');

function checkSize(dataset) {
  return new Promise((resolve, reject) => {
    https.get(`https://datasets-server.huggingface.co/size?dataset=${dataset}`, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}

async function main() {
  const d1 = await checkSize('jackhhao/jailbreak-classification');
  console.log('jailbreak-classification:', JSON.stringify(d1.size.splits));
  
  const d2 = await checkSize('leolee99/NotInject');
  console.log('NotInject:', JSON.stringify(d2.size.splits));
  
  const d3 = await checkSize('Lakera/gandalf_ignore_instructions');
  console.log('gandalf:', JSON.stringify(d3.size.splits));
}

main().catch(console.error);
