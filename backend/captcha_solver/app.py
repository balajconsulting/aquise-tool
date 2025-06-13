from flask import Flask, request, jsonify
import os
import urllib.request
import random
import pydub
import speech_recognition

app = Flask(__name__)

TEMP_DIR = os.getenv("TEMP") if os.name == "nt" else "/tmp"
recognizer = speech_recognition.Recognizer()

@app.route('/solve', methods=['POST'])
def solve():
    data = request.get_json()
    audio_url = data.get('audio_url')
    if not audio_url:
        return jsonify({'error': 'audio_url fehlt'}), 400
    mp3_path = os.path.join(TEMP_DIR, f"{random.randrange(1,1000)}.mp3")
    wav_path = os.path.join(TEMP_DIR, f"{random.randrange(1,1000)}.wav")
    try:
        urllib.request.urlretrieve(audio_url, mp3_path)
        sound = pydub.AudioSegment.from_mp3(mp3_path)
        sound.export(wav_path, format="wav")
        with speech_recognition.AudioFile(wav_path) as source:
            audio = recognizer.record(source)
        text = recognizer.recognize_google(audio)
        return jsonify({'result': text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        for path in (mp3_path, wav_path):
            if os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass

if __name__ == '__main__':
    app.run(port=5005) 