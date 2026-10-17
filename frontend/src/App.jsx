import {
    BrowserRouter as Router,
    Routes,
    Route,
} from "react-router-dom";

import Viewer from "./Viewer.jsx"
import Admin from "./Admin.jsx"
import Webhook from "./Webhook.jsx"



export default function App() {
  return (
    <Router>
        <Routes>
            <Route exact path="/" element={<Viewer />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/test" element={<Webhook />} />
        </Routes>
    </Router>
  );
};