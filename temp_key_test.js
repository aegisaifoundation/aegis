const { generateKeyPairSync } = require("crypto");
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
console.log(publicKey.export({format:"ssh"}).toString());
console.log('-----');
console.log(privateKey.export({format:"pem", type:"pkcs8"}).toString());
