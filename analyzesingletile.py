import json, numpy, requests
from matplotlib import pyplot as plt
import sys

tileX = sys.argv[1]
tileY = sys.argv[2]

unknown_10s = {}
unknown_11s = {}

resp = requests.get("http://127.0.0.1:5001/rawtile/{}/{}/".format(tileX,tileY))
j = (resp.json())

fn = str(tileX) + "/" + str(tileY) + ".json"

u10 = []
u11 = []
for p in j["pano"]:
    try:
        u10.append(p["unknown4"]["unknown10"])
        u11.append(p["unknown4"]["unknown11"])
    except:
        print(p)
unknown_10s[fn] = u10
unknown_11s[fn] = u11


#print(min(unknown_10s["random.json"]), max(unknown_10s["random.json"]))
#print(min(unknown_11s["random.json"]), max(unknown_11s["random.json"]))

plt.figure(figsize=(20,10))
plt.subplot(2,1,1)
plt.title("unknown10")
plt.xlim(left=0, right=16400)
#plt.hlines(1,1,20)  # Draw a horizontal line
colors=["red", "blue", "green", "black"]
i = 0
for k,v in unknown_10s.items():
    plt.eventplot(v, label=k, orientation='horizontal', colors=colors[i], linewidths=1)
    i += 1
plt.legend()
#plt.axis('off')
plt.subplot(2,1,2)
plt.title("unknown11")
plt.xlim(left=0, right=12000)

#plt.hlines(1,1,20)  # Draw a horizontal line
i = 0
for k,v in unknown_11s.items():
    plt.eventplot(v, label=k, orientation='horizontal', colors=colors[i], linewidths=1)
    i += 1
plt.legend()
#plt.axis('off')
plt.show()