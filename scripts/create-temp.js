const fs = require('fs');
const path = require('path');

process.chdir(__dirname);

const PATH_TEMP = '../.temp';

try {
    fs.mkdirSync(PATH_TEMP);
} catch(e) {
    if ( e.code != 'EEXIST' ) throw e;
}

fs.writeFile(path.join(PATH_TEMP,'index.html'),
    `<!DOCTYPE html>
     <html lang="en">
     <head>
        <meta charset="UTF-8">
        <title>Title</title>
        <script type="text/javascript" src="bundle.js"></script>
        <link rel="stylesheet" type="text/css" href="../style/style.css">
    </head>
    <body>
    </body>
    </html>`);