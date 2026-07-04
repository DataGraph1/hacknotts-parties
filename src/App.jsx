import Header from "./Header.jsx"
import Visualiser from "./IslandVisualisation.jsx"
import ScoreBar from "./ScoreBar.jsx"

export default function App() {
  return (
    <div>
      <Header/>
      <Visualiser/>
      <ScoreBar left={105} right={282}/>
    </div>
  );
}