import { useEffect, useReducer, useState } from "react";
import "./App.css";

const styles = {
  wrapper: {
    position: "relative",
    overflow: "hidden",
    height: "60px",
    width: "150px",
    backgroundColor: "#aaa",
    borderRadius: "5px",
    padding: "5px",
    display: "flex",
    justifyContent: "space-between",
    boxShadow: "inset 0 0 5px black",
  },
  container: {
    margin: "auto",
  },
  element: {
    backgroundColor: "white",
    margin: "5px 10px",
    padding: "5px",
    borderRadius: "5px",
    boxShadow: "0 0 3px black",
    cursor: "default",
    fontSize: "14px",
  },
  popper: {
    height: "50px",
    backgroundColor: "black",
    color: "white",
    borderRadius: "5px",
    padding: "5px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
};

import ElementPopper from "../../src/index";

function App() {
  const [val, forceUpdate] = useReducer((x) => x + 1, 0);
  const [isVisible, setIsVisible] = useState(false);
  const [portal, setPortal] = useState(false);

  function toggleVisible() {
    setIsVisible(!isVisible);
  }

  useEffect(() => {
    let interval = setInterval(() => {
      forceUpdate();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [portal]);

  console.log("App Render");

  return (
    <div>
      <button onClick={() => setPortal(!portal)}>Toggle Portal</button>
      <ElementPopper
        key={val}
        containerStyle={styles.container}
        element={
          <div
            style={styles.element}
            onMouseOver={toggleVisible}
            onMouseLeave={toggleVisible}
          >
            {portal ? "Portal" : "No Portal"}
          </div>
        }
        popper={
          isVisible && (
            <div style={styles.popper}> {portal ? "Portal" : "No Portal"}</div>
          )
        }
        portal={portal}
      />
    </div>
  );
}

export default App;
