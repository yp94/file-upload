const http = require('http')
const action = require('./action')

const server = http.createServer()
const port = 8080

server.on("request",(req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if(req.url === '/check') {
    action.checkUploaded(req, res)
  }

  if(req.url === '/upload') {
    action.uploadFile(req, res)
  }
})


server.listen(port, () => {
  console.log(`正在监听端口 ${port}`)
})