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
  let videoRef = useRef(null);
  let videoRef2 = useRef(null);
  let currCall = useRef(null);
  let storedFile = null;
  let previousQueries = new Set();
  const [currUser, setCurrUser] = useState("");
  const [recommendedGames, setRecommendedGames] = useState(null);
  const [peerIdInput, setPeerIdInput] = useState("");
  const [loginIdInput, setLoginIdInput] = useState("");
  const [currPeer, setCurrPeer] = useState(null);
  const [currConnections, setCurrConnections] = useState({});
  const [queryInput, setQueryInput] = useState("");
  const [image, setImage] = useState(null);
  const [serverID, setServerIdInput] = useState("");
  const [callActive, setCallActive] = useState(false);

  ///////////////////// REACT USE EFFECT HOOKS /////////////////////////////
  useEffect(() => {
    let newId = loginIdInput;
    console.log("Creating Peer with id: " + newId);
    const peer = new Peer(newId, {
      host: api_url,
      port: 9000,
      path: "peerjs/myapp",
    });

    peer.on("open", function (id) {
      console.log("My peer ID is: " + id);
    });

    setCurrPeer(peer);
  }, [currUser]);

  useEffect(() => {console.log(recommendedGames)}, [image, recommendedGames, callActive]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  useEffect(() => {
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keyup", handleKeyUp);
    };
  });

  //////////////////////// EVENT HANDLERS //////////////////////////////
  const onFileChange = (e) => {
    let file = e.target.files[0];
    let blob = new Blob(e.target.files, { type: file.type });
    const fileObj = {};
    fileObj[file.name] = file;
    fileObj["blob"] = blob;
    storedFile = fileObj;
    //setStoredFileObj(fileObj);
  };

  const handleKeyUp = (event) => {
    if (event.repeat) {
      return;
    }
    let newKeyInput = "ku," + event.key;
    if (currCall.current != null && currPeer != null) {
      console.log("sending keyup");
      let conn = currConnections[currCall.current.peer];
      conn.send(newKeyInput);
    }
  };

  const handleKeyDown = (event) => {
    if (event.repeat) {
      return;
    }
    let newKeyInput = "kd," + event.key;
    if (currCall.current != null && currPeer != null) {
      console.log("sending keydown");
      let conn = currConnections[currCall.current.peer];
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

  const requestScreenShare = (id) => {
    //get connection from id
    let conn = currConnections[id];
    //console.log(conn);
    conn.send("rss," + currUser);
  };

  const handleConnection = (id) => {
    const connection = currPeer.connect(id);
    let newCurrConnections = currConnections;
    newCurrConnections[id] = connection;
    setCurrConnections(newCurrConnections);
    connection.on("open", () => connection.send("Hi, I am peer " + currUser));
  };

  // forwards data to neighboring nodes
  const forwardQuery = (data) => {
    console.log("Forwarding to Neighbors");
    Object.keys(currConnections).forEach((key) => {
      currConnections[key].send(data);
    });
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

  // This is called when user inputs query and clicks button
  // Starts communication between nodes for finding stuff
  const handleQuery = (queryInput) => {
    let data = {
      qid: generateQueryId(),
      fileKeyword: queryInput,
      type: "query",
      asker: currUser,
    };

    previousQueries.add(data.qid);
    forwardQuery(data);
  };

  ///////////////////////////////// PEER JS LISTENERS ////////////////////////////////
  // Listen for new incoming connections
  if (currPeer != null) {
    // On new connection, add connection to ledger
    currPeer.on("connection", function (conn) {
      let newCurrConnections = currConnections;
      newCurrConnections[conn.peer] = conn;
      setCurrConnections(newCurrConnections);
      console.log("Connected to " + conn.peer);
    });
  }

  //Listen for incoming Video Stream
  if (currPeer != null) {
    currPeer.on("call", function (call) {
      //console.log("Call Event Received");
      if (currCall.current === null) {
        console.log("setting currCall and answering");
        call.answer();
        currCall.current = call;
        setCallActive(true);
      }
    });
  }

  if (callActive) {
    currCall.current.on("stream", function (stream) {
      // `stream` is the MediaStream of the remote peer.
      // Here you'd add it to an HTML video/canvas element.
      console.log("Stream Event Received");
      if (videoRef.current.srcObject === null) {
        console.log("Stream display not set, setting now!");
        videoRef2.current.srcObject = stream;
      }
    });
  }

  // Listen for Incoming Data on all Connections
  if (currPeer != null) {
    currPeer.on("connection", function (conn) {
      conn.on("data", function (data) {
        // Handle File Found
        console.log(data);
        if (
          typeof data == typeof {} &&
          data.hasOwnProperty("type") &&
          data.type === "FileFound"
        ) {
          const bytes = new Uint8Array(data.blob);
          const img = document.createElement("img");
          img.src = "data:image/png;base64," + encode(bytes);
          setImage(img);
          conn.close();
        }

        //Handle Screen Share Request
        if (typeof data == typeof "") {
          let command = data.split(",");
          if (command[0] === "rss") {
            // Call a peer, providing our mediaStream
            if (!videoRef.current.srcObject) {
              console.log("not streaming anything, not gonna send video");
            }
            if (currCall.current === null && videoRef.current.srcObject) {
              console.log("starting call");
              currCall.current = currPeer.call(
                command[1],
                videoRef.current.srcObject
              );
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
          //console.log("New File Query Receieved");
          //console.log(data);
          previousQueries.add(data.qid);

          // Check if file exists on client
          //console.log("seeing if queried file exists on client");

          if (storedFile != null) {
            Object.keys(storedFile).forEach((key) => {
              // Handle if File is Found
              if (storedFile[key].name.includes(data.fileKeyword)) {
                //console.log("File Found!");

                let fileData = {
                  qid: data.qid,
                  type: "FileFound",
                  file: storedFile[key],
                  peer: currUser,
                  fileKeyword: data.fileKeyword,
                  blob: storedFile["blob"],
                };

                // Create connection with asker and send to them
                let connection = currPeer.connect(data.asker);
                connection.on("open", function () {
                  console.log("Sending asker the file");
                  connection.send(fileData);
                });
              }
            });
          }

          // Forward Query to Neighbors
          forwardQuery(data);
        }
      });
    });
  }

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

      {!currUser && (
        <Grid container spacing={1}>
          <Grid item xs={12} justifyContent="center">
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
            <Grid item xs={1}>
              <Button
                variant="contained"
                onClick={async () => {
                  setRole("Streamer");
                  videoRef.current.srcObject =
                    await navigator.mediaDevices.getDisplayMedia();
                }}
              >
                Stream
              </Button>
            </Grid>
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
          <Grid item xs={1}>
            <Button variant="contained" onClick={() => {}}>
              Search
            </Button>
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

        <Grid item xs={6} justifyContent="center">
          <Button variant="contained" component="label">
            Upload File
            <input type="file" onChange={onFileChange} hidden />
          </Button>
        </Grid>

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
        
        {videoRef2.current && videoRef2.current.srcObject && <video style={{ width: "80vw", height: "80vh" }} ref={videoRef2} autoPlay></video>}
        

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
      {image !== null ? (
        <img src={image.src} alt={"peer"} style={{ maxWidth: 800 }} />
      ) : (
        <div />
      )}
      <video
        style={{ width: "80vw", height: "80vh" }}
        ref={videoRef}
        autoPlay
      ></video>
      <div />
    </Box>
  );
}

export default App;
