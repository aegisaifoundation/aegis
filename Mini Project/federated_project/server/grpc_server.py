import os
import grpc
import threading
import time
import hashlib
from concurrent import futures

import federated_pb2
import federated_pb2_grpc

from aggregate import federated_average
from security import (
    generate_server_keys,
    load_server_private_key,
    load_server_public_key,
    init_db,
    register_client_key,
    get_client_public_key,
    generate_aes_key,
    hybrid_encrypt_with_key,
    hybrid_decrypt_with_key
)

from cryptography.hazmat.primitives import serialization


# =========================================================
# CONFIG
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_STORAGE = os.path.join(BASE_DIR, "client_uploads")
GLOBAL_DIR = os.path.join(BASE_DIR, "global_lora")

THRESHOLD = 2


# =========================================================
# SHARED STATE (USED BY DASHBOARD)
# =========================================================

received_clients = []
federated_round = 0
server_logs = []

aggregation_status = "IDLE"
aggregation_start_time = None
aggregation_duration = 0

node_status = {}

round_history = []
node_contributions = {}
model_size_history = []

model_hash = "N/A"
model_size_mb = 0.0
model_last_updated = "N/A"

# ================= NETWORK INTELLIGENCE =================

server_start_time = time.time()

total_encrypted_rx_mb = 0.0
total_encrypted_tx_mb = 0.0
round_traffic_mb = 0.0

rpc_latencies = []
max_rpc_latency = 0.0

state_lock = threading.Lock()


# =========================================================
# SECURITY INITIALIZATION
# =========================================================

generate_server_keys()
init_db()

server_private_key = load_server_private_key()
server_public_key = load_server_public_key()


# =========================================================
# LOGGING
# =========================================================

def add_log(level, message):
    server_logs.append({
        "time": time.strftime("%H:%M:%S"),
        "level": level,
        "message": message
    })


# =========================================================
# MODEL INTEGRITY
# =========================================================

def update_model_integrity():
    global model_hash, model_size_mb, model_last_updated

    model_path = os.path.join(GLOBAL_DIR, "adapter_model.safetensors")

    if os.path.exists(model_path):
        with open(model_path, "rb") as f:
            data = f.read()

        model_hash = hashlib.sha256(data).hexdigest()[:16]
        model_size_mb = len(data) / (1024 * 1024)
        model_last_updated = time.strftime("%H:%M:%S")


# =========================================================
# FEDERATED SERVICE
# =========================================================

