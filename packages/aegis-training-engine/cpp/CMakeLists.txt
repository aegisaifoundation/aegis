cmake_minimum_required(VERSION 3.15)
project(AegisDatasetIndexer LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(dataset-indexer dataset_indexer.cpp)

install(TARGETS dataset-indexer DESTINATION bin)
