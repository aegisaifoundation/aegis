export const AEGIS_NET_PROTOCOL_VERSION = '1.0.0';
export var PeerConnectionState;
(function (PeerConnectionState) {
    PeerConnectionState["DISCONNECTED"] = "DISCONNECTED";
    PeerConnectionState["DISCOVERED"] = "DISCOVERED";
    PeerConnectionState["CONNECTING"] = "CONNECTING";
    PeerConnectionState["TRANSPORT_CONNECTED"] = "TRANSPORT_CONNECTED";
    PeerConnectionState["HANDSHAKING"] = "HANDSHAKING";
    PeerConnectionState["VERIFIED"] = "VERIFIED";
    PeerConnectionState["ACTIVE"] = "ACTIVE";
})(PeerConnectionState || (PeerConnectionState = {}));
