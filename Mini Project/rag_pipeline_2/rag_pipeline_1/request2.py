import requests

url = "http://127.0.0.1:8000/result"
params = {"question" : "what is the measure of lymphocytes? "}

r = requests.get(url, params = params)
print(r.json())