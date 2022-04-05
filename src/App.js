import "./App.css";
import Peer from "peerjs-client";
import React, { useEffect, useRef, useState, createRef } from "react";
import { Box, TextField, Button, Typography, Grid } from "@mui/material";
import { generateQueryId, encode } from "./utils/utils";
import { useDisplay } from "./utils/useDisplay";
import axios from "axios";

function App() {
  /////////////////////// STATEFUL & CLIENT DATA //////////////////////
  let videoRef = createRef();
  let videoRef2 = useRef(null);
  const [video] = useDisplay(videoRef);
  let storedFile = null;
  let previousQueries = new Set();
  const [currUser, setCurrUser] = useState("");
  const [currCall, setCurrCall] = useState(null);
  const [peerIdInput, setPeerIdInput] = useState("");
  const [loginIdInput, setLoginIdInput] = useState("");
  const [currPeer, setCurrPeer] = useState(null);
  const [currConnections, setCurrConnections] = useState({});
  const [queryInput, setQueryInput] = useState("");
  const [image, setImage] = useState(null);
  const [serverID, setServerIdInput] = useState("");

  ///////////////////// REACT USE EFFECT HOOKS /////////////////////////////
  useEffect(() => {
    let newId = loginIdInput;
    console.log("Creating Peer with id: " + newId);
    const peer = new Peer(newId, {
      host: "10.2.18.47",
      port: 9000,
      path: "peerjs/myapp",
    });

    peer.on("open", function (id) {
      console.log("My peer ID is: " + id);
    });

    setCurrPeer(peer);
  }, [currUser, loginIdInput]);

  useEffect(() => {}, [image]);

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

  useEffect(() => {
    if (currCall != null) {
      currCall.answer();
    }
  }, [currCall]);

  //////////////////////// EVENT HANDLERS //////////////////////////////
  const onFileChange = (e) => {
    let file = e.target.files[0];
    let blob = new Blob(e.target.files, { type: file.type });
    const fileObj = {};
    fileObj[file.name] = file;
    fileObj["blob"] = blob;
    //console.log(fileObj);
    storedFile = fileObj;
    //setStoredFileObj(fileObj);
  };

  const handleKeyUp = (event) => {
    if (event.repeat) {
      return;
    }
    let newKeyInput = "ku," + event.key;
    if (currCall != null && currPeer != null) {
      let conn = currConnections[currCall.peer];
      conn.send(newKeyInput);
    }
  };

  const handleKeyDown = (event) => {
    if (event.repeat) {
      return;
    }
    let newKeyInput = "kd," + event.key;
    if (currCall != null && currPeer != null) {
      let conn = currConnections[currCall.peer];
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

    axios.post("http://127.0.0.1:5000/input", data, config);
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
      setCurrCall(call);
    });
  }

  if (currCall != null) {
    currCall.on("stream", function (stream) {
      // `stream` is the MediaStream of the remote peer.
      // Here you'd add it to an HTML video/canvas element.
      //console.log("Stream Event Received");
      videoRef2.current.srcObject = stream;
    });
  }

  // Listen for Incoming Data on all Connections
  if (currPeer != null) {
    currPeer.on("connection", function (conn) {
      conn.on("data", function (data) {
        // Handle File Found
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
            currPeer.call(command[1], video.srcObject);
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
              command[1] === "d"
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
      <Grid container spacing={1} alignItems="center">
        <Grid item xs={12}>
          <Typography align="center" variant="h2">
            PeerGame
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Typography align="center" variant="h5">
            Username: {currUser}
          </Typography>
        </Grid>

        <Grid item xs={4} justifyContent="center">
          <Typography>Login</Typography>
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
            }}
          >
            Login
          </Button>
        </Grid>

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
      </Grid>

      {image !== null ? (
        <img src={image.src} alt={"peer"} style={{ maxWidth: 800 }} />
      ) : (
        <div />
      )}

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

      <video ref={videoRef} autoPlay></video>

      <video ref={videoRef2} autoPlay></video>
      <div />
    </Box>
  );
}

export default App;
