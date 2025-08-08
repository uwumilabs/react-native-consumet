
const rn_bridge = require('rn-bridge');

console.log('🚀 Node.js test script started!');
console.log('🔍 Checking bridge availability...');
console.log('- rn_bridge:', typeof rn_bridge);
console.log('- rn_bridge.channel:', typeof rn_bridge.channel);

// Send ready message to React Native
if (rn_bridge && rn_bridge.channel) {
    console.log('📱 Bridge found and has channel');

    // Listen for messages from React Native
    rn_bridge.channel.on('message', (msg) => {
        console.log('📨 Node.js received message:', msg);

        if (msg.type === 'ping') {
            console.log('🏓 Responding to ping...');
            rn_bridge.channel.send({
                type: 'pong',
                id: msg.id,
                timestamp: Date.now(),
                message: 'Hello from Node.js!'
            });
        } else if (msg.type === 'test') {
            console.log('🧪 Processing test message...');
            rn_bridge.channel.send({
                type: 'test_response',
                id: msg.id,
                data: {
                    received: msg.data,
                    processed: true,
                    nodeVersion: process.version,
                    timestamp: Date.now()
                }
            });
        } else if (msg.type === 'debug') {
            console.log('🐛 Processing debug message...');
            rn_bridge.channel.send({
                type: 'debug_response',
                message: 'Debug received successfully',
                nodeInfo: {
                    version: process.version,
                    platform: process.platform,
                    arch: process.arch,
                    bridgeType: 'rn-bridge'
                },
                timestamp: Date.now()
            });
        } else {
            console.log('❓ Unknown message type:', msg.type);
            rn_bridge.channel.send({
                type: 'error',
                success: false,
                error: `Unknown message type: ${msg.type}`
            });
        }
    });

    // Send ready signal
    console.log('✅ Sending ready signal to React Native...');
    rn_bridge.channel.send({
        type: 'ready',
        message: 'Node.js runtime initialized successfully',
        nodeVersion: process.version,
        timestamp: Date.now()
    });

} else {
    console.log('❌ React Native bridge not available');
    console.log('- typeof rn_bridge:', typeof rn_bridge);
    if (rn_bridge) {
        console.log('- rn_bridge keys:', Object.keys(rn_bridge));
    }
}
