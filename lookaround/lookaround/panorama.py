class LookaroundPanorama:
    def __init__(self, panoid, region_id, lat, lon, unknown10, unknown11, heading):
        self.panoid = panoid
        self.region_id = region_id
        self.lat = lat
        self.lon = lon
        self.unknown10 = unknown10
        self.unknown11 = unknown11
        self.date = None
        self.heading = heading



    def __repr__(self):
        return str(self)

    def __str__(self):
        return f"{self.panoid}/{self.region_id} ({self.lat:.6}, {self.lon:.6}) {self.heading}" \
               f"[{self.date.strftime('%Y-%m-%d')}]"
