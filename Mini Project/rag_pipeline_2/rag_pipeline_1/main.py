from fastapi import FastAPI
from rag_pipeline_1.communication.apiLoader import apiloader,query,generate

app =FastAPI()

@app.get('/ocr')
def ocr(file_path: str):
	result = apiloader(file_path)
	return {"result":result}

@app.get('/result')
def result(question: str):
	answer = query(question)
	return answer

@app.get('/gResult')
def result(question: str):
	answer = generate(question)
	return answer