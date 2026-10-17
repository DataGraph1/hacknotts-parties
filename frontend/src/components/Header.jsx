export default function Header({isConnected = false}) {
    return (
        <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "30px",
        }} >
            <div style={{
                width: "25%",
            }}>
                <h2>timer</h2>
            </div>
            <div>
                <h1>HackNotts 26 Parties</h1>
            </div>
            <div style={{
                width: "25%",
            }}>
                <h2 style={{
                    color: isConnected ? "Green" : "Red",
                }}>
                    {isConnected ? "Connected" : "Disconnected"}
                </h2>
            </div>
        </div>
    )
}