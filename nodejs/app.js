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
            var alt = {};

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
    const chosen = _.sampleSize(peers.keys(), size)
    const ps = _.map(chosen, pid => {
        return {
            id: pid,
            ep: peers.get(pid).ep
        }
    })
    return {
        peers: ps,
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
            console.log(message)
            const data = JSON.parse(message)
            // console.log(data)
            switch (data.cmd) {
                case 'peer_online': {
                    clearTimeout(ws.idle_tm)
                    const ps = get_peers_by_size();
                    console.log(ps)
                    ws.pid = data.id;
                    peers.set(data.id, {
                        ws,
                        token: data.token
                    });
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
                    peers.get(data.to).ws.send(message);
                    break;
                }

                default: throw 'not support cmd'
            }
        } catch (err) {
            console.log(JSON.stringify(err) )
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
        if (msg.readUInt8(0) == 0x18 && msg.length == 9) {
            const id = msg.readInt32BE(1)
            const token = msg.readUInt32BE(5)
            if (peers.has(id)) {
                const p = peers.get(id);
                if (p.token == token) {
                    // console.log(`udp data valid, mark [${id}--${rinfo.address}:${rinfo.port}] alive`)
                    p.ep = `${rinfo.address}:${rinfo.port}`
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