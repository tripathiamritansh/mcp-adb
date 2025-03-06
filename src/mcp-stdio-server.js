#!/usr/bin/env node

/**
 * MCP ADB Server - Stdio Transport
 * 
 * This script implements a Model Context Protocol (MCP) server that integrates with
 * Android Debug Bridge (ADB) to provide Android development and debugging tools
 * directly within Cursor.
 * 
 * The server uses the stdio transport to communicate with Cursor and follows the
 * JSON-RPC 2.0 protocol format.
 * 
 * Available tools:
 * - list_devices: List all connected Android devices
 * - get_device_info: Get detailed information about a specific device
 * - take_screenshot: Take a screenshot of a device
 * - install_apk: Install an APK file on a device
 * - execute_shell_command: Execute a shell command on a device
 * - get_logcat: Get logcat output from a device
 */

// Import required modules
const adbkit = require('adbkit');
const fs = require('fs-extra');
const path = require('path');

// Initialize ADB client
const adbClient = adbkit.createClient();
console.error('ADB client initialized');

// Define MCP protocol handlers
const PROTOCOL_VERSION = "2.0";

// Handle incoming messages
process.stdin.on('data', async (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.error(`Received message: ${JSON.stringify(message)}`);
    
    if (message.jsonrpc === "2.0" && message.method === "initialize") {
      // Respond to initialize message
      sendResponse({
        jsonrpc: "2.0",
        id: message.id,
        result: {
          version: PROTOCOL_VERSION,
          capabilities: {}
        }
      });
    } else if (message.jsonrpc === "2.0" && message.method === "list_tools") {
      // Return list of available tools
      sendResponse({
        jsonrpc: "2.0",
        id: message.id,
        result: {
          tools: [
            {
              name: 'list_devices',
              description: 'List all connected Android devices',
              parameters: {
                type: 'object',
                properties: {},
                required: []
              }
            },
            {
              name: 'get_device_info',
              description: 'Get detailed information about a specific Android device',
              parameters: {
                type: 'object',
                properties: {
                  device_id: {
                    type: 'string',
                    description: 'The ID of the Android device'
                  }
                },
                required: ['device_id']
              }
            },
            {
              name: 'take_screenshot',
              description: 'Take a screenshot of an Android device',
              parameters: {
                type: 'object',
                properties: {
                  device_id: {
                    type: 'string',
                    description: 'The ID of the Android device'
                  }
                },
                required: ['device_id']
              }
            },
            {
              name: 'install_apk',
              description: 'Install an APK file on an Android device',
              parameters: {
                type: 'object',
                properties: {
                  device_id: {
                    type: 'string',
                    description: 'The ID of the Android device'
                  },
                  apk_path: {
                    type: 'string',
                    description: 'The path to the APK file to install'
                  }
                },
                required: ['device_id', 'apk_path']
              }
            },
            {
              name: 'execute_shell_command',
              description: 'Execute a shell command on an Android device',
              parameters: {
                type: 'object',
                properties: {
                  device_id: {
                    type: 'string',
                    description: 'The ID of the Android device'
                  },
                  command: {
                    type: 'string',
                    description: 'The shell command to execute'
                  }
                },
                required: ['device_id', 'command']
              }
            },
            {
              name: 'get_logcat',
              description: 'Get logcat output from an Android device',
              parameters: {
                type: 'object',
                properties: {
                  device_id: {
                    type: 'string',
                    description: 'The ID of the Android device'
                  },
                  lines: {
                    type: 'number',
                    description: 'Number of log lines to retrieve (default: 100)'
                  },
                  filter: {
                    type: 'string',
                    description: 'Filter string for logcat (e.g., "tag:MyApp")'
                  }
                },
                required: ['device_id']
              }
            }
          ]
        }
      });
    } else if (message.jsonrpc === "2.0" && message.method === "call_tool") {
      // Handle tool calls
      const { tool, parameters } = message.params;
      console.error(`Tool call: ${tool}`);
      
      switch (tool) {
        case 'list_devices':
          await handleListDevices(message.id);
          break;
        case 'get_device_info':
          await handleGetDeviceInfo(message.id, parameters.device_id);
          break;
        case 'take_screenshot':
          await handleTakeScreenshot(message.id, parameters.device_id);
          break;
        case 'install_apk':
          await handleInstallApk(message.id, parameters.device_id, parameters.apk_path);
          break;
        case 'execute_shell_command':
          await handleExecuteShellCommand(message.id, parameters.device_id, parameters.command);
          break;
        case 'get_logcat':
          await handleGetLogcat(message.id, parameters.device_id, parameters.lines, parameters.filter);
          break;
        default:
          sendError(message.id, `Unknown tool: ${tool}`);
      }
    } else {
      // Handle unknown message type
      console.error(`Unknown message: ${JSON.stringify(message)}`);
      if (message.id) {
        sendError(message.id, "Method not supported");
      }
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

/**
 * Lists all connected Android devices
 * @param {string} id - The message ID to respond to
 */
async function handleListDevices(id) {
  try {
    console.error('Listing devices...');
    const devices = await adbClient.listDevices();
    console.error(`Found ${devices.length} devices`);
    sendResponse({
      jsonrpc: "2.0",
      id,
      result: { devices }
    });
  } catch (error) {
    console.error('Error listing devices:', error);
    sendError(id, `Failed to list devices: ${error.message}`);
  }
}

/**
 * Gets detailed information about a specific Android device
 * @param {string} id - The message ID to respond to
 * @param {string} deviceId - The ID of the Android device
 */
async function handleGetDeviceInfo(id, deviceId) {
  try {
    console.error(`Getting info for device: ${deviceId}`);
    // Get device properties
    const propsResult = await adbClient.shell(deviceId, 'getprop');
    const propsOutput = await adbkit.util.readAll(propsResult);
    const propsString = propsOutput.toString().trim();
    
    // Parse properties
    const props = {};
    const propRegex = /\[(.*?)\]: \[(.*?)\]/g;
    let match;
    
    while ((match = propRegex.exec(propsString)) !== null) {
      props[match[1]] = match[2];
    }
    
    // Get basic device info
    const deviceInfo = {
      id: deviceId,
      model: props['ro.product.model'] || 'Unknown',
      manufacturer: props['ro.product.manufacturer'] || 'Unknown',
      brand: props['ro.product.brand'] || 'Unknown',
      androidVersion: props['ro.build.version.release'] || 'Unknown',
      sdkVersion: props['ro.build.version.sdk'] || 'Unknown',
      serialNumber: props['ro.serialno'] || deviceId
    };
    
    sendResponse({
      jsonrpc: "2.0",
      id,
      result: { deviceInfo }
    });
  } catch (error) {
    console.error('Error getting device info:', error);
    sendError(id, `Failed to get device info: ${error.message}`);
  }
}

/**
 * Takes a screenshot of an Android device
 * @param {string} id - The message ID to respond to
 * @param {string} deviceId - The ID of the Android device
 */
async function handleTakeScreenshot(id, deviceId) {
  try {
    console.error(`Taking screenshot for device: ${deviceId}`);
    // Create screenshots directory if it doesn't exist
    const screenshotsDir = path.join(__dirname, '../screenshots');
    await fs.ensureDir(screenshotsDir);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot-${deviceId}-${timestamp}.png`;
    const filePath = path.join(screenshotsDir, filename);
    
    // Take screenshot
    const stream = await adbClient.screencap(deviceId);
    
    // Save screenshot to file
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);
      stream.pipe(file);
      file.on('finish', () => {
        console.error(`Screenshot saved to ${filePath}`);
        resolve();
      });
      file.on('error', (err) => {
        console.error('Error saving screenshot:', err);
        reject(err);
      });
    });
    
    sendResponse({
      jsonrpc: "2.0",
      id,
      result: {
        success: true,
        message: 'Screenshot taken successfully',
        path: filePath,
        filename
      }
    });
  } catch (error) {
    console.error('Error taking screenshot:', error);
    sendError(id, `Failed to take screenshot: ${error.message}`);
  }
}

/**
 * Installs an APK file on an Android device
 * @param {string} id - The message ID to respond to
 * @param {string} deviceId - The ID of the Android device
 * @param {string} apkPath - The path to the APK file to install
 */
async function handleInstallApk(id, deviceId, apkPath) {
  try {
    console.error(`Installing APK on device: ${deviceId}, path: ${apkPath}`);
    // Check if APK file exists
    if (!await fs.pathExists(apkPath)) {
      throw new Error(`APK file not found at ${apkPath}`);
    }
    
    // Install APK
    await adbClient.install(deviceId, apkPath);
    
    sendResponse({
      jsonrpc: "2.0",
      id,
      result: {
        success: true,
        message: 'App installed successfully'
      }
    });
  } catch (error) {
    console.error('Error installing APK:', error);
    sendError(id, `Failed to install APK: ${error.message}`);
  }
}

/**
 * Executes a shell command on an Android device
 * @param {string} id - The message ID to respond to
 * @param {string} deviceId - The ID of the Android device
 * @param {string} command - The shell command to execute
 */
async function handleExecuteShellCommand(id, deviceId, command) {
  try {
    console.error(`Executing command on device: ${deviceId}, command: ${command}`);
    const result = await adbClient.shell(deviceId, command);
    const output = await adbkit.util.readAll(result);
    
    sendResponse({
      jsonrpc: "2.0",
      id,
      result: {
        success: true,
        output: output.toString().trim()
      }
    });
  } catch (error) {
    console.error('Error executing shell command:', error);
    sendError(id, `Failed to execute shell command: ${error.message}`);
  }
}

/**
 * Gets logcat output from an Android device
 * @param {string} id - The message ID to respond to
 * @param {string} deviceId - The ID of the Android device
 * @param {number} lines - Number of log lines to retrieve (default: 100)
 * @param {string} filter - Filter string for logcat
 */
async function handleGetLogcat(id, deviceId, lines = 100, filter = '') {
  try {
    console.error(`Getting logcat for device: ${deviceId}, lines: ${lines}, filter: ${filter}`);
    const filterCmd = filter ? ` | grep -i "${filter}"` : '';
    const command = `logcat -d -v threadtime -t ${lines}${filterCmd}`;
    
    const result = await adbClient.shell(deviceId, command);
    const output = await adbkit.util.readAll(result);
    
    sendResponse({
      jsonrpc: "2.0",
      id,
      result: {
        success: true,
        logs: output.toString().trim()
      }
    });
  } catch (error) {
    console.error('Error getting logcat:', error);
    sendError(id, `Failed to get logcat: ${error.message}`);
  }
}

/**
 * Sends a JSON-RPC 2.0 response
 * @param {Object} response - The response object to send
 */
function sendResponse(response) {
  const responseStr = JSON.stringify(response);
  process.stdout.write(responseStr + '\n');
  console.error(`Sent response: ${JSON.stringify(response)}`);
}

/**
 * Sends a JSON-RPC 2.0 error response
 * @param {string} id - The message ID to respond to
 * @param {string} message - The error message
 */
function sendError(id, message) {
  sendResponse({
    jsonrpc: "2.0",
    id,
    error: {
      code: -32000,
      message
    }
  });
}

// Log startup
console.error('MCP ADB Server started with stdio transport');

// Handle process termination
process.on('SIGINT', () => {
  console.error('Shutting down MCP ADB Server...');
  process.exit(0);
}); 