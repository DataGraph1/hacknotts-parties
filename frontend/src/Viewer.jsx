import Header from "./components/Header.jsx"
import Visualiser from "./components/Visualiser.jsx"
import ScoreBar from "./components/ScoreBar.jsx"
import { useState, useEffect, useRef } from "react";
import './Viewer.css'

const API_URL = "http://localhost:8000";


export default function Viewer() {
    const [leftPoints, setLeftPoints] = useState(0);
    const [rightPoints, setRightPoints] = useState(0);
    const [listening, setListening] = useState(false);
    const eventSourceRef = useRef(null);
    const [islands, updateIslands] = useState([]);

    const addIsland = (teamNum, tilemapPos) => {
        console.log("Added island: " + teamNum);

        updateIslands((prev) => [
        ...prev,
        {
            id: crypto.randomUUID(),
            teamNum: teamNum,
            position: [
            tilemapPos[0],
            1,
            tilemapPos[1]
            ],
        },
        ]);
    };
    const clearIslands = () => {
        updateIslands([]);
    };

    useEffect(() => {
        startListening();

        return () => {
            eventSourceRef.current?.close();
            eventSourceRef.current = null;
        };
    }, []);

    useEffect(() => {
        httpGetAsync(
            "http://localhost:8000/get_islands",
            add_islands_load
        );

        httpGetAsync(
            "http://localhost:8000/get_sum_points",
            add_points_load
        );
    }, [])

    function add_islands_load(data) {
        data = JSON.parse(data);
        const teamNames = ["PS2", "Xbox"];

        for (const name of teamNames) {
            for (const pos of data[name] ?? []) {
                addIsland(teamNames.indexOf(name), pos);
            }
        }
    }
    function add_points_load(data) {
        data = JSON.parse(data);
        console.log(data);

        set_points_right(data["Xbox"]);
        set_points_left(data["PS2"]);
    }


    function announcementHandler(announcement) {
        console.log(announcement);

        switch (announcement.event) {
            case "island.new":
                let teamNum = 0
                if (announcement.data.team == "Xbox") {
                    teamNum = 1
                }

                addIsland(
                    teamNum,
                    [announcement.data.x, announcement.data.y]
                );
                return;

            case "island.clear":
                clearIslands();
                return;

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
    
    function stopListening() {
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
        setListening(false);
      }
    
      useEffect(() => {
        return () => {
          eventSourceRef.current?.close();
        };
      }, []);

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


    return (
        <div className="bg" style={{
            height: "100vh",
            display: "flex",
            flexFlow: "column",
            }}>
            <div className="bggrid"/>

            <Header isConnected={listening}/>
            
            <div style={{
                flex: 1,
                overflow: "auto",
            }}>
                <Visualiser islands={islands}/>
            </div>

            <ScoreBar left={leftPoints} right={rightPoints}/>
        </div>
    )
};