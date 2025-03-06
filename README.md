# MCP ADB - Android Debug Bridge

A powerful MCP server that integrates with ADB (Android Debug Bridge) to help with Android app development and debugging. This tool allows you to build Android apps, install them on connected devices, get logs, take screenshots, and perform other essential ADB commands directly through Cursor using the Model Context Protocol (MCP).

## Features

- **Device Management**: View all connected Android devices with detailed information
- **Logcat Access**: Get logcat output from connected devices
- **Screenshot Capture**: Take screenshots of connected devices for debugging
- **App Installation**: Install APK files on connected devices
- **Shell Commands**: Execute ADB shell commands on connected devices
- **MCP Integration**: Use ADB functionality directly from Cursor via MCP

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Android SDK with ADB installed and configured in your PATH
- Connected Android device with USB debugging enabled
- Cursor (for MCP integration)

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/mcp-adb.git
   cd mcp-adb
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Using with Cursor (MCP)

To use MCP ADB with Cursor:

1. Install the package globally (optional):
   ```
   npm install -g .
   ```

2. Add the MCP server to Cursor:
   - Open Cursor
   - Go to `Cursor Settings` > `Features` > `MCP`
   - Click on `+ Add New MCP Server`
   - Fill in the form:
     - **Type**: `stdio`
     - **Name**: `MCP ADB`
     - **Command**: `node /path/to/mcp-adb/src/mcp-stdio-server.js`
       - If installed globally, you can use: `mcp-adb`
   - Click `Add`

3. The MCP ADB server should now appear in your list of MCP servers in Cursor.

4. Use the MCP tools in Cursor's Composer:
   - `list_devices`: List all connected Android devices
   - `get_device_info`: Get detailed information about a specific device
   - `take_screenshot`: Take a screenshot of a device
   - `install_apk`: Install an APK file on a device
   - `execute_shell_command`: Execute a shell command on a device
   - `get_logcat`: Get logcat output from a device

## Example Usage in Cursor

Here are some examples of how to use the MCP ADB tools in Cursor:

1. **List connected devices**:
   - Ask Cursor: "List all connected Android devices"

2. **Get device information**:
   - Ask Cursor: "Get information about my Android device"

3. **Take a screenshot**:
   - Ask Cursor: "Take a screenshot of my Android device"

4. **Install an APK**:
   - Ask Cursor: "Install the APK at /path/to/app.apk on my Android device"

5. **Execute a shell command**:
   - Ask Cursor: "Run 'ls /sdcard' on my Android device"

6. **Get logcat output**:
   - Ask Cursor: "Show me the last 50 lines of logcat from my Android device"

## License

This project is licensed under the ISC License.

## Acknowledgements

- [adbkit](https://github.com/openstf/adbkit) - Node.js client for ADB
- [Model Context Protocol](https://modelcontextprotocol.io/) - Protocol for integrating with LLMs 