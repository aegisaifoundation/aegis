#pragma once
#include <iostream>
#include <vector>
#include <string>
#include <functional>
#include <stdexcept>

namespace aegis::die::tests {

struct TestCase {
  std::string name;
  std::function<void()> func;
};

inline std::vector<TestCase>& get_tests() {
  static std::vector<TestCase> tests;
  return tests;
}

inline void register_test(const std::string& name, std::function<void()> func) {
  get_tests().push_back({name, func});
}

} // namespace aegis::die::tests

#define DIE_TEST(name) \
  void name(); \
  static struct Register_##name { \
    Register_##name() { \
      aegis::die::tests::register_test(#name, name); \
    } \
  } reg_##name; \
  void name()

#define DIE_ASSERT(cond) \
  if (!(cond)) { \
    throw std::runtime_error(std::string("Assertion failed: ") + #cond + " at " + __FILE__ + ":" + std::to_string(__LINE__)); \
  }
