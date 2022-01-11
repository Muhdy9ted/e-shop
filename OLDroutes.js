const fs = require('fs')

const requestHandler = (req, res) => {
    const url = req.url;
    const method = req.method;

    if(url === '/'){
        res.write('<html>');
        res.write('<head><title>Enter Message</title></head>');
        res.write('<body><form action="/message" method="POST"><input type="text" name="message"><button type="submit">submit</button></form></body>');
        res.write('</html>');
        return res.end();
    }

    if(url === '/message' && method === 'POST'){
        const body = [];
        req.on('data', (chunk) => {
            body.push(chunk)
        });
        return req.on('end', () => {
            const parsedBody = Buffer.concat(body).toString();
            console.log(body);
            console.log(parsedBody);
            const message = parsedBody.split('=')[1]
            // fs.writeFileSync('message.txt', message);
            fs.writeFile('message.txt', message, (err) => {
                res.statusCode = 302;
                res.setHeader('Location', '/');
                return res.end();
            })
        });
    }
};

module.exports = requestHandler;