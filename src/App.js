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
  let connections = useRef({});
  let videoRef = useRef(null);
  let videoRef2 = useRef(null);
  let currCall = useRef(null);
  let currGame = useRef(null);
  let previousQueriesRef = useRef(new Set());
  let currPeer = useRef(null);
  let activeGamesRef = useRef({});

  const [role, setRole] = useState("Player");
  const [currUser, setCurrUser] = useState("");
  const [recommendedGames, setRecommendedGames] = useState(null);
  const [currGameInput, setCurrGameInput] = useState("");
  const [peerIdInput, setPeerIdInput] = useState("");
  const [loginIdInput, setLoginIdInput] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [serverID, setServerIdInput] = useState("");
  const [renderTrigger, setRenderTrigger] = useState(false);
  const [callListenerToggle, setCallListenerToggle] = useState(false);

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
      videoRef.current.srcObject =
        await navigator.mediaDevices.getDisplayMedia();
    }
  }, [role]);

  useEffect(() => {}, [recommendedGames, serverID]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  }, []);

  //////////////////////// NON-PEERJS EVENT HANDLERS //////////////////////////////

  const handleKeyUp = (event) => {
    if (event.repeat) {
      return;
    }
    //console.log(event);
    let newKeyInput = "ku," + event.key;
    //console.log(currPeer.current);
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
      console.log(id);
      connection = currPeer.current.connect(id);
      connections.current[id] = connection;
      connection.on("open", () => connection.send("rss, " + currUser));
      setConnectionListeners(connection);
    }
  };

  // Forwards data to neighboring nodes
  const forwardQuery = (data) => {
    console.log("Forwarding to Neighbors");
    console.log(connections.current);
    Object.keys(connections.current).forEach((key) => {
      connections.current[key].send(data);
    });
  };

  // Starts Connection with Other Peer
  const handleConnection = (id) => {
    const connection = currPeer.current.connect(id);
    connections.current[id] = connection;
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
      gameKeyword: queryInput,
      type: "query",
      asker: currUser,
    };

    previousQueriesRef.current.add(data.qid);

    forwardQuery(data);
  };

  ///////////////////////////////// PEER JS LISTENERS ////////////////////////////////

  const setPeerListeners = (peer) => {
    peer.on("open", function (id) {
      console.log("My peer ID is: " + id);
    });

    peer.on("connection", function (conn) {
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
      }
    });

    peer.on("error", function (err) {
      console.log("ERROR:");
      console.log(err);
    });
  };

  const setCallListeners = (currCall) => {
    // Set Call Listeners
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
    // Set Connection Listeners
    conn.on("data", function (data) {
      console.log(data);
      if (
        typeof data == typeof {} &&
        data.hasOwnProperty("type") &&
        data.type === "GameFound"
      ) {
        activeGamesRef.current[data.peer] = data.gameKeyword;
        setRenderTrigger(!renderTrigger);
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
        !previousQueriesRef.current.has(data.qid)
      ) {
        console.log("New Game Query Receieved");
        previousQueriesRef.current.add(data.qid);
        console.log("seeing if game is being streamed");
        if (
          currGame.current.textContent === data.gameKeyword ||
          data.gameKeyword === "!!!"
        ) {
          console.log("Game Found!");

          let gameData = {
            qid: data.qid,
            type: "GameFound",
            peer: currUser,
            gameKeyword: data.gameKeyword,
          };

          if (data.gameKeyword === "!!!") {
            gameData.gameKeyword = currGame.current.textContent;
          }

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
        <Grid item xs={12} style={{ marginBottom: 20 }}>
          <Typography align="center" variant="h2">
            PeerGame
          </Typography>
        </Grid>
      </Grid>
      <p hidden ref={currGame}>
        {currGameInput}
      </p>
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
          <Grid item xs={3}>
            <Typography variant="h5">Username: {currUser}</Typography>
          </Grid>

          {role === "Player" && (
            <>
              <Grid item xs={2}>
                <Button
                  variant="contained"
                  onClick={() => {
                    setRole("Streamer");
                  }}
                >
                  Stream
                </Button>
              </Grid>
              <Grid item xs={2}>
                <Button variant="contained" onClick={() => {}}>
                  Search
                </Button>
              </Grid>
            </>
          )}

          {role === "Streamer" && (
            <Grid item xs={2}>
              <Button variant="contained" onClick={() => setRole("Player")}>
                Play
              </Button>
            </Grid>
          )}

          <Grid item xs={2}>
            <Button variant="contained" onClick={() => setCurrUser(null)}>
              Log Out
            </Button>
          </Grid>

          <Grid item xs={2}>
            <Button variant="contained" onClick={() => handleQuery("!!!")}>
              Deep Search
            </Button>
          </Grid>
        </Grid>
      )}

      {currUser && (
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

              <Grid item xs={2} justifyContent="center">
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

              <Grid
                item
                xs={2}
                justifyContent="center"
                style={{ marginTop: 30 }}
              >
                <Button
                  variant="contained"
                  onClick={() => {
                    setRenderTrigger(!renderTrigger);
                  }}
                >
                  Refresh
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

          {role === "Player" &&
            Object.keys(activeGamesRef.current).length !== 0 && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h4">Active Games:</Typography>
                </Grid>
                {Object.keys(activeGamesRef.current).map((peer, key) => {
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
                      <Game
                        name={activeGamesRef.current[peer]}
                        key={key}
                      ></Game>
                      <Button
                        variant="contained"
                        onClick={() => {
                          requestScreenShare(peer);
                        }}
                      >
                        Play
                      </Button>
                    </Grid>
                  );
                })}
              </>
            )}

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

          <video
            style={{ width: "80vw", height: "80vh" }}
            ref={videoRef2}
            autoPlay
          ></video>
        </Grid>
      )}
      <video ref={videoRef} autoPlay></video>
      <div />
    </Box>
  );
}

export default App;
