import os
import sqlite3
import secrets

from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend


# =========================================================
# PATHS
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KEY_DIR = os.path.join(BASE_DIR, "keys")
DB_PATH = os.path.join(BASE_DIR, "client_keys.db")

os.makedirs(KEY_DIR, exist_ok=True)


# =========================================================
# SERVER RSA KEY GENERATION
# =========================================================

def generate_server_keys():
    private_path = os.path.join(KEY_DIR, "server_private.pem")
    public_path = os.path.join(KEY_DIR, "server_public.pem")

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


def load_server_private_key():
    with open(os.path.join(KEY_DIR, "server_private.pem"), "rb") as f:
        return serialization.load_pem_private_key(
            f.read(),
            password=None
        )


def load_server_public_key():
    with open(os.path.join(KEY_DIR, "server_public.pem"), "rb") as f:
        return serialization.load_pem_public_key(f.read())


# =========================================================
# DATABASE
# =========================================================

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS client_keys (
            client_name TEXT PRIMARY KEY,
            public_key TEXT
        )
    """)

    conn.commit()
    conn.close()


def register_client_key(client_name, public_key_bytes):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT OR REPLACE INTO client_keys (client_name, public_key)
        VALUES (?, ?)
    """, (client_name, public_key_bytes.decode()))

    conn.commit()
    conn.close()


def get_client_public_key(client_name):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT public_key FROM client_keys
        WHERE client_name = ?
    """, (client_name,))

    row = cursor.fetchone()
    conn.close()

    if row is None:
        return None

    return serialization.load_pem_public_key(row[0].encode())


# =========================================================
# AES HELPERS
# =========================================================

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


# =========================================================
# HYBRID ENCRYPTION
# =========================================================

def hybrid_encrypt_with_key(key, data, is_aes=False):

    if is_aes:
        # AES encrypt using existing AES key
        iv, encrypted = aes_encrypt(key, data)
        return iv, encrypted

    else:
        # RSA encrypt AES key
        encrypted_key = key.encrypt(
            data,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        return encrypted_key


def hybrid_decrypt_with_key(private_key, encrypted_key, iv, encrypted_data):

    # Decrypt AES key using RSA
    aes_key = private_key.decrypt(
        encrypted_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )

    # Decrypt data using AES
    return aes_decrypt(aes_key, iv, encrypted_data)