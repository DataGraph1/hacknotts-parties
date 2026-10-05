import {
    BrowserRouter as Router,
    Routes,
    Route,
} from "react-router-dom";

import Frontend from "./Viewer.jsx"
import Admin from "./Admin.jsx"
import TestPage from "./test.jsx"



export default function App() {
  return (
    <Router>
        <Routes>
            <Route exact path="/" element={<Frontend />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/test" element={<TestPage />} />
        </Routes>
    </Router>
  );
};