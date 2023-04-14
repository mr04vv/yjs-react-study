import "./App.css";
import "@tldraw/tldraw/editor.css";
import "@tldraw/tldraw/ui.css";
import { ComponentProps, useEffect, useRef, useState } from "react";
import { track } from "signia-react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { type Awareness } from "y-protocols/awareness";

import { Cursor } from "./Cursor";

const myDoc = new Y.Doc();
const wsProvider = new WebsocketProvider(
  "ws://localhost:1234",
  "my-roomname",
  myDoc
);
const awareness = wsProvider.awareness;
const canvasObject: { type: any; points: any[] } = {
  type: null,
  points: [],
};
const random = (arr: string[]): string => {
  return arr[Math.floor(Math.random() * arr.length)];
};

export const USER_COLORS = [
  "#1a1c2c",
  "#E57373",
  "#9575CD",
  "#4FC3F7",
  "#81C784",
  "#144cb5",
  "#FF8A65",
  "#F06292",
  "#7986CB",
];

export const USER_NAMES = [
  "Kinop",
  "maruchan",
  "Gump",
  "Xiaomin",
  "asakaida",
  "shigemitsu",
  "moriyaman",
  "kumichan",
  "uyauya",
];

const canvasYmap = myDoc.getMap("canvasMapName");
const undoManager = new Y.UndoManager(canvasYmap);
const name = random(USER_NAMES);
const color = random(USER_COLORS);

