import grpc
import os
import sys

import federated_pb2
import federated_pb2_grpc

from security_client import (
    generate_client_keys,
    generate_aes_key,
    hybrid_encrypt_with_key
)

from cryptography.hazmat.primitives import serialization


CLIENT_NAME = "client_a"   # change for client_b
SERVER_ADDRESS = "192.168.1.2:50051"  # change to your server IP

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KEY_DIR = os.path.join(BASE_DIR, "keys")
SERVER_KEY_PATH = os.path.join(KEY_DIR, "server_public.pem")
LORA_DIR = os.path.join(BASE_DIR, "local_lora")


print("Secure Client Starting...")

generate_client_keys()

channel = grpc.insecure_channel(
    SERVER_ADDRESS,
    options=[
        ('grpc.max_send_message_length', 100 * 1024 * 1024),
        ('grpc.max_receive_message_length', 100 * 1024 * 1024),
    ]
)

stub = federated_pb2_grpc.FederatedServiceStub(channel)


# ===============================
# REGISTER IF FIRST TIME
# ===============================

with open(os.path.join(KEY_DIR, "client_public.pem"), "rb") as f:
    client_public_key = f.read()

if not os.path.exists(SERVER_KEY_PATH):

    print("Registering client with server...")

    response = stub.RegisterClient(
        federated_pb2.RegisterRequest(
            client_name=CLIENT_NAME,
            client_public_key=client_public_key
        )
    )

    with open(SERVER_KEY_PATH, "wb") as f:
        f.write(response.server_public_key)

    print("Client registered successfully.")

else:
    print("Client already registered.")


# ===============================
# LOAD SERVER PUBLIC KEY
# ===============================

with open(SERVER_KEY_PATH, "rb") as f:
    server_public_key = serialization.load_pem_public_key(f.read())


# ===============================
# LOAD LORA FILES
# ===============================

with open(os.path.join(LORA_DIR, "adapter_model.safetensors"), "rb") as f:
    weights = f.read()

with open(os.path.join(LORA_DIR, "adapter_config.json"), "rb") as f:
    config = f.read()

print("Encrypting LoRA...")

# Generate ONE AES key
aes_key = generate_aes_key()

# Encrypt AES key with server RSA
encrypted_key = hybrid_encrypt_with_key(server_public_key, aes_key)

# Encrypt weights & config with same AES key
iv_w, encrypted_weights = hybrid_encrypt_with_key(aes_key, weights, is_aes=True)
iv_c, encrypted_config = hybrid_encrypt_with_key(aes_key, config, is_aes=True)


# ===============================
# SEND TO SERVER
# ===============================

response = stub.SendLoRA(
    federated_pb2.EncryptedLoRARequest(
        client_name=CLIENT_NAME,
        encrypted_key=encrypted_key,
        iv_weights=iv_w,
        iv_config=iv_c,
        encrypted_weights=encrypted_weights,
        encrypted_config=encrypted_config
    )
)

print("Server Response:", response.message)
print("Encrypted LoRA uploaded successfully.")