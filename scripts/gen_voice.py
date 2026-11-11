import asyncio
import json
import os
import subprocess
import edge_tts

SCRIPT = (
    "He hung a seven-hundred-and-thirty-ton wrecking ball inside a brand-new skyscraper. "
    "You see, two companies are racing to build the tallest hotel on a hurricane coast. "
    "And whoever finishes first gets the billionaire bookings for the whole country. "
    "He's the youngest engineer on the crew. "
    "And when his boss sees four hollow floors wasted on a giant swinging sphere, he goes purple: "
    "\"You're wrecking my penthouse!\" "
    "But he won't unhook a single cable. "
    "The other company pours twice the concrete, bolts their steel rigid as stone, and finishes first. "
    "Their tower stands dead still in the breeze, while his sways with a creepy whoosh inside the walls. "
    "Newspapers call it The Seasick Tower, and everyone books the rigid hotel. "
    "Then typhoon season hits, and something weird happens. "
    "In September, the ball swings the width of a dinner plate. "
    "By October, the length of a bathtub. "
    "And his boss is furious: \"See, your own weight is tearing us apart!\" "
    "Meanwhile, in the rigid tower, the stiff steel columns groan in the gale, fighting every gust with nowhere to bend. "
    "In the worst super-storm anyone can remember, his giant ball swings the opposite way of the wind, keeping the floor dead level, "
    "right as the rigid tower snaps at the waist like dry chalk."
)

async def main():
    os.makedirs("g:/ambia/voice", exist_ok=True)
    mp3_path = "g:/ambia/voice/voice_raw.mp3"
    wav_path = "g:/ambia/voice/voice.wav"
    words_path = "g:/ambia/voice/words.json"

    comm = edge_tts.Communicate(SCRIPT, voice="en-US-GuyNeural", rate="+22%", boundary="WordBoundary")
    words = []
    with open(mp3_path, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                s = round(chunk["offset"] / 1e7, 3)
                d = round(chunk["duration"] / 1e7, 3)
                words.append({"w": chunk["text"], "s": s, "e": round(s + d, 3)})

    with open(words_path, "w", encoding="utf-8") as f:
        json.dump(words, f, indent=2)

    # Convert to 48 kHz mono/stereo WAV
    subprocess.run([
        "ffmpeg", "-y", "-i", mp3_path,
        "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le",
        wav_path
    ], check=True)

    print(f"Generated {len(words)} words. Last word ends at {words[-1]['e']}s")
    for i, w in enumerate(words):
        if i % 10 == 0 or i == len(words) - 1:
            print(f"  [{i}] {w['s']:.2f}s - {w['e']:.2f}s : {w['w']}")

if __name__ == "__main__":
    asyncio.run(main())
