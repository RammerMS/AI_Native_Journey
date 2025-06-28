import tkinter as tk
from PIL import Image, ImageTk # Import Image and ImageTk from Pillow

class ImageButtonApp:
    def __init__(self, master):
        self.master = master
        master.title("Image Button Example")
        master.geometry("400x300") # Set initial window size

        self.tooltip_window = None # To hold the tooltip Toplevel window

        # 1. Load the image
        # It's good practice to try-except for file loading
        try:
            # Open the image using Pillow
            original_image = Image.open("HelloWorld1.jpg")
            # Resize the image if needed (optional)
            # For example, to fit a 150x100 button
            resized_image = original_image.resize((150, 100), Image.Resampling.LANCZOS)
            # Convert the Pillow image to a Tkinter PhotoImage
            self.button_image = ImageTk.PhotoImage(resized_image)
        except FileNotFoundError:
            print("Error: HelloWorld1.jpg not found. Make sure it's in the same directory.")
            # Create a dummy image or handle the error gracefully
            self.button_image = None
            # You might want to exit or show a message box here
            return
        except Exception as e:
            print(f"An error occurred loading the image: {e}")
            self.button_image = None
            return

        # 2. Create the button
        if self.button_image: # Only create button if image loaded successfully
            self.hw_button = tk.Button(
                master,
                image=self.button_image,
                command=self.on_button_click, # What happens when clicked
                borderwidth=0, # Remove default button border
                highlightthickness=0 # Remove focus highlight border
            )
            self.hw_button.pack(pady=50) # Pack the button into the window

            # 3. Bind events for hover (tooltip)
            self.hw_button.bind("<Enter>", self.on_enter) # Mouse enters the button
            self.hw_button.bind("<Leave>", self.on_leave) # Mouse leaves the button
        else:
            # If image loading failed, create a text button instead
            self.hw_button = tk.Button(master, text="Image Not Found - Click Me!", command=self.on_button_click)
            self.hw_button.pack(pady=50)
            print("Using a text button instead of image due to load error.")


    def on_button_click(self):
        """Function called when the button is clicked."""
        print("HWbutton1 was clicked!")
        # You can add more functionality here, like opening a new window, etc.

    def on_enter(self, event=None):
        """Shows the tooltip when the mouse enters the button."""
        if self.tooltip_window: # Destroy any existing tooltip first
            self.tooltip_window.destroy()

        # Create a new top-level window for the tooltip
        self.tooltip_window = tk.Toplevel(self.master)
        self.tooltip_window.wm_overrideredirect(True) # Remove window decorations (title bar, borders)
        self.tooltip_window.wm_geometry(f"+{event.x_root+10}+{event.y_root+10}") # Position near cursor

        label = tk.Label(
            self.tooltip_window,
            text="Would you like to know what '#' means?",
            background="lightyellow",
            relief="solid",
            borderwidth=1,
            font=("Arial", 9)
        )
        label.pack(padx=5, pady=5)

    def on_leave(self, event=None):
        """Hides the tooltip when the mouse leaves the button."""
        if self.tooltip_window:
            self.tooltip_window.destroy()
            self.tooltip_window = None # Clear the reference

# Main part of the script
if __name__ == "__main__":
    root = tk.Tk()
    app = ImageButtonApp(root)
    root.mainloop()