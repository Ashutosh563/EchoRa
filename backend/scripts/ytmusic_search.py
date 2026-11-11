import json
import sys

from ytmusicapi import YTMusic


request = json.load(sys.stdin)
query = str(request.get("query", "")).strip()
limit = min(max(int(request.get("limit", 20)), 1), 25)
if not query:
    print(json.dumps([]))
    raise SystemExit(0)

music = YTMusic(language=request.get("language") or "en", location=request.get("location") or "US")
results = music.search(query, filter="songs", limit=limit)
tracks = []
for item in results:
    video_id = item.get("videoId")
    if not video_id:
        continue
    artists = [artist.get("name", "").strip() for artist in item.get("artists", []) if artist.get("name")]
    album = item.get("album") or {}
    tracks.append(
        {
            "videoId": video_id,
            "title": item.get("title", "").strip(),
            "artists": artists,
            "album": album.get("name", "") if isinstance(album, dict) else str(album),
            "thumbnails": item.get("thumbnails") or [],
            "duration": item.get("duration"),
            "year": item.get("year"),
        }
    )

print(json.dumps(tracks, ensure_ascii=False))
