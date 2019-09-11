const https = require('https');
const dgram = require('dgram');
const WebSocket = require('ws');
const _ = require('lodash');
// const moment = require('moment');
// require('log-timestamp')(() => `[${moment().format('YYYY-MM-DD HH:mm:ss SSS')}] %s`);
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
if (!('toJSON' in Error.prototype)){
    Object.defineProperty(Error.prototype, 'toJSON', {
        value: function () {
            let alt = {};
            Object.getOwnPropertyNames(this).forEach(function (key) {
                alt[key] = this[key];
            }, this);
            return alt;
        },
        configurable: true,
        writable: true
    });
}
    
const peers = new Map();
function get_peers_by_size(size = 100) {
    const chosen = _.sampleSize( [...peers.keys()], size )
    // const ps = _.map(chosen, pid => {
    //     return {
    //         id: pid,
    //         ep: peers.get(pid).ep
    //     }
    // })
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
function broadcast_msg(msg) {
    wss.clients.forEach(ws => ws.send(msg) )
}
function broadcast_total() {
    wss.clients.forEach(ws => send_total(ws))
}
// function random_int(low = 0, high = 4294967295) {
//     return Math.floor(Math.random() * (high - low) + low)
// }
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
                    if(ws.feasible){
                        // suppose data.from to be sender's nickname, and with content in data.msg
                        broadcast_msg(message)
                        ws.feasible = false;
                        setTimeout(()=>{
                            ws.feasible = true;
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
                        token: data.token
                    }));
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
                case 'check_fiends': {
                    if( Array.isArray(data.friends) ){
                        // for available friends
                        let af = data.friends.filter( f=>peers.has(f) )
                        if(af.length > 0){
                            af = af.map(f=>{
                                return {
                                    id: f,
                                    ep: peers.get(f).ep
                                }
                            });
                            const ps = {
                                peers: af,
                                cmd: 'peers'
                            }
                            ws.send(JSON.stringify(ps))
                        }
                    }
                    break;
                }
                case 'send_sig':
                case 'return_sig': {
                    if(peers.has(data.to) && peers.has(ws.pid)){
                        data.from = {
                            id: ws.pid,
                            ep: peers.get(ws.pid).ep
                        };
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
        if (msg.readUInt8(0) == 0x18 && msg.length == 37) {
            const id = msg.toString('utf8', 1, 33);
            const token = msg.readUInt32BE(33)
            // console.log(`udp message [id=${id}; token=${token}`)
            if (peers.has(id)) {
                const p = peers.get(id);
                if (p.token == token) {
                    console.log(`udp data valid, mark [${id}--${rinfo.address}:${rinfo.port}] alive`)
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
            console.log(`invalid udp data length=${msg.length}`)
        }
    } catch (error) {
        console.log(JSON.stringify(msg) )
        console.log(JSON.stringify(error) )
    }

});

udp.on('listening', () => {
    // const address = udp.address();
    // console.log(`udp server listening ${address.address}:${address.port}`);
});

udp.bind(port);