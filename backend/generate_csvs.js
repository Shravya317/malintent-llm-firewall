const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchRows(dataset, split, offset, length) {
  return new Promise((resolve, reject) => {
    const url = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(dataset)}&config=default&split=${encodeURIComponent(split)}&offset=${offset}&length=${length}`;
    https.get(url, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch(e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchAllRows(dataset, split, totalRows) {
  let allRows = [];
  let offset = 0;
  const limit = 100;
  while (offset < totalRows) {
    console.log(`Fetching ${dataset} [${split}] offset ${offset}/${totalRows}...`);
    const data = await fetchRows(dataset, split, offset, limit);
    if (!data.rows) {
      console.error("Error fetching rows:", data);
      break;
    }
    allRows = allRows.concat(data.rows.map(r => r.row));
    offset += limit;
  }
  return allRows;
}

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function writeCSV(filename, columns, data) {
  const header = columns.map(escapeCSV).join(',');
  const lines = data.map(row => columns.map(col => escapeCSV(row[col])).join(','));
  const content = [header, ...lines].join('\n');
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, content);
  console.log(`Saved ${filename}`);
}

async function main() {
  try {
    // 1. jailbreak-classification
    const jbRows = await fetchAllRows('jackhhao/jailbreak-classification', 'test', 262);
    const jbFiltered = jbRows.filter(r => r.type === 'jailbreak').map(r => ({
      text: r.prompt,
      label: 1,
      owasp_category: 'jailbreak'
    }));
    writeCSV('backend/data/jailbreak_classification.csv', ['text', 'label', 'owasp_category'], jbFiltered);
    
    // 2. NotInject
    const ni1 = await fetchAllRows('leolee99/NotInject', 'NotInject_one', 113);
    const ni2 = await fetchAllRows('leolee99/NotInject', 'NotInject_two', 113);
    const ni3 = await fetchAllRows('leolee99/NotInject', 'NotInject_three', 113);
    const niAll = [...ni1, ...ni2, ...ni3];
    
    const niMapped = niAll.map(r => ({
      text: r.prompt,
      label: 0,
      owasp_category: r.category ? r.category : 'benign'
    }));
    writeCSV('backend/data/notinject.csv', ['text', 'label', 'owasp_category'], niMapped);
    
    // 3. gandalf
    const gdRows = await fetchAllRows('Lakera/gandalf_ignore_instructions', 'test', 112);
    const gdMapped = gdRows.map(r => ({
      text: r.text,
      label: 1,
      owasp_category: 'instruction_override'
    }));
    writeCSV('backend/data/gandalf.csv', ['text', 'label', 'owasp_category'], gdMapped);
    
    console.log("All CSV files generated successfully in backend/data/!");
  } catch (error) {
    console.error("Failed to generate datasets:", error);
  }
}

main();
