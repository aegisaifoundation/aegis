import os
import secrets

from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KEY_DIR = os.path.join(BASE_DIR, "keys")

os.makedirs(KEY_DIR, exist_ok=True)


# ==============================
# CLIENT RSA KEY MANAGEMENT
# ==============================

def generate_client_keys():
    private_path = os.path.join(KEY_DIR, "client_private.pem")
    public_path = os.path.join(KEY_DIR, "client_public.pem")

    if os.path.exists(private_path):
        return

    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048
    )

    public_key = private_key.public_key()

    with open(private_path, "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ))

    with open(public_path, "wb") as f:
        f.write(public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ))


def load_client_private_key():
    with open(os.path.join(KEY_DIR, "client_private.pem"), "rb") as f:
        return serialization.load_pem_private_key(
            f.read(),
            password=None
        )


# ==============================
# AES HELPERS
# ==============================

def generate_aes_key():
    return secrets.token_bytes(32)  # 256-bit AES


def aes_encrypt(aes_key, data):
    iv = secrets.token_bytes(16)

    cipher = Cipher(
        algorithms.AES(aes_key),
        modes.CFB(iv),
        backend=default_backend()
    )

    encryptor = cipher.encryptor()
    encrypted = encryptor.update(data) + encryptor.finalize()

    return iv, encrypted


def aes_decrypt(aes_key, iv, encrypted_data):
    cipher = Cipher(
        algorithms.AES(aes_key),
        modes.CFB(iv),
        backend=default_backend()
    )

    decryptor = cipher.decryptor()
    return decryptor.update(encrypted_data) + decryptor.finalize()


# ==============================
# HYBRID ENCRYPTION
# ==============================

def hybrid_encrypt_with_key(key, data, is_aes=False):

    if is_aes:
        # AES encrypt with provided AES key
        return aes_encrypt(key, data)

    else:
        # RSA encrypt AES key
        return key.encrypt(
            data,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )


def hybrid_decrypt_with_key(private_key, encrypted_key, iv, encrypted_data):

    # RSA decrypt AES key
    aes_key = private_key.decrypt(
        encrypted_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )

    # AES decrypt payload
    return aes_decrypt(aes_key, iv, encrypted_data)