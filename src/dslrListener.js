const net = require('net');
const http = require('http');
const url = require('url');

const ip = "127.0.0.1";
const port = 1501;

http.createServer((req, res) => {
    console.log(url.parse(req.url, true).query['event_type']);
    console.log('-------------------');
//   let body = [];
//   req.on('data', (chunk) => {
//     // Each 'chunk' is a Buffer instance
//     body.push(chunk);
//   }).on('end', () => {
//     body = Buffer.concat(body).toString();
//     // At this point, we have the complete request body
//   });
}).listen(1501);

// const server = net.createServer((socket) => {
//     socket.on('data', (data) => {
//         // console.log(data.toString('utf8'));
//         console.log(data);
//     });
// });

// server.listen(port, ip);
