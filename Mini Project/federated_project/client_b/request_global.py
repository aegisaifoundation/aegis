import grpc
import os

import federated_pb2
import federated_pb2_grpc

from security_client import (
    load_client_private_key,
    hybrid_decrypt_with_key
)


CLIENT_NAME = "client_b"   # change for client_b
SERVER_ADDRESS = "10.174.131.135:50051"  # change to your server IP

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "received_global")

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("Requesting encrypted global model...")

channel = grpc.insecure_channel(
    SERVER_ADDRESS,
    options=[
        ('grpc.max_send_message_length', 100 * 1024 * 1024),
        ('grpc.max_receive_message_length', 100 * 1024 * 1024),
    ]
)

stub = federated_pb2_grpc.FederatedServiceStub(channel)

response = stub.GetGlobal(
    federated_pb2.GlobalRequest(client_name=CLIENT_NAME)
)

if response.message != "Encrypted global model sent":
    print("Server response:", response.message)
    exit()

print("Decrypting global model...")

private_key = load_client_private_key()

# Decrypt AES key
decrypted_weights = hybrid_decrypt_with_key(
    private_key,
    response.encrypted_key,
    response.iv_weights,
    response.encrypted_weights
)

decrypted_config = hybrid_decrypt_with_key(
    private_key,
    response.encrypted_key,
    response.iv_config,
    response.encrypted_config
)

with open(os.path.join(OUTPUT_DIR, "adapter_model.safetensors"), "wb") as f:
    f.write(decrypted_weights)

with open(os.path.join(OUTPUT_DIR, "adapter_config.json"), "wb") as f:
    f.write(decrypted_config)

print("Global model received and decrypted successfully.")