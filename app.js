
const WebSocket = require('ws');
const _ = require('lodash');
const port = 57000;
const wss = new WebSocket.Server({ port }, ()=>{
    console.log(`service listen on ${port}`)
});
const peers = {}
wss.on('connection', ws => {
  ws.on('message', message => {
    try {
        const data = JSON.parse(message)
        switch (data.cmd){
            case 'peer_online':{
                clearTimeout(ws.idle_tm)
                const p = _.sampleSize(Object.keys(peers), 100);
                peers[data.id] = ws;
                ws.send( JSON.stringify(p) )
                break;
            }
            case 'need_peers':{

                break;
            }
        }
    } catch (err) {
        ws.terminate()
    }
  });
  ws.idle_tm = setTimeout(()=>{
    ws.terminate()
  }, 3000)
});