class FederatedService(federated_pb2_grpc.FederatedServiceServicer):

    # -----------------------------------------------------
    # HEARTBEAT (NEW ADDITION)
    # -----------------------------------------------------
    def Heartbeat(self, request, context):
        client_name = request.client_name

        with state_lock:
            node_status[client_name] = {
                "status": "ACTIVE",
                "last_seen": time.strftime("%H:%M:%S")
            }

            add_log("INFO", f"{client_name} sent heartbeat")

        return federated_pb2.HeartbeatResponse(
            message="Heartbeat acknowledged"
        )

    # -----------------------------------------------------
    # CLIENT REGISTRATION
    # -----------------------------------------------------
    def RegisterClient(self, request, context):

        client_name = request.client_name
        client_pub_key = request.client_public_key

        register_client_key(client_name, client_pub_key)

        with state_lock:
            add_log("SECURE", f"{client_name} registered public key")

        return federated_pb2.RegisterResponse(
            message="Client registered successfully",
            server_public_key=server_public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
        )

    # -----------------------------------------------------
    # RECEIVE ENCRYPTED LORA
    # -----------------------------------------------------
    def SendLoRA(self, request, context):

        global federated_round
        global aggregation_status
        global aggregation_start_time
        global aggregation_duration
        global total_encrypted_rx_mb
        global round_traffic_mb
        global max_rpc_latency

        rpc_start = time.time()

        client_name = request.client_name

        decrypted_weights = hybrid_decrypt_with_key(
            server_private_key,
            request.encrypted_key,
            request.iv_weights,
            request.encrypted_weights
        )

        decrypted_config = hybrid_decrypt_with_key(
            server_private_key,
            request.encrypted_key,
            request.iv_config,
            request.encrypted_config
        )

        client_dir = os.path.join(SERVER_STORAGE, client_name)
        os.makedirs(client_dir, exist_ok=True)

        with open(os.path.join(client_dir, "adapter_model.safetensors"), "wb") as f:
            f.write(decrypted_weights)

        with open(os.path.join(client_dir, "adapter_config.json"), "wb") as f:
            f.write(decrypted_config)

        upload_size_mb = len(request.encrypted_weights) / (1024 * 1024)
        rpc_latency = (time.time() - rpc_start) * 1000

        with state_lock:
            rpc_latencies.append(rpc_latency)
            if rpc_latency > max_rpc_latency:
                max_rpc_latency = rpc_latency

            total_encrypted_rx_mb += upload_size_mb
            round_traffic_mb += upload_size_mb

            node_status[client_name] = {
                "status": "ACTIVE",
                "last_seen": time.strftime("%H:%M:%S")
            }

            node_contributions[client_name] = \
                node_contributions.get(client_name, 0) + upload_size_mb

            if client_name not in received_clients:
                received_clients.append(client_name)

            add_log("INFO", f"{client_name} uploaded encrypted LoRA ({upload_size_mb:.2f} MB)")

        if len(received_clients) >= THRESHOLD:

            with state_lock:
                aggregation_status = "MERGING"
                aggregation_start_time = time.time()
                add_log("SECURE", "Secure aggregation initiated")

            client_dirs = [
                os.path.join(SERVER_STORAGE, c)
                for c in received_clients
            ]

            federated_average(client_dirs, GLOBAL_DIR)
            update_model_integrity()

            with state_lock:
                aggregation_duration = time.time() - aggregation_start_time
                aggregation_status = "IDLE"
                federated_round += 1

                round_history.append(
                    (federated_round, aggregation_duration)
                )

                model_size_history.append(
                    (federated_round, model_size_mb)
                )

                received_clients.clear()
                round_traffic_mb = 0.0

                add_log(
                    "SUCCESS",
                    f"Round {federated_round} aggregated in {aggregation_duration:.2f}s"
                )

        return federated_pb2.LoRAResponse(
            message="Encrypted LoRA received"
        )

    # -----------------------------------------------------
    # SEND ENCRYPTED GLOBAL
    # -----------------------------------------------------
    def GetGlobal(self, request, context):

        global total_encrypted_tx_mb
        global max_rpc_latency

        rpc_start = time.time()
        client_name = request.client_name

        weights_path = os.path.join(GLOBAL_DIR, "adapter_model.safetensors")
        config_path = os.path.join(GLOBAL_DIR, "adapter_config.json")

        if not os.path.exists(weights_path):
            return federated_pb2.EncryptedGlobalResponse(
                message="Global model not ready"
            )

        with open(weights_path, "rb") as f:
            weights = f.read()

        with open(config_path, "rb") as f:
            config = f.read()

        client_public_key = get_client_public_key(client_name)

        if client_public_key is None:
            return federated_pb2.EncryptedGlobalResponse(
                message="Client not registered"
            )

        aes_key = generate_aes_key()

        encrypted_key = hybrid_encrypt_with_key(
            client_public_key,
            aes_key
        )

        iv_w, encrypted_weights = hybrid_encrypt_with_key(
            aes_key,
            weights,
            is_aes=True
        )

        iv_c, encrypted_config = hybrid_encrypt_with_key(
            aes_key,
            config,
            is_aes=True
        )

        tx_size_mb = len(encrypted_weights) / (1024 * 1024)
        rpc_latency = (time.time() - rpc_start) * 1000

        with state_lock:
            rpc_latencies.append(rpc_latency)
            if rpc_latency > max_rpc_latency:
                max_rpc_latency = rpc_latency

            total_encrypted_tx_mb += tx_size_mb
            add_log("SECURE", f"Encrypted global sent to {client_name}")

        return federated_pb2.EncryptedGlobalResponse(
            message="Encrypted global model sent",
            encrypted_key=encrypted_key,
            iv_weights=iv_w,
            iv_config=iv_c,
            encrypted_weights=encrypted_weights,
            encrypted_config=encrypted_config
        )


# =========================================================
# SERVER START
# =========================================================

def serve():
    os.makedirs(SERVER_STORAGE, exist_ok=True)
    os.makedirs(GLOBAL_DIR, exist_ok=True)

    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        options=[
            ('grpc.max_send_message_length', 100 * 1024 * 1024),
            ('grpc.max_receive_message_length', 100 * 1024 * 1024),
        ]
    )

    federated_pb2_grpc.add_FederatedServiceServicer_to_server(
        FederatedService(), server
    )

    server.add_insecure_port("0.0.0.0:50051")
    server.start()

    add_log("INFO", "Secure Federated Server started on port 50051")

    server.wait_for_termination()