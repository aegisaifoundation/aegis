#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <cstdint>

int main(int argc, char* argv[]) {
    if (argc < 3) {
        std::cerr << "Usage: " << argv[0] << " <input_dataset.jsonl> <output_index.idx>" << std::endl;
        return 1;
    }

    std::string inputPath = argv[1];
    std::string outputPath = argv[2];

    std::ifstream inFile(inputPath, std::ios::binary);
    if (!inFile.is_open()) {
        std::cerr << "Error: Could not open input file: " << inputPath << std::endl;
        return 1;
    }

    std::ofstream outFile(outputPath, std::ios::binary);
    if (!outFile.is_open()) {
        std::cerr << "Error: Could not open output file: " << outputPath << std::endl;
        return 1;
    }

    std::vector<uint64_t> lineOffsets;
    uint64_t currentOffset = 0;
    
    // Always index the start of the first line
    lineOffsets.push_back(currentOffset);

    std::string line;
    while (std::getline(inFile, line)) {
        currentOffset = inFile.tellg();
        // tellg() returns -1 on EOF or error
        if (inFile.fail() || inFile.eof()) {
            break;
        }
        lineOffsets.push_back(currentOffset);
    }

    // Write count of lines first (uint64_t)
    uint64_t lineCount = lineOffsets.size();
    outFile.write(reinterpret_cast<const char*>(&lineCount), sizeof(lineCount));

    // Write offsets array
    outFile.write(reinterpret_cast<const char*>(lineOffsets.data()), lineCount * sizeof(uint64_t));

    std::cout << "Successfully indexed " << lineCount << " lines. Offsets saved to: " << outputPath << std::endl;
    return 0;
}
