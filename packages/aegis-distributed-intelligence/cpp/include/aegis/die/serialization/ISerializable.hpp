#pragma once
#include <string>
#include <vector>

namespace aegis::die::serialization {

class ISerializable {
public:
  virtual ~ISerializable() = default;
  virtual std::string toJson() const = 0;
  virtual bool fromJson(const std::string& json) = 0;
  
  virtual std::vector<uint8_t> toBinary() const = 0;
  virtual bool fromBinary(const std::vector<uint8_t>& binary) = 0;
};

} // namespace aegis::die::serialization
