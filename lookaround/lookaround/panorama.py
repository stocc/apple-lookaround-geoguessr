import math
class LookaroundPanorama:
    def __init__(self, panoid, region_id, lat, lon, unknown10, unknown11):
        self.panoid = panoid
        self.region_id = region_id
        self.lat = lat
        self.lon = lon
        self.unknown10 = unknown10
        self.unknown11 = unknown11
        self.date = None

    '''
    Approximate heading of the panorama, assuming the POV is facing 
    to the left of the Apple Car in cthe direction of driving.
    '''
    def heading(self):
        # Whatever is the logic behind this? 
        # Who at Apple thought of these values? 

        # unknown10
        # These are the extreme values of unkown10 I have observed in a random selection of about 1000 tiles.
        # The values are in two clusters. 
        # In the range [1,2159] you're looking more west than east.
        # In the range [14318,16383] you're looking more east than west.
        westmin = 1
        westmax = 2159
        eastmin = 16383 # looking (north/south) and very slightly east
        eastmax = 14318 # looking slightly (north/south) directly east

        # unknown11
        # This is slightly more speculative
        northmin = 8204 # this is likely lower
        northmax = 6054
        southmin = 8204 # this is likely lower
        southmax = 10173


        ew=0
        if self.unknown10 < westmax:
            # Looking west
            ew = -(float(self.unknown10 - westmin) / float(westmax - westmin))
        elif self.unknown10 > eastmax:
            # Looking east
            ew = (float(self.unknown10 - eastmin) / float(eastmax - eastmin))

        ns=0
        if self.unknown11 <= northmin:
            # Looking north
            ns = (float(self.unknown11 - northmin) / float(northmax - northmin))
        else:
            ns = -(float(self.unknown11 - southmin) / float(southmax - southmin))
    

        print(ns,ew)
        r =  math.degrees(math.atan2(ew,ns))
        if r < 0:
            r += 360
        return r


    def __repr__(self):
        return str(self)

    def __str__(self):
        return f"{self.panoid}/{self.region_id} ({self.lat:.6}, {self.lon:.6}) " \
               f"[{self.date.strftime('%Y-%m-%d')}]"
