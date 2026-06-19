import os
import subprocess
import sys
import time
import webbrowser
import threading
import http.server
import signal

# Constants
UI_DIR = os.path.dirname(os.path.abspath(__file__))
AEGIS_CORE_DIR = os.path.join(os.path.dirname(UI_DIR), "aegis-core")
UI_PORT = 5001

class UIRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=UI_DIR, **kwargs)

    # Disable request logging to keep console clean
    def log_message(self, format, *args):
        pass

def start_ui_server(port):
    server_address = ('', port)
    # Using ThreadingHTTPServer for concurrent connections
    httpd = http.server.ThreadingHTTPServer(server_address, UIRequestHandler)
    print(f"[Python Server] Web UI is hosted at http://127.0.0.1:{port}")
    httpd.serve_forever()

def main():
    print("=" * 60)
    print("                  AEGIS INTEGRATED AGENT UI Launcher")
    print("=" * 60)
    print(f"[Launcher] UI Directory: {UI_DIR}")
    print(f"[Launcher] Aegis Core Directory: {AEGIS_CORE_DIR}")

    # 1. Start Python Web Server in a background thread
    server_thread = threading.Thread(target=start_ui_server, args=(UI_PORT,), daemon=True)
    server_thread.start()

    # Give the server a small moment to initialize
    time.sleep(0.5)

    # 2. Start the Aegis Node process (npm run dev)
    print("[Launcher] Starting Aegis core agent (npm run dev)...")
    
    # We use shell=True on Windows because npm is a cmd script
    is_windows = sys.platform.startswith('win')
    
    try:
        node_process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=AEGIS_CORE_DIR,
            shell=is_windows,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
    except Exception as e:
        print(f"[Launcher Error] Failed to start Aegis Node process: {e}")
        sys.exit(1)

    # Function to print output from Node process
    def stream_node_output():
        for line in iter(node_process.stdout.readline, ''):
            # Print Node output prefixing it for clarity
            sys.stdout.write(f"[Aegis Core] {line}")
            sys.stdout.flush()

    output_thread = threading.Thread(target=stream_node_output, daemon=True)
    output_thread.start()

    # 3. Open browser to the UI
    print(f"[Launcher] Opening UI in browser at http://127.0.0.1:{UI_PORT}...")
    webbrowser.open(f"http://127.0.0.1:{UI_PORT}")

    # 4. Handle clean shutdown on Ctrl+C / Signal termination
    def shutdown_gracefully(signum, frame):
        print("\n[Launcher] Shutting down UI and Aegis Node process...")
        if node_process:
            try:
                if is_windows:
                    # Windows doesn't handle SIGTERM/SIGINT cleanly on shells, so we kill the process tree
                    subprocess.call(['taskkill', '/F', '/T', '/PID', str(node_process.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    node_process.terminate()
                    node_process.wait(timeout=2)
            except Exception as e:
                print(f"[Launcher] Error terminating Aegis process: {e}")
        print("[Launcher] Exited.")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown_gracefully)
    signal.signal(signal.SIGTERM, shutdown_gracefully)

    # Keep main thread alive and monitor Node process
    try:
        while True:
            # Check if Node process has exited
            ret_code = node_process.poll()
            if ret_code is not None:
                print(f"\n[Launcher Warning] Aegis core process exited with code {ret_code}.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown_gracefully(None, None)

if __name__ == "__main__":
    main()
