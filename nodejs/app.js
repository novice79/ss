const https = require('https');
const dgram = require('dgram');
const WebSocket = require('ws');
const _ = require('lodash');
const ssl = require('./ssl');
const port = process.env.PORT || 57000; //isNaN(process.argv[2]) ? 50000 : process.argv[2];
const udp = dgram.createSocket('udp4');
const server = https.createServer({
    cert: ssl.crt,
    key: ssl.key
});
const wss = new WebSocket.Server({ server });
server.listen(port, () => {
    console.log(`service listen on ${port}`)
});

const peers = {}
function get_peers_by_size(size = 100) {
    const chosen = _.sampleSize(Object.keys(peers), size)
    const ps = _.map(chosen, pid=>{
        return{
            id: pid,
            ep: peers[pid].ep
        }
    })
    return {
        peers: ps,
        cmd: 'peers'
    };
}
function send_total(ws) {
    ws.send(JSON.stringify({
        cmd: 'total',
        total: _.size(peers)
    }));
}
function broadcast_total() {
    wss.clients.forEach(ws => send_total(ws))
}
wss.on('connection', ws => {
    ws.is_alive = true;
    ws.on('close', () => {
        delete peers[ws.pid]
        broadcast_total()
    })
    ws.on('message', message => {
        try {
            console.log(message)
            const data = JSON.parse(message)
            console.log(data)
            switch (data.cmd) {
                case 'peer_online': {
                    clearTimeout(ws.idle_tm)
                    const ps = get_peers_by_size();
                    console.log(ps)
                    ws.pid = data.id;
                    peers[data.id] = {
                        ws,
                        token: data.token
                    };
                    ws.send(JSON.stringify(ps))
                    broadcast_total()
                    break;
                }
                case 'need_peers': {
                    const p = get_peers_by_size(data.amount);
                    p.peers = _.filter(p.peers, p => p.id != ws.pid)
                    ws.send(JSON.stringify(p))
                    break;
                }
                case 'send_sig':
                case 'return_sig': {
                    peers[data.to].ws.send(message);
                    break;
                }

                default: throw 'not support cmd'
            }
        } catch (err) {
            console.log(err)
            ws.terminate()
        }
    });
    ws.idle_tm = setTimeout(() => {
        ws.terminate()
    }, 3000)
});
const interval = setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.is_alive === false) {
            delete peers[ws.pid]
            return ws.terminate();
        }
        ws.is_alive = false;
        send_total(ws)
    });
}, 30000);
// udp
udp.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    // udp.close();
});

udp.on('message', (msg, rinfo) => {
    // console.log(`udp got: ${msg} from ${rinfo.address}:${rinfo.port}`);
    // udp.send('echo from server', rinfo.port, rinfo.address)
    if( msg.readUInt8() == 0x18 && msg.length == 9 ){
        const id = msg.readInt32BE(1)
        const token = msg.readUInt32BE(5)
        if( peers.hasOwnProperty(id) ){
            if(peers[id].token == token){
                peers[id].ep = `${rinfo.address}:${rinfo.port}`
                peers[id].ws.is_alive = true;
            }
        }
    }
});

udp.on('listening', () => {
    // const address = udp.address();
    // console.log(`udp server listening ${address.address}:${address.port}`);
});

udp.bind(port);