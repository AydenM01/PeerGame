import "./App.css";
import Peer from "peerjs-client";
import React, { useEffect, useRef, useState, createRef } from "react";
import { Box, TextField, Button, Typography, Grid } from "@mui/material";
import { generateQueryId, encode } from "./utils/utils";
import { useDisplay } from "./utils/useDisplay";
import axios from "axios";
import { api_url } from "./env";
import Game from "./components/Game";

function App() {
  /////////////////////// STATEFUL & CLIENT DATA //////////////////////
  const [role, setRole] = useState("Player");
  let connections = useRef({});
  let videoRef = useRef(null);
  let videoRef2 = useRef(null);
  let currCall = useRef(null);
  let currGame = useRef(null);
  let storedFile = null;
  let previousQueries = new Set();
  let gameName = "";
  const [currUser, setCurrUser] = useState("");
  const [recommendedGames, setRecommendedGames] = useState(null);
  const [peerIdInput, setPeerIdInput] = useState("");
  const [loginIdInput, setLoginIdInput] = useState("");
  let currPeer = useRef(null);
  //const [currConnections, setCurrConnections] = useState({});
  const [queryInput, setQueryInput] = useState("");
  const [image, setImage] = useState(null);
  const [serverID, setServerIdInput] = useState("");
  const [callActive, setCallActive] = useState(false);
  const [activeGames, setActiveGames] = useState({});
  const [queryMap, setQueryMap] = useState({});
  const [callListenerToggle, setCallListenerToggle] = useState(false);
  const [currGameInput, setCurrGameInput] = useState("");

  ///////////////////// REACT USE EFFECT HOOKS /////////////////////////////
  useEffect(() => {
    let newId = loginIdInput;
    console.log("Creating Peer with id: " + newId);
    const peer = new Peer(newId, {
      host: api_url,
      port: 9000,
      path: "peerjs/myapp",
      trickle: false,
      renegotiate: false,
    });
    setPeerListeners(peer);
    currPeer.current = peer;
  }, [currUser]);

  useEffect(async () => {
    if (role === "Streamer") {
      let constraints = { video: { width: 240, height: 426 } };
      let track = await navigator.mediaDevices.getDisplayMedia(constraints);
      videoRef.current.srcObject = track;
    }
  }, [role]);

  useEffect(() => {}, [
    image,
    recommendedGames,
    callActive,
    activeGames,
    role,
    serverID,
  ]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  }, []);

  //////////////////////// NON-PEERJS EVENT HANDLERS //////////////////////////////

  const handleKeyUp = (event) => {
    if (event.repeat) {
      return;
    }
    console.log(event);
    let newKeyInput = "ku," + event.key;
    console.log(currPeer.current);
    if (currCall.current != null && currPeer.current != null) {
      console.log("sending keyup");
      let conn = connections.current[currCall.current.peer];
      conn.send(newKeyInput);
    }
  };

  const handleKeyDown = (event) => {
    if (event.repeat) {
      return;
    }
    let newKeyInput = "kd," + event.key;
    if (currCall.current != null && currPeer.current != null) {
      console.log("sending keydown");
      let conn = connections.current[currCall.current.peer];
      conn.send(newKeyInput);
    }
  };

  const sendInput = (type, key) => {
    let config = {
      headers: {
        "Access-Control-Allow_Origin": "*",
        "Content-Type": "application/json",
      },
    };

    let data = {
      type: type,
      key: key,
    };

    axios.post("http://127.0.0.1:5001/input", data, config);
  };

  const getRecommendedGames = async (userId) => {
    let config = {
      headers: {
        "Access-Control-Allow_Origin": "*",
        "Content-Type": "application/json",
      },
    };

    let reccs = await axios.get(
      "http://127.0.0.1:5000/api/v1/get_rec/" + userId,
      config
    );
    let parsed = JSON.parse(reccs.data.games.replaceAll("'", '"'));
    setRecommendedGames(parsed);
  };

  //////////////////////// PEERJS EVENT HANDLERS //////////////////////////////

  const requestScreenShare = (id) => {
    console.log("Requesting Screen Share");

    // Check if connection already exists
    if (connections.current.hasOwnProperty(id)) {
      console.log("already have connection to streamer, requesting directly");
      connections.current[id].send("rss, " + currUser);
    } else {
      // If connection doesnt already exist
      console.log("no connection yet, making one");
      let connection = null;
      connection = currPeer.current.connect(id);
      //setCurrConnections((prev) => ({ ...prev, [id]: connection }));
      connections.current[id] = connection;
      connection.on("open", () => connection.send("rss, " + currUser));
      setConnectionListeners(connection);
    }
  };

  // Forwards data to neighboring nodes
  const forwardQuery = (data) => {
    console.log("Forwarding to Neighbors");
    //console.log(currPeer.connections);
    Object.keys(connections.current).forEach((key) => {
      connections.current[key].send(data);
    });
  };

  // Starts Connection with Other Peer
  const handleConnection = (id) => {
    const connection = currPeer.current.connect(id);
    connections.current[id] = connection;
    //setCurrConnections((prev) => ({ ...prev, [id]: connection }));
    connection.on("open", () => connection.send("Hi, I am peer " + currUser));
    setConnectionListeners(connection);
  };

  // This is called when user inputs query and clicks button
  // Starts communication between nodes for finding stuff
  const handleQuery = (queryInput) => {
    console.log("sending query");
    let q_id = generateQueryId();
    let data = {
      qid: q_id,
      fileKeyword: queryInput,
      type: "query",
      asker: currUser,
    };

    previousQueries.add(data.qid);
    setQueryMap((prev) => ({
      ...prev,
      [q_id]: queryInput,
    }));
    forwardQuery(data);
  };

  ///////////////////////////////// PEER JS LISTENERS ////////////////////////////////

  const setPeerListeners = (peer) => {
    // Set Peer Listeners
    // Dependent State: currConnections, currCall
    peer.on("open", function (id) {
      console.log("My peer ID is: " + id);
    });

    peer.on("connection", function (conn) {
      //setCurrConnections((prev) => ({ ...prev, [conn.peer]: conn }));
      connections.current[conn.peer] = conn;
      console.log("Connected to " + conn.peer);
      setConnectionListeners(conn);
    });

    //Listen for incoming Video Stream
    peer.on("call", function (call) {
      console.log("Call Event Received");
      if (currCall.current === null) {
        console.log("setting currCall and answering");
        call.answer();
        currCall.current = call;
        setCallListeners(currCall.current);
        setCallActive(true);
      }
    });

    peer.on("error", function (err) {
      console.log("ERROR:");
      console.log(err);
    });
  };

  const setCallListeners = (currCall) => {
    // Set Call Listeners
    // Dependent State: videoRef, videoRef2
    console.log(currCall);
    currCall.on("stream", function (stream) {
      console.log("Stream Event Received");
      if (videoRef.current.srcObject === null) {
        console.log("Stream display not set, setting now!");
        videoRef2.current.srcObject = stream;
        setCallListenerToggle(!callListenerToggle);
      }
    });
  };

  const setConnectionListeners = (conn) => {
    // Set Call Listeners
    // Dependent State: activeGames, videoRef, currCall, role, currGame, currUser,
    conn.on("data", function (data) {
      // Handle File Found
      console.log(data);
      if (
        typeof data == typeof {} &&
        data.hasOwnProperty("type") &&
        data.type === "GameFound"
      ) {
        setActiveGames((prev) => ({
          ...prev,
          [data.qid]: data.peer,
        }));
        console.log("GAME FOUND");
      }

      //Handle Screen Share Request
      if (typeof data == typeof "") {
        let command = data.split(",");
        if (command[0] === "rss") {
          // Call a peer, providing our mediaStream
          if (!videoRef.current.srcObject) {
            console.log("not streaming anything, not gonna send video");
          }
          console.log(currCall.current);
          if (currCall.current === null && videoRef.current.srcObject) {
            console.log("starting call");
            console.log(command[1].substring(1));
            currCall.current = currPeer.current.call(
              command[1].substring(1),
              videoRef.current.srcObject
            );
            setCallListeners(currCall.current);
          }
        }
      }

      //Handle Input Control Request
      if (typeof data == typeof "") {
        let command = data.split(",");
        if (command[0] === "ku" || command[0] === "kd") {
          console.log("Input command receieved");
          if (
            command[1] === "w" ||
            command[1] === "a" ||
            command[1] === "s" ||
            command[1] === "d" ||
            command[1] === "c" ||
            command[1] === "v"
          ) {
            sendInput(command[0], command[1]);
          }
        }
      }

      //Handle Incoming Query Request
      if (
        typeof data == typeof {} &&
        data.hasOwnProperty("type") &&
        data.type === "query" &&
        !previousQueries.has(data.qid)
      ) {
        console.log("New Game Query Receieved");
        console.log(role);
        previousQueries.add(data.qid);
        console.log("seeing if game is being streamed");
        console.log(data.fileKeyword);
        console.log(currGame.current.textContent);
        console.log(typeof currGame.current.textContent);
        console.log(currGame.current.textContent === data.fileKeyword);

        if (currGame.current.textContent === data.fileKeyword) {
          console.log("Game Found!");

          let gameData = {
            qid: data.qid,
            type: "GameFound",
            peer: currUser,
            gameKeyword: data.fileKeyword,
          };

          // Create connection with asker and send to them
          if (connections.current.hasOwnProperty(data.asker)) {
            console.log("Asker already connected to, sending file");
            connections.current[data.asker].send(gameData);
          } else {
            console.log("Asker not connected to, starting connection");
            let connection = currPeer.current.connect(data.asker);
            connection.on("open", function () {
              console.log("Sending asker the file");
              connection.send(gameData);
            });
            setConnectionListeners(connection);
          }
        }

        // Forward Query to Neighbors
        forwardQuery(data);
      }
    });
  };

  /////////////////////////// REACT UI STUFF //////////////////////////////////
  return (
    <Box
      justifyContent="center"
      alignItems="center"
      style={{ marginLeft: "5%", marginRight: "5%" }}
    >
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Typography align="center" variant="h2">
            PeerGame
          </Typography>
        </Grid>
      </Grid>
      <p ref={currGame}>{currGameInput}</p>
      {!currUser && (
        <Grid container spacing={1}>
          <Grid item xs={6} justifyContent="center">
            <TextField
              label="Login"
              value={loginIdInput}
              onChange={(e) => {
                setLoginIdInput(e.target.value);
              }}
            ></TextField>
            <Button
              variant="contained"
              onClick={() => {
                setCurrUser(loginIdInput);
                getRecommendedGames(loginIdInput);
              }}
            >
              Login
            </Button>
          </Grid>
        </Grid>
      )}

      {currUser && (
        <Grid container spacing={1}>
          <Grid item xs={2}>
            <Typography variant="h5">Username: {currUser}</Typography>
          </Grid>

          {role === "Player" && (
            <>
              <Grid item xs={1}>
                <Button
                  variant="contained"
                  onClick={() => {
                    setRole("Streamer");
                  }}
                >
                  Stream
                </Button>
              </Grid>
              <Grid item xs={1}>
                <Button variant="contained" onClick={() => {}}>
                  Search
                </Button>
              </Grid>
            </>
          )}

          {role === "Streamer" && (
            <Grid item xs={1}>
              <Button variant="contained" onClick={() => setRole("Player")}>
                Play
              </Button>
            </Grid>
          )}

          <Grid item xs={1}>
            <Button variant="contained" onClick={() => setCurrUser(null)}>
              Log Out
            </Button>
          </Grid>

          <Grid item xs={6} justifyContent="center">
            <Typography>{currGameInput}</Typography>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={1}>
        <Grid item xs={4} justifyContent="center">
          <Typography>Connect to Peer</Typography>
          <TextField
            label="PeerId"
            value={peerIdInput}
            onChange={(e) => {
              setPeerIdInput(e.target.value);
            }}
          ></TextField>
          <Button
            variant="contained"
            onClick={() => {
              handleConnection(peerIdInput);
            }}
          >
            Connect
          </Button>
        </Grid>

        {false && (
          <Grid item xs={4} justifyContent="center">
            <Typography>Send Query</Typography>

            <TextField
              label="Query"
              value={queryInput}
              onChange={(e) => {
                setQueryInput(e.target.value);
              }}
            ></TextField>
            <Button
              variant="contained"
              onClick={() => {
                handleQuery(queryInput);
              }}
            >
              Query Image
            </Button>
          </Grid>
        )}

        {role === "Player" && (
          <>
            <Grid item xs={4} justifyContent="center">
              <Typography>Request Screen Share</Typography>
              <TextField
                label="PeerId"
                value={serverID}
                onChange={(e) => {
                  setServerIdInput(e.target.value);
                }}
              ></TextField>
              <Button
                variant="contained"
                onClick={() => {
                  requestScreenShare(serverID);
                }}
              >
                Request Game
              </Button>
            </Grid>

            <Grid item xs={4} justifyContent="center">
              <Typography>Send Query</Typography>

              <TextField
                label="Query"
                value={queryInput}
                onChange={(e) => {
                  setQueryInput(e.target.value);
                }}
              ></TextField>
              <Button
                variant="contained"
                onClick={() => {
                  handleQuery(queryInput);
                }}
              >
                Query Game
              </Button>
            </Grid>
          </>
        )}

        {role === "Streamer" && (
          <Grid item xs={4} justifyContent="center">
            <Typography>Name of Game</Typography>
            <TextField
              label="Game Name"
              value={currGameInput}
              onChange={(e) => {
                setCurrGameInput(e.target.value);
              }}
            ></TextField>
          </Grid>
        )}

        {role === "Player" && Object.keys(activeGames).length !== 0 && (
          <>
            <Grid item xs={12}>
              <Typography variant="h4">Active Games:</Typography>
            </Grid>
            {Object.keys(activeGames).map((qid, key) => {
              return (
                <Grid
                  item
                  key={key}
                  xs={2}
                  alignItems="center"
                  backgroundColor="lightgray"
                  border={10}
                  borderColor="gray"
                >
                  <Game name={queryMap[qid]} key={key}></Game>
                  <Button
                    variant="contained"
                    onClick={() => {
                      requestScreenShare(activeGames[qid]);
                    }}
                  >
                    Play
                  </Button>
                </Grid>
              );
            })}
          </>
        )}

        <video
          style={{ width: "80vw", height: "80vh" }}
          ref={videoRef2}
          autoPlay
        ></video>

        {role === "Player" && (
          <Grid item xs={12}>
            <Typography variant="h4">Your Recommended Games:</Typography>
          </Grid>
        )}

        {role === "Player" && recommendedGames && currUser ? (
          recommendedGames.map((name, key) => {
            return (
              <Grid
                item
                key={key}
                xs={2}
                alignItems="center"
                backgroundColor="lightgray"
                border={10}
                borderColor="gray"
              >
                <Game name={name} key={key}></Game>
              </Grid>
            );
          })
        ) : (
          <div />
        )}
      </Grid>
      {image !== null ? <img src={image.src} alt={"peer"} /> : <div />}
      <video ref={videoRef} autoPlay></video>
      <div />
    </Box>
  );
}

export default App;
