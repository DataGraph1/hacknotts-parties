import Header from "./components/Header.jsx"
import Visualiser from "./components/Visualiser.jsx"
import ScoreBar from "./components/ScoreBar.jsx"


export default function Frontend() {
    return (
        <div style={{
            height: "100vh",
            display: "flex",
            flexFlow: "column",
            }}>
            <Header/>
            

            <div style={{
                flex: 1,
                overflow: "auto",
            }}>
                <Visualiser/>
            </div>

            <ScoreBar left={105} right={282}/>
        </div>
    )
};