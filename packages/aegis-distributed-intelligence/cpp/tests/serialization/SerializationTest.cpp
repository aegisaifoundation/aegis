#include "../TestHelper.hpp"
#include "aegis/die/serialization/ISerializable.hpp"

namespace {
class MockSerializable : public aegis::die::serialization::ISerializable {
public:
  std::string toJson() const override { return "{\"mock\":true}"; }
  bool fromJson(const std::string& json) override { return json == "{\"mock\":true}"; }
  std::vector<uint8_t> toBinary() const override { return {1, 2, 3}; }
  bool fromBinary(const std::vector<uint8_t>& binary) override { return binary.size() == 3; }
};
}

DIE_TEST(ISerializableInterfaceTest) {
  MockSerializable ser;
  DIE_ASSERT(ser.toJson() == "{\"mock\":true}");
  DIE_ASSERT(ser.toBinary().size() == 3);
}
