from typing import final
import requests
import json

panos = []

try: 
    for i in range(68630,68630+100):
        for j in range(43260,43260+100):
            print("http://localhost:5001/rawtile/{}/{}/".format(i,j))
            resp = requests.get("http://localhost:5001/rawtile/{}/{}/".format(i,j))
            j = (resp.json())
            print("{}/{}".format(i,j))

            if not "pano" in resp.json().keys():
                continue
            panos.extend(j["pano"])
except KeyboardInterrupt:
    pass
finally:
    with open("random.json", "w") as f:
        json.dump(panos, f)