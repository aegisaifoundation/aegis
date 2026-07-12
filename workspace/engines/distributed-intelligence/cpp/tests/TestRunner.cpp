#include "TestHelper.hpp"
#include <iostream>

int main() {
  std::cout << "=== AEGIS Distributed Intelligence Kernel Test Suite ===" << std::endl;
  int passed = 0;
  int failed = 0;
  
  for (const auto& testCase : aegis::die::tests::get_tests()) {
    std::cout << "[Run] " << testCase.name << "... ";
    try {
      testCase.func();
      std::cout << "PASSED" << std::endl;
      passed++;
    } catch (const std::exception& e) {
      std::cout << "FAILED: " << e.what() << std::endl;
      failed++;
    } catch (...) {
      std::cout << "FAILED: Unknown exception" << std::endl;
      failed++;
    }
  }
  
  std::cout << "\n=======================================================" << std::endl;
  std::cout << "Tests Summary: " << passed << " passed, " << failed << " failed." << std::endl;
  std::cout << "=======================================================" << std::endl;
  
  return failed == 0 ? 0 : 1;
}
