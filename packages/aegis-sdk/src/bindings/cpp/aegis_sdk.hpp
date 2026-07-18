#pragma once

#include <string>
#include <map>
#include <stdexcept>
#include <iostream>

namespace aegis {

class AegisError : public std::runtime_error {
public:
    std::string code;
    AegisError(const std::string& code, const std::string& msg) 
        : std::runtime_error("[" + code + "] " + msg), code(code) {}
};

class AegisSDK {
private:
    std::string endpoint;
    std::string apiKey;
    std::string sessionId;

    std::string syscall(const std::string& category, const std::string& method, const std::string& paramsJson) {
        std::cout << "[ASDK C++] Executing Syscall Category: " << category << " | Method: " << method << std::endl;
        // Mock socket loopback payload return
        return "{\"status\": \"MockSuccess\"}";
    }

public:
    AegisSDK(const std::string& endpoint, const std::string& apiKey) 
        : endpoint(endpoint), apiKey(apiKey), sessionId("sess-cpp-default") {}

    static AegisSDK initialize(const std::string& endpoint, const std::string& apiKey) {
        return AegisSDK(endpoint, apiKey);
    }

    std::string version() {
        return syscall("Runtime", "Version", "{}");
    }

    std::string generate(const std::string& prompt) {
        return syscall("AI Runtime", "Generate", "{\"prompt\": \"" + prompt + "\"}");
    }

    std::string storeMemory(const std::string& key, const std::string& value) {
        return syscall("Memory", "StoreMemory", "{\"key\": \"" + key + "\", \"value\": \"" + value + "\"}");
    }
};

} // namespace aegis
