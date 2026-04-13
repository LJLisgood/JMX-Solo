import requests

file_path = "/Users/jerrystack/Desktop/WorkSpace/jmx-0402/querymemberInf_pro_200.jmx"

with open(file_path, "rb") as f:
    files = {"file": f}
    response = requests.post("http://localhost:8080/api/scripts/upload", files=files)

print("Status:", response.status_code)
print("Response:", response.text)
