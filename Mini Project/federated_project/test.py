import tkinter as tk
from tkinter.scrolledtext import ScrolledText
import subprocess
import threading
import sys

# function to run a python file and capture output
def run_script(script_name):
    output_box.delete(1.0, tk.END)
    output_box.insert(tk.END, f"Running {script_name}...\n\n")

    def execute():
        process = subprocess.Popen(
            [sys.executable, script_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )

        for line in process.stdout:
            output_box.insert(tk.END, line)
            output_box.see(tk.END)

        process.wait()
        output_box.insert(tk.END, "\nFinished.\n")

    threading.Thread(target=execute).start()


# main window
root = tk.Tk()
root.title("LoRA Model Output Dashboard")
root.geometry("800x500")

# button frame
button_frame = tk.Frame(root)
button_frame.pack(pady=10)

# buttons
btn_a = tk.Button(button_frame, text="Client A Output", width=20,
                  command=lambda: run_script("test_loraA.py"))
btn_a.grid(row=0, column=0, padx=5)

btn_b = tk.Button(button_frame, text="Client B Output", width=20,
                  command=lambda: run_script("test_loraB.py"))
btn_b.grid(row=0, column=1, padx=5)

btn_global = tk.Button(button_frame, text="Global Output", width=20,
                       command=lambda: run_script("test_lora.py"))
btn_global.grid(row=0, column=2, padx=5)

btn_base = tk.Button(button_frame, text="Model Only Output", width=20,
                     command=lambda: run_script("base_test.py"))
btn_base.grid(row=0, column=3, padx=5)

# output text field
output_box = ScrolledText(root, wrap=tk.WORD, width=100, height=25)
output_box.pack(padx=10, pady=10)

root.mainloop()