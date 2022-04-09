import React from "react";
import axios from "axios";
import { Box, Typography } from "@mui/material";

const Game = (props) => {
  let png_image_src = "/" + props.name + ".png";
  let jpg_image_src = "/" + props.name + ".jpg";
  return (
    <Box>
      <Typography variant="h4" align="center">
        {props.name}
      </Typography>
      <img
        src={png_image_src}
        onError={({ currentTarget }) => {
          currentTarget.onerror = null; // prevents looping
          currentTarget.src = jpg_image_src;
        }}
        alt=""
        width="90%"
        height="360"
        style={{ paddingLeft: "3%" }}
      />
    </Box>
  );
};

export default Game;
