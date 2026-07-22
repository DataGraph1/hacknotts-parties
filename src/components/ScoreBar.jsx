import './ScoreBar.css'


export default function ScoreBar({
  left,
  right,
}) {
  const teamLeft = {
    "name": "PS3",
    "colour": "#2860a9",
    "points": left,
  }
  const teamRight = {
    "name": "Xbox 360",
    "colour": "#28a94f",
    "points": right,
  }

  const total = teamLeft.points + teamRight.points;
  const percent = total === 0 ? 50 : ((teamLeft.points / total) * 100).toFixed(1);

  return (
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
      <div className="aqua" style={{
        display: "grid",
        gridTemplateColumns: "auto auto",
      }}>
        <div style={{
          textAlign: "left",
          display: "grid",
          gridTemplateColumns: "auto",
        }}>
          <div><b><p>{percent}%</p></b></div>
          <div><p className='small_text'>{teamLeft.points}p</p></div>
        </div>

        <div style={{
          textAlign: "right",
          display: "grid",
          gridTemplateColumns: "auto",
        }}>
          <div><p>{100-percent}%</p></div>
          <div><p>{teamRight.points}p</p></div>
        </div>
      </div> 
    </div>
    </div>
    
  );
}