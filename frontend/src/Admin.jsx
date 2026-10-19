import Header from "./components/Header.jsx"
import Subheader from "./components/Subtitle_backend.jsx"
import ScoreEntry from "./components/ScoreEntry.jsx"
import ColumnGroupingTable from "./components/Table.jsx"
import ScoreBar from "./components/ScoreBar.jsx"
import { useState, useEffect, useRef } from "react";

const API_URL = "http://localhost:8000";


export default function Admin() {
    const [leftPoints, setLeftPoints] = useState(0);
    const [rightPoints, setRightPoints] = useState(0);
    const [listening, setListening] = useState(false);
    const eventSourceRef = useRef(null);
    
    useEffect(() => {
        startListening();

        return () => {
            eventSourceRef.current?.close();
            eventSourceRef.current = null;
        };
    }, []);

    useEffect(() => {
        httpGetAsync(
            "http://localhost:8000/get_sum_points",
            add_points_load
        );
    }, [])

    function add_points_load(data) {
        data = JSON.parse(data);
        console.log(data);

        set_points_right(data["Xbox"]);
        set_points_left(data["PS2"]);
    }

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

    function announcementHandler(announcement) {
        console.log(announcement);

        switch (announcement.event) {
            case "point.change":
                set_points_right(announcement.data["Xbox"]);
                set_points_left(announcement.data["PS2"]);
                return;
        }
    }

    function startListening() {
        if (eventSourceRef.current) return;
    
        const source = new EventSource(`${API_URL}/events`);
        eventSourceRef.current = source;
        
        console.log("Attempting to connect")
        source.addEventListener("connected", () => {
          setListening(true);
          console.log("Connected to backend webhook")
        });
        console.log("Connected?")
    
        source.onmessage = (item) => {
          const announcement = JSON.parse(item.data);
          announcementHandler(announcement);
        };
    
        source.onerror = () => {
          // EventSource automatically retries most failed connections.
          setListening(false);
        };
    }

    return(
        <div style={{
            height: "100vh",
            display: "flex",
            flexFlow: "column",
        }}>
            <Header isConnected={listening}/>
            <Subheader/>

            <div style={{
                flex: 1,
                overflow: "auto",
                padding: 50,
                display: "flex",
                flexFlow: "row",
            }}>
                <ScoreEntry/>
                {/* <ColumnGroupingTable/> */}
            </div>
            
            <ScoreBar left={leftPoints} right={rightPoints}/>
        </div>
    )
}