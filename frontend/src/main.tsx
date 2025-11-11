import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import Login from "./routes/Login";
import Acompanhamento from "./routes/Acompanhamento";
import Dashboard from "./routes/Dashboard";
import Criancas from "./routes/Criancas";
import CriancaForm from "./routes/CriancaForm";
import CriancaDetalhes from "./routes/CriancaDetalhes";
import Pacientes from "./routes/Pacientes";
import Alimentos from "./routes/Alimentos";
import AlimentoForm from "./routes/AlimentoForm";
import Profissionais from "./routes/Profissionais";
import ProfissionalForm from "./routes/ProfissionalForm";
import DietaForm from "./routes/DietaForm";
import ConsultaForm from "./routes/ConsultaForm";
import GruposSaude from "./routes/GruposSaude";
import UnidadesSaude from "./routes/UnidadesSaude";
import { AuthProvider } from "./contexts/AuthContext";
import RequireAuth from "./components/RequireAuth";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Layout>
                <Dashboard />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/criancas"
          element={
            <RequireAuth>
              <Layout>
                <Criancas />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/criancas/novo"
          element={
            <RequireAuth>
              <Layout>
                <CriancaForm />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/criancas/:id"
          element={
            <RequireAuth>
              <Layout>
                <CriancaForm />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/criancas/editar/:id"
          element={
            <RequireAuth>
              <Layout>
                <CriancaForm />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/criancas/detalhes/:id"
          element={
            <RequireAuth>
              <Layout>
                <CriancaDetalhes />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/pacientes"
          element={
            <RequireAuth>
              <Layout>
                <Pacientes />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/criancas/:criancaId/dieta/nova"
          element={
            <RequireAuth>
              <Layout>
                <DietaForm />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/criancas/:criancaId/dieta/:dietaId"
          element={
            <RequireAuth>
              <Layout>
                <DietaForm />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/criancas/:criancaId/consulta/nova"
          element={
            <RequireAuth>
              <Layout>
                <ConsultaForm />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/criancas/:criancaId/consulta/:consultaId"
          element={
            <RequireAuth>
              <Layout>
                <ConsultaForm />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/alimentos"
          element={
            <RequireAuth>
              <Layout>
                <Alimentos />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/alimentos/novo"
          element={
            <RequireAuth>
              <Layout>
                <AlimentoForm />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/alimentos/:id"
          element={
            <RequireAuth>
              <Layout>
                <AlimentoForm />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/profissionais"
          element={
            <RequireAuth>
              <Layout>
                <Profissionais />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/profissionais/novo"
          element={
            <RequireAuth>
              <Layout>
                <ProfissionalForm />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/profissionais/:id"
          element={
            <RequireAuth>
              <Layout>
                <ProfissionalForm />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/unidades"
          element={
            <RequireAuth>
              <Layout>
                <UnidadesSaude />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/grupos-saude"
          element={
            <RequireAuth>
              <Layout>
                <GruposSaude />
              </Layout>
            </RequireAuth>
          }
        />
        <Route
          path="/acompanhamento"
          element={
            <RequireAuth>
              <Layout>
                <Acompanhamento />
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
          color: "#fff",
          borderRadius: "8px",
          padding: "12px 16px",
          fontSize: "14px",
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: "#10b981",
            secondary: "#fff",
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
        },
      }}
      />
    </BrowserRouter>
  </AuthProvider>
);
