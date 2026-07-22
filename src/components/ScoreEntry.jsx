import './ScoreEntry.css';


export default function ScoreEntry() {
    function handleSubmit(e) {
        // Prevent the browser from reloading the page
        e.preventDefault();

        // Read the form data
        const form = e.target;
        const formData = new FormData(form);

        // You can pass formData as a fetch body directly:
        fetch('/some-api', { method: form.method, body: formData });

        // Or you can work with it as a plain object:
        const formJson = Object.fromEntries(formData.entries());
        console.log(formJson);
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
            
            <span>
                <form method="post" onSubmit={handleSubmit}>
                    <label>
                        Score amount <input name="myInput" />
                    </label>
                </form>
            </span>

            <span>
                <div style={{
                    display: "flex",
                    flexDirection: "row",
                    flex: 1,
                    justifyContent: "space-between",
                }}>
                    <span/>
                    <button>PS3</button>
                    <button>XBox360</button>
                    <span/>
                </div>
            </span>

            <span/>
        </div>
    )
}