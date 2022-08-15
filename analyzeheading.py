import json, numpy
from matplotlib import pyplot as plt

with open("eastwestAutobahn.json", "r") as f:
    # import as json
    json_obj = json.load(f)

panos = json_obj["pano"]

unknown_8s = []
unknown_9s = []
unknown_10s = []
unknown_11s = []

for p in panos:
    unknown_8s.append(p["unknown4"]["unknown8"])
    unknown_9s.append(p["unknown4"]["unknown9"])
    unknown_10s.append(p["unknown4"]["unknown10"])
    unknown_11s.append(p["unknown4"]["unknown11"])


plt.figure()
#plt.hlines(1,1,20)  # Draw a horizontal line
plt.eventplot(unknown_8s, orientation='horizontal', colors='b')
#plt.axis('off')
plt.show()

