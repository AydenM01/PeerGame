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
    commands = data['command'].split(',')
    print(commands)
    if commands[0] == 'w':
        if commands[1] == 'keydown':
            print('w pressed')
            time.sleep(1)
            PressKey(W)
        elif commands[1] == 'keyup':
            print('w released')
            #ReleaseKey(W)
    return 'DONE'
    

app.run()