import Header from "./components/Header.jsx"
import Visualiser from "./components/Visualiser.jsx"
import ScoreBar from "./components/ScoreBar.jsx"
import { useState } from "react";
import './Viewer.css'


export default function Viewer() {
    const [leftPoints, setLeftPoints] = useState(0);
    const [rightPoints, setRightPoints] = useState(0);
    let islands = [];

    function httpGetAsync(theUrl, callback) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function() { 
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
                callback(xmlHttp.responseText);
        }
        xmlHttp.open("GET", theUrl, true); // true for asynchronous 
        xmlHttp.send(null);
    }

    function set_points_left(value) {
        // console.log("LEFT: ", value)
        setLeftPoints(parseInt(value))
    }
    function set_points_right(value) {
        // console.log("RIGHT: ", value)
        setRightPoints(parseInt(value))
    }
    function update_islands(value) {
        value = JSON.parse(value)
        islands = value
    }

    setInterval(PointUpdater, 2000);
    function PointUpdater() {
        httpGetAsync("http://localhost:8000/get_sum_points?name=PS2",   set_points_left)
        httpGetAsync("http://localhost:8000/get_sum_points?name=Xbox",  set_points_right)
        httpGetAsync("http://localhost:8000/get_islands",   update_islands)
    }


    return (
        <div className="bg" style={{
            height: "100vh",
            display: "flex",
            flexFlow: "column",
            }}>
            <div className="bggrid"/>

            <Header/>
            
            <div style={{
                flex: 1,
                overflow: "auto",
            }}>
                <Visualiser val={islands}/>
            </div>

            <ScoreBar left={leftPoints} right={rightPoints}/>
        </div>
    )
};