import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import nodejs from 'nodejs-mobile-react-native'

const NodeJSTest = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    // Initialize nodejs-mobile-react-native
    const initNodeJS = async () => {
      try {
        addLog('🔧 Initializing nodejs-mobile-react-native...');
        
        // Check if nodejs module is available
        if (!nodejs) {
          addLog('❌ nodejs module is not available');
          return;
        }
        
        addLog('📦 nodejs module loaded, setting up listener...');
        
        // Set up message listener BEFORE starting
        nodejs.channel.addListener('message', (msg: any) => {
          addLog(`📨 Received: ${JSON.stringify(msg)}`);
          
          if (msg.type === 'ready') {
            setIsReady(true);
            addLog('✅ Node.js runtime is ready!');
          } else if (msg.type === 'pong') {
            addLog('🏓 Received pong response!');
          } else if (msg.type === 'test_response') {
            addLog('🧪 Received test response!');
          } else if (msg.type === 'debug_response') {
            addLog('🐛 Debug response received!');
            addLog(`Node info: ${JSON.stringify(msg.nodeInfo)}`);
          } else if (msg.type === 'error') {
            addLog(`❌ Node.js error: ${msg.error}`);
          }
        });
        
        // Add error listener
        nodejs.channel.addListener('error', (error: any) => {
          addLog(`❌ Channel error: ${JSON.stringify(error)}`);
        });
        
        addLog('👂 Message listener set up');
        
        // Start Node.js with test script (only once)
        addLog('🚀 Starting Node.js with test.js...');
        nodejs.start('test.js');
        addLog('✅ nodejs.start() completed');
        setIsReady(true)
        
        // Add a timeout to check if we get the ready message
        setTimeout(() => {
          if (!isReady) {
            addLog('⏰ Timeout: No ready message received after 5 seconds');
          }
        }, 5000);
        
      } catch (error) {
        addLog(`❌ Error initializing Node.js: ${error}`);
        console.error('NodeJS initialization error:', error);
      }
    };

    initNodeJS();
    
    // Cleanup function
    return () => {
      try {
        if (nodejs && nodejs.channel) {
          // Note: nodejs-mobile-react-native may not have removeAllListeners
          addLog('🧹 Component unmounting');
        }
      } catch (error) {
        addLog(`❌ Cleanup error: ${error}`);
      }
    };
  }, []);

  const sendPing = () => {
    if (!nodejs || !isReady) {
      addLog('❌ Node.js not ready');
      return;
    }

    const message = {
      type: 'ping',
      id: `ping_${Date.now()}`,
      timestamp: Date.now()
    };

    addLog(`📤 Sending ping: ${JSON.stringify(message)}`);
    nodejs.channel.send(message);
  };

  const sendTest = () => {
    if (!nodejs || !isReady) {
      addLog('❌ Node.js not ready');
      return;
    }

    const message = {
      type: 'test',
      id: `test_${Date.now()}`,
      data: {
        text: 'Hello from React Native!',
        number: 42,
        array: [1, 2, 3]
      }
    };

    addLog(`📤 Sending test: ${JSON.stringify(message)}`);
    nodejs.channel.send(message);
  };

  const debugNodeJS = () => {
    addLog('🐛 Debug info:');
    addLog(`- nodejs module: ${nodejs ? 'Available' : 'Not available'}`);
    addLog(`- nodejs.channel: ${nodejs?.channel ? 'Available' : 'Not available'}`);
    addLog(`- isReady: ${isReady}`);
    
    // Try to send a simple message regardless of ready state
    if (nodejs?.channel) {
      addLog('🔍 Attempting to send debug message...');
      try {
        nodejs.channel.send({ type: 'debug', message: 'Debug test from RN' });
        addLog('✅ Debug message sent');
      } catch (error) {
        addLog(`❌ Failed to send debug message: ${error}`);
      }
    }
  };

  const restartNodeJS = () => {
    addLog('🔄 Attempting to restart Node.js...');
    setIsReady(false);
    
    try {
      // Try to restart
      nodejs.start('test.js');
      addLog('🚀 Restart command sent');
    } catch (error) {
      addLog(`❌ Restart failed: ${error}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Node.js Communication Test</Text>
      
      <View style={styles.status}>
        <Text style={[styles.statusText, { color: isReady ? 'green' : 'red' }]}>
          Status: {isReady ? '✅ Ready' : '⏳ Initializing...'}
        </Text>
      </View>

      <View style={styles.buttons}>
        <Button title="Send Ping" onPress={sendPing} disabled={!isReady} />
        <Button title="Send Test" onPress={sendTest} disabled={!isReady} />
      </View>
      
      <View style={styles.buttons}>
        <Button title="Debug Info" onPress={debugNodeJS} />
        <Button title="Restart Node.js" onPress={restartNodeJS} />
      </View>

      <Text style={styles.logsTitle}>Logs:</Text>
      <ScrollView style={styles.logs}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>
            {log}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  status: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logs: {
    flex: 1,
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
  },
  logText: {
    color: '#0f0',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});

export default NodeJSTest;
