import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./routes/Login";
import CadastroRecemNascido from "./routes/CadastroRecemNascido";
import Acompanhamento from "./routes/Acompanhamento";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/cadastro" element={<CadastroRecemNascido />} />
      <Route path="/acompanhamento" element={<Acompanhamento />} />
    </Routes>
  </BrowserRouter>
);
