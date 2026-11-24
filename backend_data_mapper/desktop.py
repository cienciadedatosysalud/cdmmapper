import subprocess
import sys
import threading
import time
import webbrowser
import uvicorn
from main import app

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")

if __name__ == "__main__":
    # Iniciar FastAPI en segundo plano
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(1.5)

    url = "http://127.0.0.1:8000"

    # Abrir en modo app según el Sistema Operativo
    try:
        if sys.platform.startswith('win'):
            # En Windows (abre Microsoft Edge o Chrome en modo app)
            subprocess.Popen(['start', 'msedge', f'--app={url}'], shell=True)
        elif sys.platform.startswith('darwin'):
            # En macOS (abre Google Chrome en modo app)
            subprocess.Popen(['open', '-na', 'Google Chrome', '--args', f'--app={url}'])
        elif sys.platform.startswith('linux'):
            # En Linux (abre Google Chrome / Chromium en modo app)
            subprocess.Popen(['google-chrome', f'--app={url}'])
        else:
            # Respaldo si no reconoce el sistema
            webbrowser.open(url)
    except Exception:
        # Si falla el modo app por no tener Chrome/Edge, abre el navegador por defecto
        webbrowser.open(url)

    # Mantener la aplicación ejecutándose
    try:
        while server_thread.is_alive():
            server_thread.join(1)
    except KeyboardInterrupt:
        pass