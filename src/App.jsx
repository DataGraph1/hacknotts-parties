import { mx_heighttonormal } from "three/tsl";
import Header from "./Header.jsx"
import Visualiser from "./IslandVisualisation.jsx"
import ScoreBar from "./ScoreBar.jsx"

export default function App() {
  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexFlow: "column",
    }}>
      <Header/>

      <div style={{
        flex: 2,
        minHeight: 0,
        overflow: "auto",
      }}>
        <Visualiser/>
      </div>

      <ScoreBar left={105} right={282}/>
    </div>
  );
}