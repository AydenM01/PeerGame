import flask
from flask import request
from flask_cors import CORS
import json
import time

from directkeys import PressKey, ReleaseKey, W, A, S, D

app = flask.Flask(__name__)
CORS(app)
app.config["DEBUG"] = True


@app.route('/input', methods=['POST'])
def parse_request():
    data = request.get_json()
    command = data['type']
    key = data['key']
    print(command, key)

    if key == 'w':
        if command == 'kd':
            print('w pressed')
            #time.sleep(1)
            PressKey(W)
        elif command == 'ku':
            print('w released')
            ReleaseKey(W)
    elif key == 'a':
        if command == 'kd':
            print('a pressed')
            #time.sleep(1)
            PressKey(A)
        elif command == 'ku':
            print('A released')
            ReleaseKey(A)
    elif key == 's':
        if command == 'kd':
            print('S pressed')
            #time.sleep(1)
            PressKey(S)
        elif command == 'ku':
            print('S released')
            ReleaseKey(S)
    elif key == 'd':
        if command == 'kd':
            print('d pressed')
            #time.sleep(1)
            PressKey(D)
        elif command == 'ku':
            print('d released')
            ReleaseKey(D)
    return 'DONE'
    
if __name__ == '__main__':
    app.run(host="localhost", port=5001, debug=True)