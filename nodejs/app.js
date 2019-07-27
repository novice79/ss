
const WebSocket = require('ws');
const _ = require('lodash');

const port = isNaN(process.argv[2]) ? 57000 : process.argv[2];
const wss = new WebSocket.Server({ port }, () => {
    console.log(`service listen on ${port}`)
});
const peers = {}
function get_peers_by_size(size = 100) {
    return {
        peers: _.sampleSize(Object.keys(peers), size),
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
    ws.on('close', message => {
        delete peers[ws.pid]
        broadcast_total()
    })
    ws.on('message', message => {
        try {
            const data = JSON.parse(message)
            switch (data.cmd) {
                case 'peer_online': {
                    clearTimeout(ws.idle_tm)
                    const ps = get_peers_by_size();
                    ws.pid = data.id;
                    peers[data.id] = ws;
                    ws.send(JSON.stringify(ps))
                    broadcast_total()
                    break;
                }
                case 'need_peers': {
                    const p = get_peers_by_size(data.amount);
                    p.peers = _.filter(p.peers, p => p != ws.pid)
                    ws.send(JSON.stringify(p))
                    break;
                }
                case 'send_sig':
                case 'return_sig': {
                    peers[data.to].send(message);
                    break;
                }
                case 'I_am_alive':
                    ws.is_alive = true;
                    break;
                default: throw 'not support cmd'
            }
        } catch (err) {
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