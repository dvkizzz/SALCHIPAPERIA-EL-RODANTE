const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const dom = new JSDOM(html, { 
    runScripts: "dangerously", 
    resources: "usable",
    url: "file:///C:/Users/Lenovo/Downloads/SALCHIPAPERIA%20EL%20RODANTE/index.html" 
});

const window = dom.window;

window.console.error = (...args) => { console.log('ERROR CAUGHT:', ...args); };
window.console.log = (...args) => { console.log('LOG CAUGHT:', ...args); };
window.console.warn = (...args) => { console.log('WARN CAUGHT:', ...args); };

setTimeout(() => { 
    console.log('HTML after 3s:', window.document.querySelector('#products-grid').innerHTML); 
    process.exit(0); 
}, 3000);
