import './ScoreEntry.css';
import { useState } from "react";


export default function ScoreEntry() {
    const [callbackMsg, setCallbackMsg] = useState("");
    
    function httpGetAsyncKey(apiKey, theUrl, callback) {
        var xmlHttp = new XMLHttpRequest();
        
        xmlHttp.onreadystatechange = function() { 
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
                callback(xmlHttp.responseText);
        }

        xmlHttp.open("GET", theUrl, true);
        xmlHttp.setRequestHeader("X-API-Key", apiKey);
        xmlHttp.send(null);
    }

    function handleSubmit(e) {
        e.preventDefault(); // Prevent the browser from reloading the page

        const form = e.target;
        const formData = new FormData(form);
        const formJson = Object.fromEntries(formData.entries());

        const apiKey = formJson.apiKey
        const amount = formJson.amount
        const name = e.nativeEvent.submitter.value
        
        console.log(amount, name);
        httpGetAsyncKey(
            apiKey,
            `http://localhost:8000/add_points?name=${name}&value=${amount}`,
            handlePointCallback
        );
    }

    function handlePointCallback(msg) {
        console.log("Response: ", msg);
        setCallbackMsg(msg);
    }

    
    return (
        <div style={{
            padding: 50,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            height: "100",
            justifyContent: "space-between",
        }}>
            <span/>
            
            <form method="post" onSubmit={handleSubmit}>
                <div style={{
                    padding: "20px"
                }}>
                    <label>
                        API Key: <input name="apiKey" />
                    </label>
                </div>
                
                <div style={{
                    padding: "20px"    
                }}>
                        <label>
                            Score amount <input min="1" max="100" type="number" name="amount" />
                        </label>
                </div>

                <span>
                    <div style={{
                        display: "flex",
                        flexDirection: "row",
                        flex: 1,
                        justifyContent: "space-between",
                    }}>
                        <span/>
                        
                        <button type="submit" value="PS2"
                            style={{
                            backgroundColor: '#2860a9',
                        }}>
                            PS2
                        </button>

                        <button type="submit" value="Xbox"
                            style={{
                            backgroundColor: '#28a94f',
                        }}>
                            Xbox
                            </button>
                        
                        <span/>
                    </div>
                </span>

                <span>
                    <p>{callbackMsg}</p>
                </span>
            </form>

            <span/>
        </div>
    )
}