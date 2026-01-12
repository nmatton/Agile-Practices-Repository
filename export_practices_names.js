const path = require('path');
const filePath = path.join( __dirname, 'practices_reference_v2.json');
const fs = require('fs');

fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading the file:', err);
        return;
    }

    try {
        const practices = JSON.parse(data);
        const practiceNames = practices.map(practice => practice.name).filter(name => name); // Filter out undefined names
        console.log('Practice Names:', practiceNames);
    } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
    }
});