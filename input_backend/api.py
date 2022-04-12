import flask
from flask import request
from flask_cors import CORS
import json
import time

from directkeys import PressKey, ReleaseKey, W, A, S, D, C, V

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
            #time.sleep(1)
            PressKey(W)
        elif command == 'ku':
            ReleaseKey(W)
    elif key == 'a':
        if command == 'kd':
            #time.sleep(1)
            PressKey(A)
        elif command == 'ku':
            ReleaseKey(A)
    elif key == 's':
        if command == 'kd':
            #time.sleep(1)
            PressKey(S)
        elif command == 'ku':
            ReleaseKey(S)
    elif key == 'd':
        if command == 'kd':
            #time.sleep(1)
            PressKey(D)
        elif command == 'ku':
            ReleaseKey(D)
    return 'DONE'
    
if __name__ == '__main__':
    app.run(host="localhost", port=5001, debug=True)