import requests

url = "http://192.168.1.3:8000/gResult"
params = {"question": "what is the hemoglobin level? "}

r = requests.get(url,params = params)
print(r.json())