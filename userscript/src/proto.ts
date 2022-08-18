
let mapTile = `
syntax = "proto3";

message MapTile {
  repeated Pano pano = 1;
  repeated Unknown13 unknown13 = 4;
  repeated Unknown22 unknown22 = 5;
  TileCoordinate tileCoordinate = 6;
  
  message Pano {
    uint64 panoid = 1;
    int32 unknown1 = 4;
    int64 timestamp = 5; // time the pano was taken
    int32 region_id_idx = 7;
    repeated int32 unknown3 = 9; // goes from 0 to 5. available sizes maybe?
    Unknown4 unknown4 = 10;
    Unknown5 unknown5 = 12;
    
    message Unknown4 {
      int32 longitude_offset = 1;
      int32 latitude_offset = 2;
      int32 unknown8 = 3;
      int32 unknown9 = 4;
      int32 unknown10 = 5;
      int32 unknown11 = 6;
    }
    
    message Unknown5 {
      repeated int32 unknown12 = 1;
    }
  }
  
  message Unknown13 {
    int32 unknown14 = 1;
    // this is the param that appears in pano URLs after the pano ID. 
    // no idea what this does exactly.
    int32 region_id = 3;
    int32 unknown15 = 4;
    int32 unknown16 = 5;
    int32 unknown17 = 6;
    int32 unknown18 = 9;
    int32 unknown19 = 10;
    int32 unknown20 = 11;
    int32 unknown21 = 12;
  }
  
  message Unknown22 {
    int32 unknown23 = 1;
    Unknown24 unknown24 = 4;
    Unknown25 unknown25 = 5;
    int32 unknown26 = 6;

    message Unknown24 {
      int32 unknown27 = 1;
      double unknown28 = 2;
      double unknown29 = 3;
      double unknown30 = 4;
      double unknown31 = 5;
      double unknown32 = 6;
      double unknown33 = 7;
      double unknown34 = 8;
      double unknown35 = 9;
      double unknown36 = 10;
    }

    message Unknown25 {
      double unknown37 = 1;
      double unknown38 = 2;
      double unknown39 = 3;
      double unknown40 = 4;
      double unknown41 = 5;
      double unknown42 = 6;
    }
  }

  message TileCoordinate {
    int32 x = 1;
    int32 y = 2;
    int32 z = 3;
  }
  
}`

let resourceManifest = `
syntax = "proto3";

message ResourceManifest {
	repeated StyleConfig style_config = 2;
	string token_p2 = 30;
	string cache_base_url = 31;
	repeated CacheFile cache_file = 72;
	repeated string cache_file_2 = 9;

	message CacheFile {
		string file_name = 2;
	}

	message StyleConfig {
		string url_prefix_1 = 1;
		string url_prefix_2 = 9;
		StyleID style_id = 3;

		enum StyleID {
			_ = 0;
			C3MM_1 = 14;
			C3M = 15;
			DTM_1 = 16;
			DTM_2 = 17;
			C3MM_2 = 52;
		}
	}	
}
`

export default class Proto {


  static async parseResourceManifest(payload) {
      const array = new Uint8Array(payload);
      let manifest = protobuf.parse(resourceManifest).root.lookup("ResourceManifest")
      let message = manifest.decode(array)

      return message;
  }

  static async parseMapTile(payload) {
      const array = new Uint8Array(payload);
      let manifest = protobuf.parse(mapTile).root.lookup("MapTile")
      let message = manifest.decode(array)
      return message
  }
}