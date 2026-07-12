#include "../TestHelper.hpp"
#include "aegis/die/common/Types.hpp"
#include "aegis/die/common/UUID.hpp"

DIE_TEST(TypesAndUUIDTest) {
  using namespace aegis::die::common;
  std::string uuid1 = UUID::generate();
  std::string uuid2 = UUID::generate();
  
  DIE_ASSERT(!uuid1.empty());
  DIE_ASSERT(!uuid2.empty());
  DIE_ASSERT(uuid1 != uuid2);
  DIE_ASSERT(uuid1.length() == 36);
}
