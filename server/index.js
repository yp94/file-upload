const http = require('http')

const server = http.createServer()
const port = 8080

server.on("request",(req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  // req.on('data', e => {
  //   console.log(e)
  // })
  res.end(JSON.stringify({
    "a39b2628394cc5025511f4f32891ca66":[0,1,3],
    "373df325caf1202040f9da8986ce14ba":true
  }))
  // res.end('foo')
})


server.listen(port, () => {
  console.log(`正在监听端口 ${port}`)
})