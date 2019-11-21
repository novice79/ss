const https = require('https');
const dgram = require('dgram');
const WebSocket = require('ws');
const _ = require('lodash');
const BT = require('bittorrent-tracker').Server
// const moment = require('moment');
// require('log-timestamp')(() => `[${moment().format('YYYY-MM-DD HH:mm:ss SSS')}] %s`);
const ssl = require('./ssl');
const port = process.env.PORT || 57000; //isNaN(process.argv[2]) ? 50000 : process.argv[2];
const udp = dgram.createSocket('udp4');
const server = https.createServer({
    cert: ssl.crt,
    key: ssl.key
});

const TRACKER_PORT = process.env.TRACKER_PORT || 2018;
const TURN_USER = process.env.TURN_USER;
const TURN_PASS = process.env.TURN_PASS;
const wss = new WebSocket.Server({ server });
const bt = new BT();
server.listen(port, () => {
    console.log(`service listen on ${port}; TURN_USER=${TURN_USER} & TURN_PASS=${TURN_PASS}`)
});
bt.listen(TRACKER_PORT, ()=>{
    console.log(`bittorrent-tracker listen on ${TRACKER_PORT};`)
});
const peers = new Map();
function get_peers_by_size(size = 100) {
    const chosen = _.sampleSize( [...peers.keys()], size )
    return {
        peers: chosen,
        cmd: 'peers'
    };
}
function send_total(ws) {
    // console.log(`peers.size=${peers.size}`)
    ws.send(JSON.stringify({
        cmd: 'total',
        total: peers.size
    }));
}
function broadcast_msg_except(msg, sender) {
    wss.clients.forEach(ws => {
        if (sender != ws) ws.send(msg) 
    });
}
function broadcast_total() {
    wss.clients.forEach(ws => send_total(ws))
}
wss.on('connection', ws => {
    ws.is_alive = true;
    ws.on('close', () => {
        peers.delete(ws.pid)
        broadcast_total()
    })
    ws.on('message', message => {
        try {
            // console.log(message)
            const data = JSON.parse(message)
            // console.log(data)
            switch (data.cmd) {
                case 'to_all': {
                    if( !(ws.pid && data.content && data.content.length < 30) ) return;
                    if(!ws.cd){
                        data.from = ws.pid;
                        broadcast_msg_except(JSON.stringify(data), ws)
                        ws.cd = true;
                        setTimeout(()=>{
                            ws.cd = false;
                        }, 120 * 1000)
                    } else {
                        ws.send(JSON.stringify({
                            cmd: 'too_quick'
                        }));
                    }
                    break;
                }
                case 'peer_online': {
                    clearTimeout(ws.idle_tm);
                    console.log(`peer_online, data.id=${data.id}`)
                    const ps = get_peers_by_size();
                    console.log(ps)
                    ws.pid = data.id;
                    peers.set(data.id, {
                        ws,
                        token: data.token
                    });
                    ws.send(JSON.stringify({
                        cmd: 'res_peer_online',
                        token: data.token,
                        TURN_USER,
                        TURN_PASS,
                        TRACKER_PORT
                    }));
                    ws.send(JSON.stringify(ps))
                    broadcast_total()
                    break;
                }
                case 'need_peers': {
                    const p = get_peers_by_size(data.amount);
                    p.peers = _.filter(p.peers, pid => pid != ws.pid)
                    ws.send(JSON.stringify(p))
                    break;
                }
                case 'check_fiends': {
                    if( Array.isArray(data.friends) ){
                        // for available friends
                        let af = data.friends.filter( f=>peers.has(f) )
                        if(af.length > 0){
                            const ps = {
                                peers: af,
                                cmd: 'peers'
                            }
                            ws.send(JSON.stringify(ps))
                        }
                    }
                    break;
                }
                case 'req_friend':
                case 'res_friend': 
                case 'send_sig':
                case 'return_sig': {
                    if(peers.has(data.to) && peers.has(ws.pid)){
                        data.from = ws.pid;
                        peers.get(data.to).ws.send(JSON.stringify(data));
                    }                   
                    break;
                }
                default: throw 'not support cmd'
            }
        } catch (err) {
            console.log(`parse ws message error, terminate this. `+JSON.stringify(err) )
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
            peers.delete(ws.pid)
            console.log(`peer ${ws.pid} staled, delete it.`)
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
    try {
        if (msg.length == 36) {
            const id = msg.toString('utf8', 0, 32);
            const token = msg.readUInt32BE(32)
            // console.log(`udp message [id=${id}; token=${token}`)
            if (peers.has(id)) {
                const p = peers.get(id);
                if (p.token == token) {
                    // console.log(`udp data valid, mark [${id}--${rinfo.address}:${rinfo.port}] alive`)
                    const r_ep = `${rinfo.address}:${rinfo.port}`;
                    if(r_ep != p.ep){
                        p.ep = r_ep;
                        p.ws.send(JSON.stringify({
                            cmd: 'your_udp_ep',
                            ep: r_ep
                        }));
                    }                    
                    p.ws.is_alive = true;
                }
            } else {
                console.log(`peer ${id} not register yet`)
            }
        } else {
            // console.log(`invalid udp data length=${msg.length}`)
        }
    } catch (error) {
        console.log(`msg=${JSON.stringify(msg)}; error=${JSON.stringify(error)}` )
    }
});
udp.on('listening', () => {
    // const address = udp.address();
    // console.log(`udp server listening ${address.address}:${address.port}`);
});

udp.bind(port);