import uuid
import json

class AegisError(Exception):
    def __init__(self, code, message):
        self.code = code
        self.message = message
        super().__init__(f"[{code}] {message}")

class AegisSDK:
    def __init__(self, transport_client):
        self.transport = transport_client
        self.session_id = f"sess-{uuid.uuid4()}"
        self.user_id = "user-default"

    @classmethod
    def initialize(cls, endpoint="localhost:8080", api_key=None):
        # Ephemeral initialization wrapper
        class DummyTransport:
            def send(self, message):
                return {"success": True, "result": {"status": "success", "data": message}}
        return cls(DummyTransport())

    def _syscall(self, category, method, params=None):
        msg = {
            "category": category,
            "method": method,
            "params": params or {},
            "context": {
                "correlationId": f"corr-{uuid.uuid4()}",
                "sessionId": self.session_id,
                "userId": self.user_id
            }
        }
        res = self.transport.send(msg)
        if not res.get("success"):
            error_info = res.get("error", {})
            raise AegisError(error_info.get("code", "InferenceFailed"), error_info.get("message", "Error executing syscall"))
        return res.get("result")

    # System Calls
    def version(self):
        return self._syscall("Runtime", "Version")

    def generate(self, prompt, options=None):
        return self._syscall("AI Runtime", "Generate", {"prompt": prompt, "options": options or {}})

    def store_memory(self, key, value):
        return self._syscall("Memory", "StoreMemory", {"key": key, "value": value})