console.debug(awareness.getLocalState(), "initialized");
awareness.setLocalStateField("user", {
  name,
  color,
});
const App = track(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  wsProvider.on("status", console.warn);
  wsProvider.on("sync", console.warn);
  const [message, setMessage] = useState<string>("");
  const [lastMapKey, setLastMapKey] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.document.addEventListener("keypress", (e: KeyboardEvent) => {
      console.debug(e.key, isTyping);
      if (isTyping) {
        if (e.key === "Enter") {
          setIsTyping(false);
        } else {
          // console.debug("hotehote");
        }
      }
      if (e.key === "/") {
        // console.debug("hogehoge", "gf");

        setIsTyping(true);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    });

    return () => {
      window.document.addEventListener("keypress", (e: KeyboardEvent) => {
        console.debug(e.key, isTyping);
        if (isTyping) {
          if (e.key === "Enter") {
            setIsTyping(false);
          } else {
            // console.debug("hotehote");
          }
        }
        if (e.key === "/") {
          // console.debug("hogehoge", "gf");

          setIsTyping(true);
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }
      });
    };
  }, [isTyping]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const canvasWidth = canvas.clientWidth * window.devicePixelRatio;
      const canvasHeight = canvas.clientHeight * window.devicePixelRatio;
      if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
      }
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        canvas.addEventListener("mousedown", handleMousedownOnCanvas, false);
        canvas.addEventListener("mouseup", handleMouseupOnCanvas, false);
        canvas.addEventListener("mousemove", handleMousemoveOnCanvas, false);
      }
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener("mousedown", handleMousedownOnCanvas, false);
        canvas.removeEventListener("mouseup", handleMouseupOnCanvas, false);
        canvas.removeEventListener("mousemove", handleMousemoveOnCanvas, false);
      }
    };
  });

  useEffect(() => {
    canvasYmap.observe((event) => {
      console.debug(event);

      event.changes.keys.forEach((change, key) => {
        const nam = canvasYmap.get(key)["name"];

        if (nam !== name) {
          if (change.action === "add") {
            const object = canvasYmap.get(key)["canvasObject"];

            if (object.type === "line") {
              const points = object.points;
              drawLine(points);
            }
          } else if (change.action === "update") {
            const object = canvasYmap.get(key)["canvasObject"];
            if (object.type === "line") {
              const points = object.points;
              drawLine(points);
            }
            // updateの場合の処理をここに追加できます
          } else if (change.action === "delete") {
            console.debug(change);
            // deleteの場合の処理をここに追加できます
          }
        }
      });
    });
  }, []);

  useEffect(() => {
    if (typeof document.hidden !== "undefined") {
      window.document.addEventListener(
        "visibilitychange",
        () => {
          if (window.document.visibilityState === "hidden") {
            awareness.setLocalState(null);
          } else {
            awareness.setLocalState({
              user: {
                name,
                color,
              },
            });
          }
        },
        false
      );
    }
  }, []);

  useEffect(() => {
    const handleChangeOnAwareness = (changes) => {
      // stateRef.current = new Map(awareness.getStates());
      setRef(new Map(awareness.getStates()));
      // awareness.setLocalStateField("cursor", {
      //   x: e.clientX,
      //   y: e.clientY,
      // });
      // console.log(Array.from(awareness.getStates().values()));
    };
    awareness.on("change", handleChangeOnAwareness);
  }, []);

  const handleMousedownOnCanvas = (event) => {
    canvasObject.type = "line";
    canvasObject.points = [[event.offsetX, event.offsetY]];

    setIsDrawing(true);
  };

  const handleMouseupOnCanvas = (event) => {
    const uniqueId = Math.random().toString();
    setLastMapKey(uniqueId);
    canvasYmap.set(uniqueId, { canvasObject, name: name });
    if (isDrawing) {
      setIsDrawing(false);
    }
  };

  const handleMousemoveOnCanvas = (event) => {
    if (isDrawing) {
      canvasObject.points.push([event.offsetX, event.offsetY]);

      drawLineSegment();
    }
  };

  const drawLine = (points) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 1;
      ctx.lineJoin = "round";

      ctx.moveTo(
        points[0][0] * window.devicePixelRatio,
        points[0][1] * window.devicePixelRatio
      );
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(
          points[i][0] * window.devicePixelRatio,
          points[i][1] * window.devicePixelRatio
        );
      }

      ctx.stroke();
    }
  };

  const drawLineSegment = () => {
    if (canvasObject.type === "line") {
      const p0 = canvasObject.points[canvasObject.points.length - 2];
      const p1 = canvasObject.points[canvasObject.points.length - 1];
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.strokeStyle = "red";
        ctx.lineWidth = 10;
        ctx.lineJoin = "round";
        ctx.moveTo(
          p0[0] * window.devicePixelRatio,
          p0[1] * window.devicePixelRatio
        );
        ctx.lineTo(
          p1[0] * window.devicePixelRatio,
          p1[1] * window.devicePixelRatio
        );
        ctx.closePath();
        ctx.stroke();
      }
    }
  };

  const [stateRef, setRef] = useState<ReturnType<Awareness["getStates"]>>();
  // All changes are also applied to the other document
  return (
    <div
      className="App"
      style={{ height: "100vh" }}
      onMouseMove={(event) => {
        awareness.setLocalStateField("cursor", {
          x: event.clientX,
          y: event.clientY,
        });
      }}
    >
      {/* {console.debug(map.toArray())} */}
      <button
        style={{ position: "absolute", zIndex: 3000 }}
        onClick={() => {
          undoManager.undo();
          console.debug(awareness.getLocalState());
          if (awareness.getLocalState() !== null) {
            console.debug("hogehoge", "hogehoge");

            awareness.setLocalState(null);
          } else {
            console.debug("hogehoge");
            awareness.setLocalState({
              user: {
                name,
                color,
              },
            });
            awareness.setLocalStateField("user", {
              name,
              color,
            });
          }
        }}
      >
        undo
      </button>
      {isTyping && (
        <div
          style={{
            zIndex: 400,
            position: "absolute",
            pointerEvents: "none",
            userSelect: "none",
            left: 0,
            top: 0,
            transition: "transform 0.5s cubic-bezier(.17,.93,.38,1)",
            transform: `translateX(${
              awareness.getLocalState()?.cursor?.x ?? 0
            }px) translateY(${awareness.getLocalState()?.cursor?.y ?? 0}px)`,
          }}
        >
          <div
            style={{
              backgroundColor: color,
              borderRadius: 4,
              margin: "40px 10px",
              // position: "absolute",
              // top: 20,
              // left: 10,
              padding: "5px 4px",
              position: "relative",
              display: "inline-block",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              style={{
                margin: 0,
                fontSize: 13,
                color: "white",
                height: "14px",
                minWidth: "20px",
                background: "transparent",
                border: "none",
                outline: "none",
              }}
              value={message}
              onChange={(e) => {
                console.debug(e.target.value);
                setMessage(e.target.value);
                console.debug("hogehoge");
                awareness.setLocalStateField("message", {
                  message: e.target.value,
                });
              }}
            />
          </div>
        </div>
      )}

      {stateRef &&
        Array.from(stateRef.entries()).map(([key, value]) => {
          console.debug(value.message?.message);
          if (key === awareness.clientID) return null;
          if (!value.cursor || !value.user.color || !value.user.name)
            return null;

          return (
            <Cursor
              key={key}
              cursor={value.cursor as ComponentProps<typeof Cursor>["cursor"]}
              color={value.user.color as ComponentProps<typeof Cursor>["color"]}
              name={value.user.name as ComponentProps<typeof Cursor>["name"]}
              message={value.message?.message ?? ""}
            />
          );
        })}
      <canvas ref={canvasRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
});

export default App;

// awareness.setLocalStateField("user", {
//   name,
//   color,
// });
