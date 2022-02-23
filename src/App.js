import logo from "./logo.svg";
import "./App.css";
import Peer from "peerjs-client";
import Header from "./components/Header";
import React, { useEffect, useState, createRef } from "react";
import { Box, TextField, Button, Typography, Grid } from "@mui/material";
import { generateQueryId, encode } from "./utils/utils";
import { useGamepads } from "react-gamepads";
import PlayerPeer from "./components/PlayerPeer";
import { useDisplay } from "./utils/useDisplay";

function App() {
  /////////////////////// STATEFUL & CLIENT DATA //////////////////////
  let videoRef = createRef();
  const [video, isCameraInitialised, running, setPlaying, error] =
    useDisplay(videoRef);
  let storedFile = null;
  let previousQueries = new Set();
  const [currUser, setCurrUser] = useState("");
  const [peerIdInput, setPeerIdInput] = useState("");
  const [loginIdInput, setLoginIdInput] = useState("");
  const [currPeer, setCurrPeer] = useState(null);
  const [currConnections, setCurrConnections] = useState({});
  const [storedFileObj, setStoredFileObj] = useState(null);
  const [queryInput, setQueryInput] = useState("");
  const [returnData, setReturnData] = useState(null);
  const [image, setImage] = useState(null);

  var displayMediaOptions = {
    video: {
      cursor: "always",
    },
    audio: true,
  };

  ///////////////////// REACT USE EFFECT HOOKS /////////////////////////////
  useEffect(() => {
    let newId = loginIdInput;
    console.log("Creating Peer with id: " + newId);
    const peer = new Peer(newId, {
      host: "localhost",
      port: 9000,
      path: "peerjs/myapp",
    });

    peer.on("open", function (id) {
      console.log("My peer ID is: " + id);
    });

    setCurrPeer(peer);
  }, [currUser]);

  useEffect(() => {}, [image]);

  //////////////////////// EVENT HANDLERS //////////////////////////////
  const onFileChange = (e) => {
    let file = e.target.files[0];
    let blob = new Blob(e.target.files, { type: file.type });
    const fileObj = {};
    fileObj[file.name] = file;
    fileObj["blob"] = blob;
    console.log(fileObj);
    storedFile = fileObj;
    //setStoredFileObj(fileObj);
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

  async function startCapture() {
    try {
      videoRef.srcObject = await navigator.mediaDevices.getDisplayMedia(
        displayMediaOptions
      );

      dumpOptionsInfo();
    } catch (err) {
      console.error("Error: " + err);
    }
  }

  function stopCapture(evt) {
    let tracks = videoRef.srcObject.getTracks();

    tracks.forEach((track) => track.stop());
    videoRef.srcObject = null;
  }

  function dumpOptionsInfo() {
    const videoTrack = videoRef.srcObject.getVideoTracks()[0];

    console.info("Track settings:");
    console.info(JSON.stringify(videoTrack.getSettings(), null, 2));
    console.info("Track constraints:");
    console.info(JSON.stringify(videoTrack.getConstraints(), null, 2));
  }

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

  // Listen for Incoming Data on all Connections
  if (currPeer != null) {
    currPeer.on("connection", function (conn) {
      conn.on("data", function (data) {
        console.log("data received");

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

        //Handle Incoming Query Request
        if (
          typeof data == typeof {} &&
          data.hasOwnProperty("type") &&
          data.type == "query" &&
          !previousQueries.has(data.qid)
        ) {
          console.log("New File Query Receieved");
          console.log(data);
          previousQueries.add(data.qid);

          // Check if file exists on client
          console.log("seeing if queried file exists on client");

          if (storedFile != null) {
            Object.keys(storedFile).forEach((key) => {
              // Handle if File is Found
              if (storedFile[key].name.includes(data.fileKeyword)) {
                console.log("File Found!");

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
        <img src={image.src} style={{ maxWidth: 800 }} />
      ) : (
        <div />
      )}

      <Button onClick={startCapture}>Start Capture</Button>

      <Button onClick={stopCapture}>Stop Capture</Button>

      <video ref={videoRef} autoPlay></video>

      <PlayerPeer />
      <div />
    </Box>
  );
}

export default App;
