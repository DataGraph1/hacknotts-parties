import Header from "./components/Header.jsx"
import Subheader from "./components/Subtitle_backend.jsx"
import ScoreEntry from "./components/ScoreEntry.jsx"
import ColumnGroupingTable from "./components/Table.jsx"
import ScoreBar from "./components/ScoreBar.jsx"


export default function Backend() {
    return(
        <div style={{
            height: "100vh",
            display: "flex",
            flexFlow: "column",
        }}>
            <Header/>
            <Subheader/>

            <div style={{
                flex: 1,
                overflow: "auto",
                padding: 50,
                display: "flex",
                flexFlow: "row",
            }}>
                <ScoreEntry/>
                <ColumnGroupingTable/>
            </div>

            <ScoreBar left={105} right={282}/>
        </div>
    )
}