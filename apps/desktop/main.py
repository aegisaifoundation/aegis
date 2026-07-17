import os
import subprocess
import sys
import time
import webbrowser
import threading
import http.server
import signal
import json
from llama_cpp import Llama

# Constants
UI_DIR = os.path.dirname(os.path.abspath(__file__))
AEGIS_CORE_DIR = os.path.join(os.path.dirname(UI_DIR), "aegis-boot")
# Default port for AEGIS local dashboard web server
UI_PORT = 5001

def get_model_dir():
    return os.path.join(os.path.dirname(os.path.dirname(UI_DIR)), "models")

# ==========================================================================
# GGUF MODEL MANAGER
# ==========================================================================
class GGUFModelManager:
    def __init__(self):
        self.llm = None
        self.model_path = os.path.join(get_model_dir(), "model.gguf")
        self.active_lora = None
        self.lora_attached = False
        self.lock = threading.Lock()

    def load_model(self, lora_path=None):
        with self.lock:
            if not os.path.exists(self.model_path):
                print(f"[GGUF Manager] Error: Base GGUF model not found at {self.model_path}")
                raise FileNotFoundError(f"Base GGUF model not found at {self.model_path}")

            print(f"[GGUF Manager] Loading GGUF Model: {self.model_path} with LoRA: {lora_path}")
            
            # Free old model memory if any
            if self.llm:
                del self.llm
                self.llm = None
                
            try:
                self.llm = Llama(
                    model_path=self.model_path,
                    lora_path=lora_path,
                    n_ctx=2048,
                    n_threads=8,
                    verbose=False
                )
                self.active_lora = lora_path
                self.lora_attached = lora_path is not None
                print("[GGUF Manager] Model loaded successfully.")
            except Exception as e:
                print(f"[GGUF Manager] Error loading model: {e}")
                raise e

    def get_llm(self):
        if not self.llm:
            self.load_model()
        return self.llm

    def configure_lora(self, action, lora_name=None):
        if action == "detach":
            if self.lora_attached:
                self.load_model(lora_path=None)
            return True
        elif action == "attach":
            if not lora_name:
                raise ValueError("lora_name is required to attach")
            
            lora_dir = get_model_dir()
            full_lora_path = os.path.join(lora_dir, lora_name)
            if not os.path.exists(full_lora_path):
                raise FileNotFoundError(f"LoRA adapter file not found: {full_lora_path}")
            
            self.load_model(lora_path=full_lora_path)
            return True
        return False

    def list_available_loras(self):
        lora_dir = get_model_dir()
        loras = []
        if os.path.exists(lora_dir):
            for file in os.listdir(lora_dir):
                if file.endswith(".gguf") and file != "model.gguf":
                    loras.append(file)
        return loras

# Initialize the single GGUF model manager
gguf_manager = GGUFModelManager()

# ==========================================================================
# REQUEST HANDLER (Serving UI files & GGUF API)
# ==========================================================================
class UIRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=UI_DIR, **kwargs)

    # Disable request logging to keep console clean
    def log_message(self, format, *args):
        pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        # Intercept GGUF status
        if self.path == '/api/gguf/lora/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            status_data = {
                "attached": gguf_manager.lora_attached,
                "active_lora": os.path.basename(gguf_manager.active_lora) if gguf_manager.active_lora else None,
                "available_loras": gguf_manager.list_available_loras()
            }
            self.wfile.write(json.dumps(status_data).encode())
            return
        
        # Fallback to static files
        super().do_GET()

    def do_POST(self):
        # Intercept GGUF chat completion stream
        if self.path == '/api/gguf/chat':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(post_data)
            messages = data.get('messages', [])
            print(f"[Python Server] Received messages: {json.dumps(messages, indent=2)}")

            try:
                llm = gguf_manager.get_llm()
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Failed to load GGUF model: {str(e)}"}).encode())
                return

            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            try:
                mapped = []
                for m in messages:
                    role = m.get('role', 'user')
                    if role not in ['system', 'user', 'assistant']:
                        role = 'user'
                    mapped.append({
                        "role": role,
                        "content": m.get('content', '')
                    })

                response = llm.create_chat_completion(
                    messages=mapped,
                    stream=True,
                    temperature=0.3,
                    max_tokens=250
                )

                for chunk in response:
                    choices = chunk.get('choices', [])
                    if choices:
                        delta = choices[0].get('delta', {})
                        content = delta.get('content', '')
                        if content:
                            self.wfile.write(content.encode('utf-8'))
                            self.wfile.flush()
            except Exception as e:
                print(f"[GGUF Manager] Error during streaming: {e}")
                self.wfile.write(f"\n[Streaming Error: {str(e)}]".encode())
            return

        # Intercept LoRA configuration updates
        if self.path == '/api/gguf/lora/config':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(post_data)
            action = data.get('action')
            lora_path = data.get('path')

            try:
                gguf_manager.configure_lora(action, lora_path)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode())
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return

        self.send_response(404)
        self.end_headers()

def start_ui_server(port):
    server_address = ('', port)
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
    
    is_windows = sys.platform.startswith('win')
    
    try:
        node_process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=AEGIS_CORE_DIR,
            shell=is_windows,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            errors='replace',
            bufsize=1
        )
    except Exception as e:
        print(f"[Launcher Error] Failed to start Aegis Node process: {e}")
        sys.exit(1)

    # Function to print output from Node process
    def stream_node_output():
        for line in iter(node_process.stdout.readline, ''):
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
        bootloader_finished = False
        while True:
            if not bootloader_finished:
                ret_code = node_process.poll()
                if ret_code is not None:
                    if ret_code == 0:
                        print("\n[Launcher] Aegis core bootstrap finished. Keeping UI web server alive...")
                        bootloader_finished = True
                    else:
                        print(f"\n[Launcher Error] Aegis core process failed with exit code {ret_code}.")
                        break
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown_gracefully(None, None)

if __name__ == "__main__":
    main()
