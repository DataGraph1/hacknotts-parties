import './ScoreBar.css'


export default function ScoreBar({
  left,
  right,
}) {
  const teamLeft = {
    "name": "PS2",
    "colour": "#2860a9",
    "points": left,
  }
  const teamRight = {
    "name": "Xbox",
    "colour": "#28a94f",
    "points": right,
  }

  const total = teamLeft.points + teamRight.points;
  const percent = total === 0 ? 50 : ((teamLeft.points / total) * 100).toFixed(1);
  
  return (
    // colour background
    <div style={{
        padding: 20,
        boxSizing: "border-box",
      }}>
      <div style={{
        width: "100%",
        height: 75,
        boxSizing: "border-box",

        border: "0.75rem solid black",
        borderRadius: "10px",

        overflow: "hidden",
        background: `linear-gradient(
          to right,
          ${teamLeft.colour} 0%,
          ${teamLeft.colour} ${percent}%,
          ${teamRight.colour} ${percent}%,
          ${teamRight.colour} 100%
        )`,
      }}
      
    >
      {/* shader over lay */}
      <div className="aqua" style={{
        display: "grid",
        gridTemplateColumns: "auto auto",
        padding: 3,
      }}>
        {/* left team text */}
        <div style={{
          textAlign: "left",
          display: "grid",
          gridTemplateColumns: "auto",
          margin: 3,
        }}>
          <div><p className='bold_text'>{teamLeft.points}p</p></div>
          <div><b><p>{percent}%</p></b></div>
        </div>
        
        {/* right team text */}
        <div style={{
          textAlign: "right",
          display: "grid",
          gridTemplateColumns: "auto",
          margin: 3,
        }}>
          <div><p className='bold_text'>{teamRight.points}p</p></div>
          <div><p>{(100-percent).toFixed(1)}%</p></div>
        </div>
      </div> 
    </div>
    </div>
  );
}