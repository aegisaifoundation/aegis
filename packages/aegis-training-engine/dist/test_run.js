import { pythonIpcBridge } from './services/PythonIpcBridge.js';
console.log("Starting python process via bridge...");
pythonIpcBridge.on('log', (msg) => {
    console.log("BRIDGE LOG:", msg);
});
pythonIpcBridge.start()
    .then(async () => {
    console.log("Python service is ready!");
    const hardware = await pythonIpcBridge.request('hardware_status', {});
    console.log("Hardware stats:", hardware);
    pythonIpcBridge.stop();
})
    .catch(err => {
    console.error("FAILED to start:", err);
    pythonIpcBridge.stop();
});
//# sourceMappingURL=test_run.js.map