import grpc
import federated_pb2
import federated_pb2_grpc

CLIENT_NAME = "client_a"
SERVER_ADDRESS = "192.168.1.3:50051"

print("Sending heartbeat...")

channel = grpc.insecure_channel(SERVER_ADDRESS)
stub = federated_pb2_grpc.FederatedServiceStub(channel)

response = stub.Heartbeat(
    federated_pb2.HeartbeatRequest(
        client_name=CLIENT_NAME
    )
)

print("Server Response:", response.message)