import {
    BrowserRouter as Router,
    Routes,
    Route,
} from "react-router-dom";

import Frontend from "./Frontend.jsx"
import Backend from "./Backend.jsx"
import TestPage from "./test.jsx"



export default function App() {
  return (
    <Router>
        <Routes>
            <Route exact path="/" element={<Frontend />} />
            <Route path="/backend" element={<Backend />} />
            <Route path="/test" element={<TestPage />} />
        </Routes>
    </Router>
  );
};