import React from "react";

import { GamepadsProvider, GamepadsContext } from "react-gamepads";
import GameCursor from "./GameCursor";

export default function PlayerPeer() {
  return (
    <GamepadsProvider>
      <div className="App">
        <GameCursor />
        <GamepadsContext.Consumer>
          {({ gamepads }) => {
            // console.log(gamepads[0].buttons[3].pressed);
            const gamepadDisplay = Object.keys(gamepads).map((gamepadId) => {
              // console.log("displaying gamepad", gamepads[gamepadId]);
              return (
                <div>
                  <h2>{gamepads[gamepadId].id}</h2>
                  {gamepads[gamepadId].buttons &&
                    gamepads[gamepadId].buttons.map((button, index) => (
                      <div>
                        {index}: {button.pressed ? "True" : "False"}
                      </div>
                    ))}
                </div>
              );
            });
            return (
              <div>
                <h3>
                  Is the button pressed?:{" "}
                  {gamepads &&
                  gamepads.length > 0 &&
                  gamepads.buttons.length > 0 &&
                  gamepads[0].buttons[3].pressed
                    ? "True"
                    : "False"}
                </h3>
                <div className="Gamepads">
                  <h1>Gamepads</h1>
                  {gamepadDisplay}
                </div>
              </div>
            );
          }}
        </GamepadsContext.Consumer>
      </div>
    </GamepadsProvider>
  );
}
