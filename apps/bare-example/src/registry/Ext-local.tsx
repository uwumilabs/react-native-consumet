import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import React, { useState } from 'react';

const ExtLocal = () => {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  const testClassFunction = async () => {
    setTestResults([]);
    addResult('🚀 Starting class test...');

    try {
      // Code that defines and uses a simple class
      const classCode = `
        class Greeter {
          constructor(name) {
            this.name = name;
          }
          greet() {
            return "Hello, " + this.name + "!";
          }
        }
        const greeter = new Greeter("World");
        return greeter.greet();
      `;

      const runClass = new Function(classCode);
      const result = runClass();

      addResult(`✅ Class executed successfully: ${result}`);
    } catch (error: any) {
      addResult(`❌ Class execution failed: ${error.message}`);
    }

    addResult('🏁 Test completed!');
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Class Execution Test
      </Text>

      <TouchableOpacity
        onPress={testClassFunction}
        style={{
          backgroundColor: '#007AFF',
          padding: 10,
          borderRadius: 5,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Run Class Test</Text>
      </TouchableOpacity>

      <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5', padding: 10 }}>
        {testResults.map((result, index) => (
          <Text key={index} style={{ marginBottom: 5, fontFamily: 'monospace' }}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

export default ExtLocal;
