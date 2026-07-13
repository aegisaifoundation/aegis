# Retrieval Augmented Generation Pipeline

A lightweight RAG project for document search and inference using local models and a simple Python pipeline.

## Overview

This repository contains a minimal retrieval-augmented generation project built around local GGUF models and Python utilities. It includes a data pipeline, embedding/search support, and inference scripts.

## Contents

- adapter.gguf - local adapter model file (ignored by Git)
- model.gguf - local model file (ignored by Git)
- 
rag_inference.py - top-level inference entrypoint
- search.py - search/embedding helper script
- 
rag_pipeline_1/ - pipeline implementation and service examples
- 
requirements.txt - project requirements
- 
requirement.txt - generated freeze output from the current virtual environment

## Setup

1. Create and activate the virtual environment:
   `powershell
   .\venv\Scripts\Activate.ps1
   `

2. Install dependencies:
   `powershell
   python -m pip install -r requirements.txt
   `

3. If needed, regenerate the freeze file:
   `powershell
   python -m pip freeze > riquirement.txt
   `

## Usage

Run the main inference script or explore the pipeline modules:

`powershell
python rag_inference.py
`

Or run the pipeline example:

`powershell
python rag_pipeline_1/main.py
`

## Notes

- venv/, adapter.gguf, model.gguf, and 
ag_pipeline*/documents/ are excluded from Git.
- Keep local model artifacts out of the repository and load them from a secure location during runtime.

## License

This project is available under the terms of the repository owner.
