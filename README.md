# PeerGame

Stream and Play games with your peers

## Open Source
Client tested on node version 14.17.5, peerjs-client 0.3.15.   
Server tested on node version 14.17.5, express 4.17.2, peer 0.6.1.   
Python backends run on Python3.   
Input Backend uses Windows DirectInput, Streamer peer MUST be running Windows. 

## Setup Frontend and Peer-to-Peer
Clone repository, in root directory run "npm install" and "npm start".   
Cd to server directory and run "npm install" and "node index.js".   

## Setup Recommender Service
Cd to recommender directory and add firebase serviceAccountKey.json.   
Run "python3 recommender_controller.py" and install required libraries via pip3.   

## Setup Input Backend
Cd to input_backend directory and run "python3 api.py" and install required libraries via pip3.   

## Start Connecting Peers
Once frontend and peer-to-peer is setup, you can start opening up multiple instances of the client via "npm start" on different ports and use the frontend to start streaming and playing games! Refer to the demo videos on the various ways of making connections.
