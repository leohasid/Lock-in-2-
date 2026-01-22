"use client";

import { useState } from "react";

export default function DebugAIPage() {
  const [testResult, setTestResult] = useState<string>("");
  const [isTesting, setIsTesting] = useState(false);
  const [railwayUrl, setRailwayUrl] = useState<string>("");

  const checkEnvironment = () => {
    const url = process.env.NEXT_PUBLIC_RAILWAY_API_URL || "";
    setRailwayUrl(url);
    
    if (!url) {
      setTestResult("❌ ERROR: NEXT_PUBLIC_RAILWAY_API_URL is NOT SET\n\n" +
        "Go to Vercel → Settings → Environment Variables\n" +
        "Add: NEXT_PUBLIC_RAILWAY_API_URL = your Railway URL\n" +
        "Then REDEPLOY Vercel!");
      return;
    }
    
    setTestResult(`✅ Environment variable found: ${url}\n\nTesting connection...`);
  };

  const testRailwayConnection = async () => {
    setIsTesting(true);
    setTestResult("Testing...\n");
    
    try {
      const url = process.env.NEXT_PUBLIC_RAILWAY_API_URL || "";
      
      if (!url) {
        setTestResult("❌ ERROR: Railway URL not set in environment variables");
        setIsTesting(false);
        return;
      }

      // Test health endpoint
      setTestResult(prev => prev + `\n1. Testing health endpoint: ${url}/health\n`);
      const healthResponse = await fetch(`${url}/health`);
      const healthData = await healthResponse.json();
      
      if (healthResponse.ok) {
        setTestResult(prev => prev + `✅ Health check passed: ${JSON.stringify(healthData)}\n`);
      } else {
        setTestResult(prev => prev + `❌ Health check failed: ${healthResponse.status}\n`);
        setIsTesting(false);
        return;
      }

      // Test AI endpoint
      setTestResult(prev => prev + `\n2. Testing AI endpoint: ${url}/api/ai\n`);
      const aiResponse = await fetch(`${url}/api/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Hello, this is a test" }),
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => ({}));
        setTestResult(prev => prev + 
          `❌ AI endpoint failed:\n` +
          `Status: ${aiResponse.status} ${aiResponse.statusText}\n` +
          `Error: ${errorData.error || "Unknown error"}\n`
        );
        setIsTesting(false);
        return;
      }

      const aiData = await aiResponse.json();
      setTestResult(prev => prev + 
        `✅ AI endpoint working!\n` +
        `Response: ${aiData.response?.substring(0, 100) || "No response"}...\n\n` +
        `🎉 Everything is working! Your AI should work now.`
      );

    } catch (error: any) {
      setTestResult(prev => prev + 
        `❌ Connection error:\n` +
        `${error.message}\n\n` +
        `Possible issues:\n` +
        `- Railway backend is down\n` +
        `- CORS error (check Railway has CORS enabled)\n` +
        `- Network error\n` +
        `- Wrong Railway URL`
      );
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">AI Connection Debug Tool</h1>
        
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment Check</h2>
          <button
            onClick={checkEnvironment}
            className="bg-teal-500 hover:bg-teal-600 text-black font-bold py-2 px-4 rounded mb-4"
          >
            Check Environment Variable
          </button>
          
          {railwayUrl && (
            <div className="mt-4 p-4 bg-gray-800 rounded">
              <p className="text-sm text-gray-400">Railway URL:</p>
              <p className="text-teal-400 font-mono break-all">{railwayUrl}</p>
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Test</h2>
          <button
            onClick={testRailwayConnection}
            disabled={isTesting}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded mb-4"
          >
            {isTesting ? "Testing..." : "Test Railway Connection"}
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <pre className="bg-black p-4 rounded text-sm font-mono whitespace-pre-wrap overflow-auto max-h-96">
            {testResult || "Click buttons above to test..."}
          </pre>
        </div>

        <div className="mt-6 bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
          <h3 className="font-semibold mb-2">How to Fix Issues:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>If "NOT SET": Add NEXT_PUBLIC_RAILWAY_API_URL in Vercel env vars and redeploy</li>
            <li>If health check fails: Check Railway is online</li>
            <li>If AI endpoint fails: Check Railway has OPENAI_API_KEY set</li>
            <li>If CORS error: Railway backend should have CORS enabled (already done)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
