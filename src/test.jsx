export default function TestPage() {
  return(
    <div style={{
      display: "flex",
      flexFlow: "column",
      height: "100vh",
    }}>
      <h1 style={{
        padding: 25
      }}>test page</h1>

      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100",
        flex: 1,
      }}>
        <span/>
        <span>Span 1</span>
        <span>Span 2</span>
        <span>Span 3</span>
        <span/>
      </div>
    </div>
  )
}