#pragma once
#include <string>
#include <vector>
#include <map>
#include <sstream>
#include <algorithm>

namespace aegis::die::common {

inline std::string serializeVector(const std::vector<std::string>& vec) {
  std::stringstream ss;
  ss << "[";
  for (size_t i = 0; i < vec.size(); ++i) {
    ss << "\"" << vec[i] << "\"";
    if (i + 1 < vec.size()) ss << ",";
  }
  ss << "]";
  return ss.str();
}

inline std::string serializeMap(const std::map<std::string, std::string>& m) {
  std::stringstream ss;
  ss << "{";
  size_t i = 0;
  for (const auto& [k, v] : m) {
    ss << "\"" << k << "\":\"" << v << "\"";
    if (++i < m.size()) ss << ",";
  }
  ss << "}";
  return ss.str();
}

inline std::string parseString(const std::string& json, const std::string& key) {
  std::string searchKey = "\"" + key + "\"";
  auto pos = json.find(searchKey);
  if (pos == std::string::npos) return "";
  
  auto colonPos = json.find(":", pos + searchKey.length());
  if (colonPos == std::string::npos) return "";
  
  auto quoteStart = json.find("\"", colonPos);
  if (quoteStart == std::string::npos) return "";
  
  auto quoteEnd = json.find("\"", quoteStart + 1);
  if (quoteEnd == std::string::npos) return "";
  
  return json.substr(quoteStart + 1, quoteEnd - quoteStart - 1);
}

inline double parseDouble(const std::string& json, const std::string& key, double fallback = 0.0) {
  std::string searchKey = "\"" + key + "\"";
  auto pos = json.find(searchKey);
  if (pos == std::string::npos) return fallback;
  
  auto colonPos = json.find(":", pos + searchKey.length());
  if (colonPos == std::string::npos) return fallback;
  
  auto valStart = colonPos + 1;
  while (valStart < json.length() && (json[valStart] == ' ' || json[valStart] == '\t' || json[valStart] == '\r' || json[valStart] == '\n')) {
    valStart++;
  }
  
  auto valEnd = json.find_first_of(", \t\r\n}", valStart);
  if (valEnd == std::string::npos) return fallback;
  
  try {
    return std::stod(json.substr(valStart, valEnd - valStart));
  } catch (...) {
    return fallback;
  }
}

inline int parseInt(const std::string& json, const std::string& key, int fallback = 0) {
  return static_cast<int>(parseDouble(json, key, fallback));
}

inline uint64_t parseUint64(const std::string& json, const std::string& key, uint64_t fallback = 0) {
  std::string searchKey = "\"" + key + "\"";
  auto pos = json.find(searchKey);
  if (pos == std::string::npos) return fallback;
  
  auto colonPos = json.find(":", pos + searchKey.length());
  if (colonPos == std::string::npos) return fallback;
  
  auto valStart = colonPos + 1;
  while (valStart < json.length() && (json[valStart] == ' ' || json[valStart] == '\t' || json[valStart] == '\r' || json[valStart] == '\n')) {
    valStart++;
  }
  
  auto valEnd = json.find_first_of(", \t\r\n}", valStart);
  if (valEnd == std::string::npos) return fallback;
  
  try {
    return std::stoull(json.substr(valStart, valEnd - valStart));
  } catch (...) {
    return fallback;
  }
}

inline bool parseBool(const std::string& json, const std::string& key, bool fallback = false) {
  std::string searchKey = "\"" + key + "\"";
  auto pos = json.find(searchKey);
  if (pos == std::string::npos) return fallback;
  
  auto colonPos = json.find(":", pos + searchKey.length());
  if (colonPos == std::string::npos) return fallback;
  
  auto valStart = colonPos + 1;
  while (valStart < json.length() && (json[valStart] == ' ' || json[valStart] == '\t' || json[valStart] == '\r' || json[valStart] == '\n')) {
    valStart++;
  }
  
  if (json.compare(valStart, 4, "true") == 0) return true;
  if (json.compare(valStart, 5, "false") == 0) return false;
  return fallback;
}

inline std::vector<std::string> parseVector(const std::string& json, const std::string& key) {
  std::vector<std::string> result;
  std::string searchKey = "\"" + key + "\"";
  auto pos = json.find(searchKey);
  if (pos == std::string::npos) return result;
  
  auto colonPos = json.find(":", pos + searchKey.length());
  if (colonPos == std::string::npos) return result;
  
  auto bracketStart = json.find("[", colonPos);
  if (bracketStart == std::string::npos) return result;
  
  auto bracketEnd = json.find("]", bracketStart);
  if (bracketEnd == std::string::npos) return result;
  
  std::string content = json.substr(bracketStart + 1, bracketEnd - bracketStart - 1);
  size_t idx = 0;
  while (idx < content.length()) {
    auto qStart = content.find("\"", idx);
    if (qStart == std::string::npos) break;
    auto qEnd = content.find("\"", qStart + 1);
    if (qEnd == std::string::npos) break;
    result.push_back(content.substr(qStart + 1, qEnd - qStart - 1));
    idx = qEnd + 1;
  }
  return result;
}

inline std::map<std::string, std::string> parseMap(const std::string& json, const std::string& key) {
  std::map<std::string, std::string> result;
  std::string searchKey = "\"" + key + "\"";
  auto pos = json.find(searchKey);
  if (pos == std::string::npos) return result;
  
  auto colonPos = json.find(":", pos + searchKey.length());
  if (colonPos == std::string::npos) return result;
  
  auto braceStart = json.find("{", colonPos);
  if (braceStart == std::string::npos) return result;
  
  // Find matching closing brace
  int braceCount = 1;
  size_t idx = braceStart + 1;
  while (idx < json.length() && braceCount > 0) {
    if (json[idx] == '{') braceCount++;
    else if (json[idx] == '}') braceCount--;
    if (braceCount == 0) break;
    idx++;
  }
  if (braceCount > 0) return result;
  
  std::string content = json.substr(braceStart + 1, idx - braceStart - 1);
  size_t sIdx = 0;
  while (sIdx < content.length()) {
    auto kStart = content.find("\"", sIdx);
    if (kStart == std::string::npos) break;
    auto kEnd = content.find("\"", kStart + 1);
    if (kEnd == std::string::npos) break;
    std::string k = content.substr(kStart + 1, kEnd - kStart - 1);
    
    auto col = content.find(":", kEnd + 1);
    if (col == std::string::npos) break;
    
    auto vStart = content.find("\"", col + 1);
    if (vStart == std::string::npos) break;
    auto vEnd = content.find("\"", vStart + 1);
    if (vEnd == std::string::npos) break;
    std::string v = content.substr(vStart + 1, vEnd - vStart - 1);
    
    result[k] = v;
    sIdx = vEnd + 1;
  }
  
  return result;
}

} // namespace aegis::die::common
