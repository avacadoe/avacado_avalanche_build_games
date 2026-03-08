import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";
import { Analytics } from "@vercel/analytics/react";
import { Bounce, ToastContainer } from "react-toastify";
import { AppKitProvider } from "./AppKitProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <AppKitProvider>
    <App />
    <ToastContainer
      position="bottom-right"
      autoClose={5000}
      hideProgressBar
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover={false}
      theme="light"
      transition={Bounce}
      toastClassName={"font-mono border-cyber-green/60"}
      style={{ bottom: "5.5rem", zIndex: 9000 }}
    />
    <Analytics />
  </AppKitProvider>
);
